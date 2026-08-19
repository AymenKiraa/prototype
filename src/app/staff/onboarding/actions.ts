"use server";

import { requireStaffSession } from "@/lib/auth/guards";
import { getTenantPrismaClient } from "@/lib/db/tenant-client";

export interface BrandingStepState {
  error?: string;
  success?: boolean;
}

export async function saveBrandingStepAction(
  _prevState: BrandingStepState | undefined,
  formData: FormData,
): Promise<BrandingStepState> {
  const session = await requireStaffSession();

  const businessName = String(formData.get("businessName") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!businessName) {
    return { error: "Business name is required." };
  }

  const db = getTenantPrismaClient(session.user.tenantId!);
  await db.tenantBranding.update({
    where: { tenantId: session.user.tenantId! },
    data: { businessName, description },
  });

  return { success: true };
}
