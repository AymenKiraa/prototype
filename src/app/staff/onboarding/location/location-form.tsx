"use client";

import { useActionState, useEffect } from "react";
import { saveLocationStepAction } from "./actions";

export function LocationStepForm({
  defaultValues,
}: {
  defaultValues: { name: string; city: string; address: string };
}) {
  const [state, formAction, pending] = useActionState(saveLocationStepAction, undefined);

  useEffect(() => {
    if (state?.success) {
      window.location.href = "/staff/onboarding/pitch";
    }
  }, [state?.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Location name
        <input
          name="name"
          defaultValue={defaultValues.name}
          required
          placeholder="Main Location"
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        City
        <input name="city" defaultValue={defaultValues.city} className="rounded border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Address
        <input name="address" defaultValue={defaultValues.address} className="rounded border px-3 py-2" />
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
