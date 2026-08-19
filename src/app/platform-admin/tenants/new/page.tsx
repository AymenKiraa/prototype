import { requirePlatformAdminSession } from "@/lib/auth/guards";
import { NewTenantForm } from "./new-tenant-form";

export default async function NewTenantPage() {
  await requirePlatformAdminSession();

  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="mb-8 text-2xl font-semibold">Create tenant</h1>
      <NewTenantForm />
    </div>
  );
}
