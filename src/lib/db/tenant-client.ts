import type { Prisma } from "@prisma/client";
import { rawPrisma } from "./raw-client";

/**
 * The ONLY sanctioned way to read/write tenant-scoped tables. See
 * docs/01-architecture.md §3 ("ORM / query layer").
 *
 * For every operation, this:
 *
 *   1. Auto-injects `tenantId` into `where` (reads, updates, deletes) and
 *      into `data` (creates) for every tenant-scoped model, so a query
 *      that "forgets" to filter by tenant still can't leak or corrupt
 *      another tenant's rows.
 *   2. Runs the operation inside a short transaction that first sets the
 *      Postgres session variable `app.current_tenant_id` (transaction-
 *      local, via `set_config(..., true)`), so Row-Level Security (see
 *      prisma/manual-sql/rls.sql) enforces the same boundary at the
 *      database layer — the real guarantee, independent of whether this
 *      file has a bug.
 *
 * Callers that need several operations to be atomic together should use
 * the extended client's own `$transaction`, e.g.:
 *
 *   const db = getTenantPrismaClient(tenantId);
 *   await db.$transaction([db.booking.create({ ... }), db.bookingAuditLog.create({ ... })]);
 */

type TenantScopedModel = Exclude<Prisma.ModelName, "PlatformAdmin" | "SystemAuditLog" | "Plan">;

// Tenant is scoped by its own `id`, not a `tenantId` column.
const TENANT_KEY_OVERRIDES: Partial<Record<TenantScopedModel, string>> = {
  Tenant: "id",
};

const TENANT_SCOPED_MODELS = new Set<TenantScopedModel>([
  "Tenant",
  "TenantSettings",
  "TenantBranding",
  "Domain",
  "Subscription",
  "Invoice",
  "User",
  "Location",
  "Pitch",
  "OpeningHours",
  "BlockedSlot",
  "PricingRule",
  "Promotion",
  "Customer",
  "Booking",
  "BookingAuditLog",
  "Payment",
  "NotificationTemplate",
  "Notification",
]);

const READ_AND_WRITE_WHERE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

function modelPropertyName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function scopeArgsToTenant(
  operation: string,
  args: Record<string, unknown> | undefined,
  tenantKey: string,
  tenantId: string,
): Record<string, unknown> {
  const scoped = { ...(args ?? {}) };

  if (READ_AND_WRITE_WHERE_OPS.has(operation)) {
    scoped.where = { ...((scoped.where as object) ?? {}), [tenantKey]: tenantId };
  }
  if (operation === "create") {
    scoped.data = { ...((scoped.data as object) ?? {}), [tenantKey]: tenantId };
  }
  if (operation === "createMany" && Array.isArray(scoped.data)) {
    scoped.data = (scoped.data as Record<string, unknown>[]).map((row) => ({
      ...row,
      [tenantKey]: tenantId,
    }));
  }
  if (operation === "upsert") {
    scoped.create = { ...((scoped.create as object) ?? {}), [tenantKey]: tenantId };
  }

  return scoped;
}

export function getTenantPrismaClient(tenantId: string) {
  if (!tenantId) {
    throw new Error("getTenantPrismaClient() requires a non-empty tenantId");
  }

  return rawPrisma.$extends({
    name: `tenant-scoped:${tenantId}`,
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const isScoped = TENANT_SCOPED_MODELS.has(model as TenantScopedModel);
          const scopedArgs = isScoped
            ? scopeArgsToTenant(
                operation,
                args as Record<string, unknown> | undefined,
                TENANT_KEY_OVERRIDES[model as TenantScopedModel] ?? "tenantId",
                tenantId,
              )
            : args;

          if (!isScoped) {
            return query(scopedArgs as never);
          }

          // Note: `rawPrisma` (captured via closure, not `this`) is used
          // for `$transaction` so the transaction client is unextended —
          // otherwise this would recurse into $allOperations forever.
          return rawPrisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
            const modelClient = tx[modelPropertyName(model) as keyof typeof tx] as unknown as Record<
              string,
              (a: unknown) => Promise<unknown>
            >;
            return modelClient[operation](scopedArgs);
          });
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof getTenantPrismaClient>;
