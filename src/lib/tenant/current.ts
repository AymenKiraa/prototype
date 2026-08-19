import { headers } from "next/headers";

/**
 * Reads the tenant middleware resolved for this request. Server-side
 * only (next/headers) — there is no client-trusted equivalent, by design
 * (see docs/01-architecture.md §2).
 */
export async function getRequestTenantId(): Promise<string | null> {
  const h = await headers();
  return h.get("x-tenant-id");
}

export async function getRequestTenantSlug(): Promise<string | null> {
  const h = await headers();
  return h.get("x-tenant-slug");
}
