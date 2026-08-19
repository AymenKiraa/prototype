import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getTenantPrismaClient } from "@/lib/db/tenant-client";

/**
 * Session #2 of 3 — Tenant staff (owner/manager/receptionist/viewer).
 *
 * `tenantId` must be supplied by the sign-in form as a hidden field,
 * populated server-side from the `x-tenant-id` header that middleware
 * resolved for this request — never trust a client-supplied tenantId for
 * anything beyond "which tenant's User table to search", since the lookup
 * itself is tenant-scoped (RLS + the auto-injected `where.tenantId`) and a
 * wrong/forged tenantId just means "user not found", not a cross-tenant
 * leak.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/auth/staff",
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "pb-staff-session",
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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const tenantId = String(credentials?.tenantId ?? "");
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!tenantId || !email || !password) return null;

        const db = getTenantPrismaClient(tenantId);
        const user = await db.user.findFirst({ where: { email, isActive: true } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          tenantId: user.tenantId,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.tenantId = user.tenantId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.tenantId = token.tenantId;
      session.user.role = token.role;
      return session;
    },
  },
  secret: process.env.AUTH_SECRET_STAFF,
});
