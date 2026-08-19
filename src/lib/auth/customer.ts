import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getTenantPrismaClient } from "@/lib/db/tenant-client";

/**
 * Session #3 of 3 — Customer (end user booking a pitch).
 *
 * Most customers never authenticate at all: a booking can be made as a
 * guest, identified by phone number, per Phase 5. This instance only
 * covers the optional "create an account to see booking history" path —
 * `Customer.passwordHash` is nullable, and `authorize` fails closed
 * (returns null) for any customer who hasn't set one.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/auth/customer",
  // Without this, NextAuth can't reliably infer the request origin outside
  // known platforms (Vercel) — internal redirect/callback URL construction
  // falls back to a bogus default host instead of the tenant's real one.
  trustHost: true,
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "pb-customer-session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        tenantId: { label: "Tenant", type: "text" },
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const tenantId = String(credentials?.tenantId ?? "");
        const phone = String(credentials?.phone ?? "");
        const password = String(credentials?.password ?? "");
        if (!tenantId || !phone || !password) return null;

        const db = getTenantPrismaClient(tenantId);
        const customer = await db.customer.findFirst({ where: { phone } });
        if (!customer?.passwordHash) return null;

        const valid = await bcrypt.compare(password, customer.passwordHash);
        if (!valid) return null;

        return {
          id: customer.id,
          name: customer.fullName,
          email: customer.email ?? undefined,
          tenantId: customer.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.tenantId = user.tenantId;
        token.isCustomer = true;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.tenantId = token.tenantId;
      return session;
    },
  },
  secret: process.env.AUTH_SECRET_CUSTOMER,
});
