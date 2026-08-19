"use server";

import type { Prisma } from "@prisma/client";
import { requireStaffSession } from "@/lib/auth/guards";
import { getTenantPrismaClient } from "@/lib/db/tenant-client";

export interface LocationStepState {
  error?: string;
  success?: boolean;
}

export async function saveLocationStepAction(
  _prevState: LocationStepState | undefined,
  formData: FormData,
): Promise<LocationStepState> {
  const session = await requireStaffSession();

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!name) {
    return { error: "Location name is required." };
  }

  const db = getTenantPrismaClient(session.user.tenantId!);

  // Idempotent: revisiting this step (browser back button, etc.) updates
  // the one location already created rather than creating a duplicate.
  // `tenantId` is intentionally omitted — getTenantPrismaClient() injects
  // it at runtime (src/lib/db/tenant-client.ts). The cast below is only to
  // satisfy Prisma's generated types, which don't know about that
  // injection and otherwise require the field.
  const data: Omit<Prisma.LocationUncheckedCreateInput, "tenantId"> = { name, city, address };

  const existing = await db.location.findFirst();
  if (existing) {
    await db.location.update({ where: { id: existing.id }, data });
  } else {
    await db.location.create({ data: data as Prisma.LocationUncheckedCreateInput });
  }

  return { success: true };
}
