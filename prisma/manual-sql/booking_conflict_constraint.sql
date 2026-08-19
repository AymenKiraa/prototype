-- =========================================================================
-- Booking conflict prevention — the real guarantee, enforced by Postgres
-- itself, not application logic. See docs/01-architecture.md §6.
--
-- Two bookings for the SAME pitch with OVERLAPPING time ranges are
-- rejected at INSERT/UPDATE time, regardless of concurrency. This closes
-- the classic "check availability, then insert" race condition that no
-- amount of app-layer locking can fully close without SELECT ... FOR UPDATE
-- discipline everywhere it's needed — the DB constraint doesn't depend on
-- every code path getting that right.
--
-- Requires btree_gist (enabled via the `extensions` list in schema.prisma).
-- Run after `prisma migrate dev` creates the bookings table, since Prisma
-- cannot express EXCLUDE USING gist natively.
--
-- Column names are quoted camelCase — Prisma's default column naming
-- (schema.prisma only @@map()s table names, not fields).
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    "pitchId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'no_show'));

-- Sanity check query (run manually to confirm the constraint is live):
--
-- BEGIN;
--   INSERT INTO bookings (id, "tenantId", "pitchId", "customerId", "bookingCode",
--     "startTime", "endTime", status, "priceAmount", currency, "createdAt", "updatedAt")
--   VALUES ('11111111-1111-1111-1111-111111111111', :tenant, :pitch, :customer,
--     'TEST-1', '2026-08-22 10:00+00', '2026-08-22 11:00+00', 'confirmed', 4000, 'TND', now(), now());
--
--   -- This second insert for an overlapping range on the same pitch MUST fail:
--   INSERT INTO bookings (id, "tenantId", "pitchId", "customerId", "bookingCode",
--     "startTime", "endTime", status, "priceAmount", currency, "createdAt", "updatedAt")
--   VALUES ('22222222-2222-2222-2222-222222222222', :tenant, :pitch, :customer,
--     'TEST-2', '2026-08-22 10:30+00', '2026-08-22 11:30+00', 'confirmed', 4000, 'TND', now(), now());
--   -- ERROR: conflicting key value violates exclusion constraint "no_overlapping_bookings"
-- ROLLBACK;
