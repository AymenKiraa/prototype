# PitchBook

Multi-tenant football pitch reservation SaaS. See `docs/01-architecture.md` for
the full design (tenant isolation strategy, booking conflict prevention,
pricing engine, audit trail, phased build order).

## Status

- **Phase 1 — Architecture**: done (`docs/01-architecture.md`).
- **Phase 2 — Database schema**: done (`prisma/schema.prisma`, `prisma/manual-sql/`).
- **Phase 3 — Auth + tenant isolation**: done (this codebase) — Auth.js with
  three independent session types, the tenant-scoped Prisma client factory,
  and tenant-resolution middleware.
- Phases 4+ (onboarding, customer booking, dashboards, ...) not started.

## Stack

Next.js 15 (App Router) · PostgreSQL 16 + Prisma 6 · Auth.js v5 (credentials +
bcrypt) · Tailwind CSS.

## Local setup

1. **Database.** Create a Postgres 16 database and enable `pgcrypto` +
   `btree_gist`:

   ```sql
   CREATE DATABASE pitchbook;
   \c pitchbook
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE EXTENSION IF NOT EXISTS btree_gist;
   ```

2. **Env vars.** Copy `.env.example` to `.env` and fill in `DATABASE_URL`
   (a superuser or owner role, used only for migrations), the three
   `AUTH_SECRET_*` values, and the tenant-resolution hostnames.

3. **Migrate + apply the RLS/constraint SQL** (Prisma can't express `EXCLUDE
   USING gist` or `CREATE POLICY` natively, so these run separately after
   `prisma migrate dev`):

   ```bash
   npx prisma migrate dev
   psql "$DATABASE_URL" -f prisma/manual-sql/rls.sql
   psql "$DATABASE_URL" -f prisma/manual-sql/booking_conflict_constraint.sql
   psql "$DATABASE_URL" -c "ALTER ROLE app_user WITH PASSWORD '...'; ALTER ROLE platform_service WITH PASSWORD '...';"
   ```

   Then point `DATABASE_URL` (runtime) at `app_user` and
   `DATABASE_URL_PLATFORM` at `platform_service` — see `.env.example`.

4. **Seed:**

   ```bash
   SEED_DATABASE_URL="<superuser connection string>" npm run db:seed
   ```

   Creates two demo tenants (`elite-football`, `city-arena`), each with a
   staff manager (`manager@example.com` / `staff-password-123`) and a
   customer account (`+21600000000` / `customer-password-123`).

5. **Run:**

   ```bash
   npm run dev
   ```

   In local dev, without real subdomains, use the path-based tenant fallback
   (`docs/01-architecture.md` §2) or add entries to `/etc/hosts` for
   `elite-football.localhost` etc.

## Verifying the isolation guarantees

- `npm run lint` — the custom ESLint rule blocks importing `PrismaClient`
  directly outside `src/lib/db`.
- RLS + the booking exclusion constraint were verified directly against a
  live Postgres instance during development: an unscoped query as `app_user`
  with no tenant context returns zero rows; a tenant-scoped client's forged
  cross-tenant `where` clause is silently overwritten back to the correct
  tenant; `platform_service` (BYPASSRLS) sees every tenant; and an
  overlapping-time booking on the same pitch is rejected at the database
  level regardless of the row's tenant.
