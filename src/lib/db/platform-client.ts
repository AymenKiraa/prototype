import { PrismaClient } from "@prisma/client";

/**
 * Connects as the `platform_service` DB role, which has BYPASSRLS (see
 * prisma/manual-sql/rls.sql). This client can read/write across every
 * tenant and must only be used by:
 *
 *   - Super Admin code paths (admin.pitchbook.com) — platform stats,
 *     tenant management, impersonation.
 *   - Tenant-resolution in middleware — the one legitimate case where we
 *     need to look up a tenant *before* we know which tenant we're in
 *     (resolving a hostname/slug to a tenantId), so RLS scoping doesn't
 *     apply yet.
 *
 * Never import this from tenant-facing app code, staff/customer auth, or
 * any route serving booking data.
 */
declare global {
  var __platformPrisma: PrismaClient | undefined;
}

export const platformPrisma =
  globalThis.__platformPrisma ??
  new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_PLATFORM } },
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__platformPrisma = platformPrisma;
}
