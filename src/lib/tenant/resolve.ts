import { platformPrisma } from "@/lib/db/platform-client";

export interface TenantResolution {
  tenantId: string;
  slug: string;
}

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "pitchbook.com";

// Tiny in-process cache so a burst of requests for the same host doesn't
// each round-trip to Postgres. Production would want a shared cache
// (Redis / edge KV) since this is per-instance and not invalidated on
// tenant suspension — acceptable for MVP, not for the suspend-tenant flow
// to be instant.
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: TenantResolution | null; expiresAt: number }>();

function getCached(key: string): TenantResolution | null | undefined {
  const hit = cache.get(key);
  if (!hit || hit.expiresAt < Date.now()) return undefined;
  return hit.value;
}

function setCached(key: string, value: TenantResolution | null) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Resolves a request to a tenant, in priority order (see
 * docs/01-architecture.md §2):
 *
 *   1. Custom domain lookup (`domains` table)
 *   2. Subdomain lookup (`{slug}.pitchbook.com`)
 *   3. Path fallback (`pitchbook.com/{slug}/...`)
 *
 * Uses `platformPrisma` (BYPASSRLS) deliberately: we don't yet know the
 * tenant, so there is no `app.current_tenant_id` to scope an RLS-protected
 * query with. This is the one place outside Super Admin code that's
 * allowed to do that — see platform-client.ts.
 */
export async function resolveTenant(hostname: string, pathname: string): Promise<TenantResolution | null> {
  const cacheKey = `${hostname}:${pathname.split("/")[1] ?? ""}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  const resolved = await resolveTenantUncached(hostname, pathname);
  setCached(cacheKey, resolved);
  return resolved;
}

async function resolveTenantUncached(hostname: string, pathname: string): Promise<TenantResolution | null> {
  const domain = await platformPrisma.domain.findUnique({
    where: { hostname },
    select: { tenantId: true, tenant: { select: { slug: true } } },
  });
  if (domain) {
    return { tenantId: domain.tenantId, slug: domain.tenant.slug };
  }

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -(ROOT_DOMAIN.length + 1));
    if (slug && slug !== "www") {
      const tenant = await platformPrisma.tenant.findUnique({
        where: { slug },
        select: { id: true, slug: true },
      });
      if (tenant) return { tenantId: tenant.id, slug: tenant.slug };
    }
    // hostname is the bare root domain (or www) — only the path fallback applies.
  }

  const [, maybeSlug] = pathname.split("/");
  if (maybeSlug) {
    const tenant = await platformPrisma.tenant.findUnique({
      where: { slug: maybeSlug },
      select: { id: true, slug: true },
    });
    if (tenant) return { tenantId: tenant.id, slug: tenant.slug };
  }

  return null;
}
