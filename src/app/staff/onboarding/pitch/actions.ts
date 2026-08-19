"use server";

import type { Prisma } from "@prisma/client";
import { requireStaffSession } from "@/lib/auth/guards";
import { getTenantPrismaClient } from "@/lib/db/tenant-client";

export interface PitchStepState {
  error?: string;
  success?: boolean;
}

export async function savePitchStepAction(
  _prevState: PitchStepState | undefined,
  formData: FormData,
): Promise<PitchStepState> {
  const session = await requireStaffSession();

  const name = String(formData.get("name") ?? "").trim();
  const pitchType = String(formData.get("pitchType") ?? "").trim() || null;
  const basePriceInput = String(formData.get("basePrice") ?? "").trim();
  // Money is stored as Int minor units (schema.prisma convention) — the
  // form takes a decimal amount, e.g. "80.00" -> 8000.
  const basePrice = Math.round(Number.parseFloat(basePriceInput) * 100);

  if (!name) {
    return { error: "Pitch name is required." };
  }
  if (!basePriceInput || Number.isNaN(basePrice) || basePrice <= 0) {
    return { error: "Enter a valid base price." };
  }

  const db = getTenantPrismaClient(session.user.tenantId!);
  const location = await db.location.findFirst();

  // `tenantId` is intentionally omitted — see the matching comment in
  // ../location/actions.ts.
  const data: Omit<Prisma.PitchUncheckedCreateInput, "tenantId"> = {
    name,
    pitchType,
    basePrice,
    locationId: location?.id,
  };

  const existing = await db.pitch.findFirst();
  if (existing) {
    await db.pitch.update({ where: { id: existing.id }, data });
  } else {
    await db.pitch.create({ data: data as Prisma.PitchUncheckedCreateInput });
  }

  return { success: true };
}
