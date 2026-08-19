import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Tenant-resolution middleware (src/middleware.ts) needs a real
    // Prisma/Postgres connection, which isn't available on the Edge
    // runtime middleware normally runs on. Not yet in NextConfig's
    // published types even though the runtime supports it.
    nodeMiddleware: true,
  } as NextConfig["experimental"],
};

export default nextConfig;
