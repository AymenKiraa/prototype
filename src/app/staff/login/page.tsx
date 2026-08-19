import { getRequestTenantId } from "@/lib/tenant/current";
import { StaffLoginForm } from "./login-form";

export default async function StaffLoginPage() {
  const tenantId = await getRequestTenantId();

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <StaffLoginForm tenantId={tenantId ?? ""} />
    </div>
  );
}
