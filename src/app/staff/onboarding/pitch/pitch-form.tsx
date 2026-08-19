"use client";

import { useActionState, useEffect } from "react";
import { savePitchStepAction } from "./actions";

export function PitchStepForm({
  defaultValues,
}: {
  defaultValues: { name: string; pitchType: string; basePrice: string };
}) {
  const [state, formAction, pending] = useActionState(savePitchStepAction, undefined);

  useEffect(() => {
    if (state?.success) {
      window.location.href = "/staff";
    }
  }, [state?.success]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Pitch name
        <input
          name="name"
          defaultValue={defaultValues.name}
          required
          placeholder="Pitch 1"
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Type
        <input
          name="pitchType"
          defaultValue={defaultValues.pitchType}
          placeholder="5v5"
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Base price (per booking)
        <input
          name="basePrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultValues.basePrice}
          required
          className="rounded border px-3 py-2"
        />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Finish setup"}
      </button>
    </form>
  );
}
