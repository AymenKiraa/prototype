import { PrismaClient } from "@prisma/client";

/**
 * The unscoped Prisma client, connected as the `app_user` DB role (no
 * BYPASSRLS — see prisma/manual-sql/rls.sql). It has no
 * `app.current_tenant_id` session variable set, so RLS hides every row of
 * every tenant-scoped table from it by default.
 *
 * Do not import this directly from application code. Tenant-facing code
 * must go through `getTenantPrismaClient()` in ./tenant-client, which sets
 * the session variable before every query. This file exists only so that
 * tenant-client.ts (and platform-admin auth, which reads the
 * non-tenant-scoped `platform_admins` table) have a connection to extend.
 */
declare global {
  var __rawPrisma: PrismaClient | undefined;
}

export const rawPrisma =
  globalThis.__rawPrisma ??
  new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__rawPrisma = rawPrisma;
}
