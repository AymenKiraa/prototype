import type { StaffRole } from "@prisma/client";
import type { DefaultSession } from "@auth/core/types";

/**
 * Module augmentation shared by all three Auth.js instances (platform
 * admin / staff / customer). Every extra field is optional because a
 * given session only ever populates the subset relevant to that instance
 * — see platform-admin.ts, staff.ts, customer.ts.
 *
 * Augments `@auth/core/*` directly, not `next-auth`/`next-auth/jwt` —
 * those packages just re-export from `@auth/core`, and TS module
 * augmentation only merges onto the module where an interface is
 * originally declared.
 */
declare module "@auth/core/types" {
  interface User {
    tenantId?: string;
    role?: StaffRole;
  }

  interface Session {
    user: {
      id: string;
      tenantId?: string;
      role?: StaffRole;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    tenantId?: string;
    role?: StaffRole;
    platformAdmin?: boolean;
    isCustomer?: boolean;
  }
}
