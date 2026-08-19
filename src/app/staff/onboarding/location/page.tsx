import { requireStaffSession } from "@/lib/auth/guards";
import { getTenantPrismaClient } from "@/lib/db/tenant-client";
import { OnboardingSteps } from "../steps";
import { LocationStepForm } from "./location-form";

export default async function OnboardingLocationStep() {
  const session = await requireStaffSession();
  const db = getTenantPrismaClient(session.user.tenantId!);
  const location = await db.location.findFirst();

  return (
    <div className="mx-auto max-w-xl py-16">
      <OnboardingSteps current={2} />
      <h1 className="mb-6 text-2xl font-semibold">Where do you operate?</h1>
      <LocationStepForm
        defaultValues={{
          name: location?.name ?? "",
          city: location?.city ?? "",
          address: location?.address ?? "",
        }}
      />
    </div>
  );
}
