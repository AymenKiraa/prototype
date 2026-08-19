import Link from "next/link";
import { getRequestTenantId } from "@/lib/tenant/current";
import { getTenantPrismaClient } from "@/lib/db/tenant-client";

/**
 * Public tenant homepage — demonstrates the full Phase 3 pipeline:
 * middleware resolves the tenant (src/middleware.ts) -> x-tenant-id header
 * -> tenant-scoped Prisma client (RLS-protected read).
 */
export default async function TenantHome() {
  const tenantId = await getRequestTenantId();

  // Middleware guarantees this on every route it matches; defensive only.
  if (!tenantId) {
    return <TenantShell title="Tenant not resolved" />;
  }

  const db = getTenantPrismaClient(tenantId);
  const branding = await db.tenantBranding.findUnique({ where: { tenantId } });

  return (
    <TenantShell title={branding?.businessName ?? "Welcome"}>
      <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {branding?.description ?? "This tenant hasn't set up their branding yet."}
      </p>
      <div className="flex gap-4 text-sm font-medium">
        <Link className="underline" href="/login">
          Customer sign in
        </Link>
        <Link className="underline" href="/staff/login">
          Staff sign in
        </Link>
      </div>
    </TenantShell>
  );
}

function TenantShell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-6 py-32 px-16 bg-white dark:bg-black text-center">
        <h1 className="max-w-xl text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
