import { redirect } from "next/navigation";
import { auth as staffAuth } from "@/lib/auth/staff";
import { auth as customerAuth } from "@/lib/auth/customer";
import { auth as platformAdminAuth } from "@/lib/auth/platform-admin";
import { getRequestTenantId } from "@/lib/tenant/current";

/**
 * Server-side guard for tenant staff routes/actions — the "Authorization"
 * layer of docs/01-architecture.md §3. Re-derives tenantId from the
 * authenticated session, then cross-checks it against the tenant
 * middleware resolved for THIS request. A staff JWT for tenant A used
 * against tenant B's subdomain is rejected here even though the two
 * should never diverge under normal operation (IDOR protection,
 * requirement #26).
 */
export async function requireStaffSession() {
  const session = await staffAuth();
  if (!session?.user?.tenantId) redirect("/staff/login");

  const requestTenantId = await getRequestTenantId();
  if (requestTenantId && requestTenantId !== session.user.tenantId) {
    redirect("/staff/login");
  }

  return session;
}

export async function requireCustomerSession() {
  const session = await customerAuth();
  if (!session?.user?.tenantId) redirect("/login");
  return session;
}

export async function requirePlatformAdminSession() {
  const session = await platformAdminAuth();
  if (!session?.user?.id) redirect("/platform-admin/login");
  return session;
}
