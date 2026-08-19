import Link from "next/link";
import { requirePlatformAdminSession } from "@/lib/auth/guards";
import { platformPrisma } from "@/lib/db/platform-client";

export default async function PlatformAdminDashboard() {
  const session = await requirePlatformAdminSession();
  const tenants = await platformPrisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto max-w-3xl py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Super Admin — {session.user.name}</h1>
        <Link
          href="/platform-admin/tenants/new"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          New tenant
        </Link>
      </div>
      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr>
            <th className="pb-2">Slug</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Owner</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="border-t">
              <td className="py-2">{tenant.slug}</td>
              <td className="py-2">{tenant.status}</td>
              <td className="py-2">{tenant.ownerEmail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
