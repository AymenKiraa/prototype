# PitchBook — Multi-Tenant Football Pitch Reservation SaaS
## Phase 1: Architecture

## 1. System Levels

```
┌─────────────────────────────────────────────────────┐
│  SUPER ADMIN (Platform Owner)                        │
│  admin.pitchbook.com                                 │
│  - Creates/suspends tenants, manages plans, billing   │
│  - No access to booking data unless impersonating     │
│    (logged, time-boxed, tenant-consented)             │
└─────────────────────────────────────────────────────┘
                        │ creates
                        ▼
┌─────────────────────────────────────────────────────┐
│  TENANT (Business)  e.g. elite-football               │
│  elite-football.pitchbook.com  →  later: book.elite.tn │
│  - Owner / Manager / Receptionist / Viewer staff       │
│  - Isolated: pitches, bookings, customers, pricing,    │
│    branding, settings, analytics                      │
└─────────────────────────────────────────────────────┘
                        │ serves
                        ▼
┌─────────────────────────────────────────────────────┐
│  CUSTOMER (End user)                                   │
│  Sees only the tenant's branded booking UI             │
│  No knowledge of the underlying SaaS platform           │
└─────────────────────────────────────────────────────┘
```

## 2. Tenant Resolution

Request → Middleware resolves tenant **before** any data access:

1. Custom domain lookup (`domains` table: `book.footballarena.tn` → `tenant_id`)
2. Subdomain lookup (`{slug}.pitchbook.com` → `tenant_id`)
3. Fallback: `pitchbook.com/{slug}` (path-based, for early launch / no-DNS customers)

Resolved `tenant_id` is attached to the request context (Next.js middleware → header `x-tenant-id`, read server-side only, never trusted from client). This context is the single source of truth threaded through every server component, API route, and DB call for that request.

**Super Admin routes** (`admin.pitchbook.com`) explicitly bypass tenant resolution and instead require a `platform_admin` session — a structurally separate auth path so a bug in tenant resolution can never accidentally grant platform-level access.

## 3. Tenant Isolation Strategy (defense in depth)

Isolation is enforced at **three independent layers**, because per your requirement, cross-tenant access must be impossible under normal operation, not just filtered out in application code:

| Layer | Mechanism |
|---|---|
| **Database** | Postgres Row-Level Security (RLS) on every tenant-scoped table. A session variable `app.current_tenant_id` is set at the start of every transaction; RLS policies reject any row where `tenant_id != current_setting('app.current_tenant_id')`. This holds even if application code has a bug. |
| **ORM / query layer** | Prisma middleware auto-injects `tenant_id` into every `where` clause and every `create` payload for tenant-scoped models. Queries that omit tenant scoping fail a lint rule (custom ESLint rule scanning for raw Prisma calls on tenant models outside the scoped client factory). |
| **Authorization** | Every API route/server action re-derives `tenant_id` from the authenticated session — never from the URL or request body. A staff member's JWT encodes their `tenant_id`; if a request path contains a different tenant's slug, the request is rejected (IDOR protection — requirement #26). |

This means an attacker who bypasses the app layer entirely (e.g., a raw SQL injection that somehow reaches the DB) still hits RLS. An attacker who manipulates an ID in a URL still gets rejected because authorization is session-derived, not request-derived.

Super Admin operations that legitimately need cross-tenant reads (platform statistics) use a separate DB role with RLS bypass (`BYPASSRLS`), used only by the platform-admin code path, never the tenant-app code path.

## 4. Stack

| Concern | Choice | Why |
|---|---|---|
| App framework | **Next.js 15 (App Router)** | One codebase for customer UI, tenant admin, and super admin; server components fetch tenant-scoped data without exposing a public API by default |
| Database | **PostgreSQL 16** | Only realistic choice given RLS requirement + `EXCLUDE` constraints for booking-conflict prevention (§7) |
| ORM | **Prisma** | Type-safe, migration-friendly; tenant-scoping middleware layer described above |
| Auth | **Auth.js (NextAuth v5)**, credentials + bcrypt | Full control over three distinct session shapes (platform admin / tenant staff / customer); avoids forcing an external org model onto a structure it wasn't built for |
| Styling | **Tailwind CSS + CSS variables for tenant theming** | Tenant colors/fonts injected as CSS custom properties at the layout root — no per-tenant recompilation needed |
| Background jobs | **Postgres-backed job queue (e.g. pg-boss)** | Notifications, subscription-expiry checks, reminders — avoids adding Redis as a hard dependency for an MVP |
| File storage | Abstracted `StorageProvider` interface, local disk in dev, S3-compatible in prod | Logos, cover images, pitch photos |
| i18n | `next-intl` | AR/FR/EN with RTL support for Arabic from day one |

## 5. Feature Flag System (centralized, per requirement #11)

A single `hasFeature(tenantId, featureKey)` function is the **only** sanctioned way to gate functionality. It resolves:

```
plan.features (base set from subscription plan)
  → tenant_settings.feature_overrides (per-tenant overrides, e.g. a sales exception)
  → effective feature set (cached per-request)
```

No component ever checks `tenant.plan === 'enterprise'` directly. This is enforced by convention + code review checklist in Phase 9, because it's the mechanism that lets you change plan boundaries later without hunting through the codebase.

## 6. Booking Conflict Prevention (requirement #27)

Primary defense: a Postgres **exclusion constraint** using the `btree_gist` extension on the `bookings` table:

```sql
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  pitch_id WITH =,
  tstzrange(start_time, end_time) WITH &&
) WHERE (status NOT IN ('cancelled', 'no_show'));
```

This makes overlapping bookings for the same pitch **impossible at the database level**, regardless of race conditions, application bugs, or concurrent requests — no amount of app-layer "check then insert" logic can be trusted under concurrency (classic TOCTOU race), so the guarantee has to live in the DB. The application still does an optimistic pre-check for good UX (fast "unavailable" feedback), but the constraint is the real guarantee, and a violated constraint is caught and surfaced as "this slot was just taken."

## 7. Pricing Engine

Pricing is resolved at booking time by a rule-priority chain (specific → general):

1. Special pricing (date-specific: holiday/Ramadan/event) — highest priority
2. Time-based pricing (hour range within a day)
3. Day-based pricing (day of week)
4. Standard/base price — fallback

The **resolved price is snapshotted onto the booking row** at creation time (`bookings.price_amount`, `bookings.currency`). Pricing rule tables are never joined at read time for historical bookings — this is what guarantees requirement #10 ("historical bookings must never change when future prices are modified").

## 8. Audit Trail

Two audit mechanisms, deliberately separate:

- **`booking_audit_logs`** — domain-specific, human-readable, tied to a booking (status changes, time changes, who/when/old/new) — powers the "22/08/2026 14:32 — Booking created by customer" timeline in the UI.
- **`system_audit_logs`** — platform-wide, covers Super Admin actions (tenant suspension, plan changes, impersonation) — never shown to tenants, only to Super Admin.

Both are append-only (no `UPDATE`/`DELETE` grants at the DB role level for these tables — enforced via Postgres privileges, not just app logic).

## 9. Development Phases (build order)

Each phase leaves the app in a runnable state.

1. **Architecture** *(this document)*
2. **Database schema** — full Prisma schema, RLS policies, exclusion constraint, seed script
3. **Auth + tenant isolation** — Auth.js setup, three session types, tenant-scoped Prisma client factory, middleware
4. **Business onboarding** — Super Admin "create tenant" flow + business setup wizard
5. **Customer booking system** — public booking flow end-to-end
6. **Business admin dashboard** — bookings, customers, pitches, today/trends views
7. **Super Admin dashboard** — platform stats, tenant management, impersonation
8. **Branding/customization** — theme editor + live preview
9. **Subscription/feature flags** — plan model, `hasFeature()`, upgrade/downgrade
10. **Notifications** — provider-abstracted email/SMS/WhatsApp, template system
11. **Analytics** — occupancy, retention, cancellation-rate rollups
12. **Testing & security hardening** — concurrency tests on the exclusion constraint, IDOR test suite, RLS policy tests

---
Next: **Phase 2 — full database schema** (Prisma models + RLS policies + seed data), building directly on the isolation and pricing-snapshot strategy above.
