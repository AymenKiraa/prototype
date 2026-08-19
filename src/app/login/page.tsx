import { getRequestTenantId } from "@/lib/tenant/current";
import { CustomerLoginForm } from "./login-form";

export default async function CustomerLoginPage() {
  const tenantId = await getRequestTenantId();

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <CustomerLoginForm tenantId={tenantId ?? ""} />
    </div>
  );
}
