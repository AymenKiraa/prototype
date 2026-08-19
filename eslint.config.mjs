import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next still ships legacy (eslintrc-style) shareable
// configs, not flat-config arrays — FlatCompat bridges the two.
const compat = new FlatCompat({ baseDirectory: __dirname });

// docs/01-architecture.md §3: the tenant-scoped Prisma client factory is
// the only sanctioned way to touch tenant-scoped tables. This rule blocks
// importing `PrismaClient` from `@prisma/client` anywhere outside
// src/lib/db, where raw-client.ts and platform-client.ts hold the two
// deliberate, reviewed exceptions.
const restrictRawPrismaClient = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@prisma/client",
            importNames: ["PrismaClient"],
            message:
              "Don't instantiate PrismaClient directly. Use getTenantPrismaClient() from '@/lib/db/tenant-client' for tenant-scoped data, or platformPrisma from '@/lib/db/platform-client' for Super Admin code paths.",
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  restrictRawPrismaClient,
  {
    // prisma/seed.ts is the third reviewed exception: it deliberately
    // writes across multiple tenants in one script, so it can't go
    // through the tenant-scoped client either.
    files: ["src/lib/db/**/*.ts", "prisma/seed.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
