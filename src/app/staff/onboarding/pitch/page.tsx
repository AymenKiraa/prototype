import { requireStaffSession } from "@/lib/auth/guards";
import { getTenantPrismaClient } from "@/lib/db/tenant-client";
import { OnboardingSteps } from "../steps";
import { PitchStepForm } from "./pitch-form";

export default async function OnboardingPitchStep() {
  const session = await requireStaffSession();
  const db = getTenantPrismaClient(session.user.tenantId!);
  const pitch = await db.pitch.findFirst();

  return (
    <div className="mx-auto max-w-xl py-16">
      <OnboardingSteps current={3} />
      <h1 className="mb-6 text-2xl font-semibold">Add your first pitch</h1>
      <PitchStepForm
        defaultValues={{
          name: pitch?.name ?? "",
          pitchType: pitch?.pitchType ?? "",
          basePrice: pitch ? (pitch.basePrice / 100).toFixed(2) : "",
        }}
      />
    </div>
  );
}
