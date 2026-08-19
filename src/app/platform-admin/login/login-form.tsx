"use client";

import { useActionState, useEffect } from "react";
import { platformAdminLoginAction } from "./actions";

export function PlatformAdminLoginForm() {
  const [state, formAction, pending] = useActionState(platformAdminLoginAction, undefined);

  useEffect(() => {
    if (state?.success) {
      window.location.href = "/platform-admin";
    }
  }, [state?.success]);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold">Super Admin sign in</h1>
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className="rounded border px-3 py-2"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        required
        className="rounded border px-3 py-2"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
