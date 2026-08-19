import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { platformPrisma } from "@/lib/db/platform-client";

/**
 * Session #1 of 3 — Super Admin. Structurally separate from the tenant
 * staff / customer auth below: its own NextAuth instance, its own cookie,
 * its own secret, and it reads `platform_admins` (not RLS-protected) via
 * the `platform_service` DB role — never via a tenant-scoped client. A bug
 * in tenant resolution can never accidentally grant platform-level access
 * because this path never touches tenant resolution at all.
 *
 * Mounted at admin.pitchbook.com, routed by src/middleware.ts.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: "/api/auth/platform-admin",
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "pb-platform-admin-session",
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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const admin = await platformPrisma.platformAdmin.findUnique({ where: { email } });
        if (!admin || !admin.isActive) return null;

        const valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) return null;

        return { id: admin.id, name: admin.fullName, email: admin.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.platformAdmin = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET_PLATFORM_ADMIN,
});
