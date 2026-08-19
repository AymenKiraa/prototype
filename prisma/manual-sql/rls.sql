-- =========================================================================
-- Row-Level Security: tenant isolation enforced at the database layer.
--
-- Every tenant-scoped table gets a policy requiring
-- "tenantId" = current_setting('app.current_tenant_id')
--
-- Column names are quoted camelCase (Prisma's default column naming —
-- schema.prisma only @@map()s table names, not fields) and compared as
-- TEXT, not UUID: `id`/`tenantId` are Prisma-generated uuid() *strings*,
-- stored as TEXT columns, not native Postgres `uuid`.
--
-- The application sets this session variable at the START of every
-- request-scoped transaction, immediately after resolving the tenant
-- from the session/subdomain (see src/lib/db/tenant-client.ts).
--
-- The `platform_service` role has BYPASSRLS and is used ONLY by
-- Super Admin code paths that legitimately need cross-tenant reads
-- (platform statistics, tenant management, tenant resolution in
-- middleware). The `app_user` role used by all tenant-facing code paths
-- does NOT have BYPASSRLS.
-- =========================================================================

-- Roles ---------------------------------------------------------------
-- LOGIN so each connects directly with its own scoped privileges (no
-- connection-pooler SET ROLE step to get wrong). Passwords are set out of
-- band via deployment secrets, e.g.:
--   ALTER ROLE app_user WITH PASSWORD '...';
--   ALTER ROLE platform_service WITH PASSWORD '...';
-- Never commit real passwords here.
CREATE ROLE app_user LOGIN;
CREATE ROLE platform_service LOGIN BYPASSRLS;

-- Helper: list of tenant-scoped tables, for reference/regeneration -----
-- tenants, tenant_settings, tenant_branding, domains, subscriptions,
-- invoices, users, locations, pitches, opening_hours, blocked_slots,
-- pricing_rules, promotions, customers, bookings, booking_audit_logs,
-- payments, notification_templates, notifications

-- Enable RLS + policy per table ----------------------------------------
-- Pattern repeated for every tenant-scoped table. `tenants` is scoped by
-- its own "id", every other table by its "tenantId" foreign key.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants
  USING ("id" = current_setting('app.current_tenant_id', true));

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenant_settings
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenant_branding
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON domains
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON subscriptions
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON locations
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitches FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pitches
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_hours FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON opening_hours
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON blocked_slots
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pricing_rules
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON promotions
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customers
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bookings
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE booking_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON booking_audit_logs
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payments
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_templates
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notifications
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- system_audit_logs and platform_admins and plans are intentionally NOT
-- tenant-scoped (platform-level tables) and are readable only by roles
-- with platform_service privileges via application-level authorization,
-- not RLS.

-- Grants -----------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- No DELETE grant on append-only audit tables:
REVOKE DELETE, UPDATE ON booking_audit_logs FROM app_user;
REVOKE DELETE, UPDATE ON system_audit_logs FROM app_user;

GRANT ALL ON ALL TABLES IN SCHEMA public TO platform_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO platform_service;
