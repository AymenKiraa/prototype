import { NextResponse, type NextRequest } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolve";

/**
 * Resolves the tenant for every request BEFORE any data access, per
 * docs/01-architecture.md §2, and attaches it as `x-tenant-id` /
 * `x-tenant-slug` request headers — read server-side only. Any
 * client-supplied `x-tenant-id` is overwritten here, so downstream code
 * can trust the header came from this middleware, never from the client.
 *
 * Super Admin routes (admin.pitchbook.com, or /platform-admin/* during
 * local dev where subdomains aren't available) bypass this entirely and
 * require a separate `platform_admin` session — see
 * src/lib/auth/platform-admin.ts.
 *
 * Requires the Node.js middleware runtime (not Edge) because tenant
 * resolution needs a real Prisma/Postgres connection — enabled via
 * `experimental.nodeMiddleware` in next.config.ts.
 */

const PLATFORM_ADMIN_HOST = process.env.PLATFORM_ADMIN_HOST ?? "admin.pitchbook.com";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname } = request.nextUrl;

  if (hostname === PLATFORM_ADMIN_HOST || pathname.startsWith("/platform-admin")) {
    return NextResponse.next();
  }

  const resolution = await resolveTenant(hostname, pathname);
  if (!resolution) {
    return NextResponse.rewrite(new URL("/tenant-not-found", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", resolution.tenantId);
  requestHeaders.set("x-tenant-slug", resolution.slug);

  if (resolution.via === "path") {
    // Page routes are flat (/login, not /[slug]/login) — a domain/subdomain
    // match carries the tenant via hostname alone and needs no rewrite, but
    // a path match's slug is a routing prefix that has to be stripped
    // before this reaches route matching, or every route 404s.
    //
    // Known limitation: this fixes direct navigation/reloads, but relative
    // links rendered by a page (e.g. <Link href="/login">) won't carry the
    // /{slug} prefix back into the URL bar — path-fallback is documented as
    // an early-launch/no-DNS degradation, not full parity with real
    // subdomains (docs/01-architecture.md §2).
    const rewritten = request.nextUrl.clone();
    const withoutSlug = pathname.replace(`/${resolution.slug}`, "") || "/";
    rewritten.pathname = withoutSlug;
    return NextResponse.rewrite(rewritten, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|platform-admin|tenant-not-found).*)",
  ],
};
