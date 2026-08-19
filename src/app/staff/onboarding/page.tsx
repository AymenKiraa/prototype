import { requireStaffSession } from "@/lib/auth/guards";
import { getTenantPrismaClient } from "@/lib/db/tenant-client";
import { OnboardingSteps } from "./steps";
import { BrandingStepForm } from "./branding-form";

export default async function OnboardingBrandingStep() {
  const session = await requireStaffSession();
  const db = getTenantPrismaClient(session.user.tenantId!);
  const branding = await db.tenantBranding.findUnique({ where: { tenantId: session.user.tenantId! } });

  return (
    <div className="mx-auto max-w-xl py-16">
      <OnboardingSteps current={1} />
      <h1 className="mb-6 text-2xl font-semibold">Tell customers about your business</h1>
      <BrandingStepForm
        defaultValues={{
          businessName: branding?.businessName ?? "",
          description: branding?.description ?? "",
        }}
      />
    </div>
  );
}
