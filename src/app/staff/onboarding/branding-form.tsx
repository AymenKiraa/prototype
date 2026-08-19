"use client";

import { useActionState, useEffect } from "react";
import { saveBrandingStepAction } from "./actions";

export function BrandingStepForm({
  defaultValues,
}: {
  defaultValues: { businessName: string; description: string };
}) {
  const [state, formAction, pending] = useActionState(saveBrandingStepAction, undefined);

  useEffect(() => {
    if (state?.success) {
      window.location.href = "/staff/onboarding/location";
    }
  }, [state?.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Business name
        <input
          name="businessName"
          defaultValue={defaultValues.businessName}
          required
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          name="description"
          defaultValue={defaultValues.description}
          rows={3}
          className="rounded border px-3 py-2"
        />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
