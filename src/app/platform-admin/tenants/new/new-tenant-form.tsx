"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createTenantAction } from "./actions";

export function NewTenantForm() {
  const [state, formAction, pending] = useActionState(createTenantAction, undefined);

  if (state?.temporaryPassword) {
    return (
      <div className="flex flex-col gap-4 rounded border border-green-600 p-4">
        <p className="font-medium">Tenant &quot;{state.slug}&quot; created.</p>
        <p className="text-sm">
          Give the owner their login:
          <br />
          Email: <code className="font-mono">{state.ownerEmail}</code>
          <br />
          Temporary password: <code className="font-mono">{state.temporaryPassword}</code>
        </p>
        <p className="text-xs text-zinc-500">This password is shown once and cannot be retrieved again.</p>
        <Link href="/platform-admin" className="text-sm underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Slug (subdomain)
        <input
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="elite-football"
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Business name
        <input name="businessName" required placeholder="Elite Football" className="rounded border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Owner name
        <input name="ownerName" required className="rounded border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Owner email
        <input name="ownerEmail" type="email" required className="rounded border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Phone (optional)
        <input name="phone" className="rounded border px-3 py-2" />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create tenant"}
      </button>
    </form>
  );
}
