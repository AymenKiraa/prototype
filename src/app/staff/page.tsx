import { requireStaffSession } from "@/lib/auth/guards";
import { getTenantPrismaClient } from "@/lib/db/tenant-client";

export default async function StaffDashboard() {
  const session = await requireStaffSession();
  const db = getTenantPrismaClient(session.user.tenantId!);

  const [pitchCount, upcomingBookings] = await Promise.all([
    db.pitch.count(),
    db.booking.count({
      where: { status: { in: ["pending", "confirmed"] }, startTime: { gte: new Date() } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl py-16">
      <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
      <p className="text-sm text-zinc-500">Role: {session.user.role}</p>
      <dl className="mt-8 grid grid-cols-2 gap-4">
        <div className="rounded border p-4">
          <dt className="text-sm text-zinc-500">Pitches</dt>
          <dd className="text-2xl font-semibold">{pitchCount}</dd>
        </div>
        <div className="rounded border p-4">
          <dt className="text-sm text-zinc-500">Upcoming bookings</dt>
          <dd className="text-2xl font-semibold">{upcomingBookings}</dd>
        </div>
      </dl>
    </div>
  );
}
