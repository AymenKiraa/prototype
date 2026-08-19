import { redirect } from "next/navigation";
import { requireStaffSession } from "@/lib/auth/guards";
import { getTenantPrismaClient } from "@/lib/db/tenant-client";

export default async function StaffDashboard() {
  const session = await requireStaffSession();
  const db = getTenantPrismaClient(session.user.tenantId!);

  const [pitchCount, locationCount, upcomingBookings] = await Promise.all([
    db.pitch.count(),
    db.location.count(),
    db.booking.count({
      where: { status: { in: ["pending", "confirmed"] }, startTime: { gte: new Date() } },
    }),
  ]);

  // No location yet means the business setup wizard was never completed —
  // send staff there instead of an empty dashboard. This is a plain
  // Server Component redirect (computed while handling the original
  // request, not after a client-triggered Server Action), so it isn't
  // subject to the wrong-host issue documented in staff/login/actions.ts.
  if (locationCount === 0) {
    redirect("/staff/onboarding");
  }

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
