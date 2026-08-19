"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { platformPrisma } from "@/lib/db/platform-client";
import { requirePlatformAdminSession } from "@/lib/auth/guards";

export interface CreateTenantState {
  error?: string;
  slug?: string;
  ownerEmail?: string;
  temporaryPassword?: string;
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function generateTemporaryPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

export async function createTenantAction(
  _prevState: CreateTenantState | undefined,
  formData: FormData,
): Promise<CreateTenantState> {
  await requirePlatformAdminSession();

  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!SLUG_PATTERN.test(slug)) {
    return { error: "Slug must be lowercase letters, numbers, and hyphens only (e.g. \"elite-football\")." };
  }
  if (!businessName || !ownerName || !ownerEmail) {
    return { error: "Business name, owner name, and owner email are required." };
  }

  const existing = await platformPrisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    return { error: `"${slug}" is already taken.` };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  // Nested create: Tenant + TenantSettings + TenantBranding + the owner's
  // User row all in one write, so a business is never left half-created
  // (e.g. a Tenant with no settings row) if something fails partway.
  await platformPrisma.tenant.create({
    data: {
      slug,
      ownerName,
      ownerEmail,
      phone,
      status: "trial",
      settings: { create: {} },
      branding: { create: { businessName } },
      users: {
        create: {
          email: ownerEmail,
          passwordHash,
          fullName: ownerName,
          role: "owner",
        },
      },
    },
  });

  // Shown once — there's no notification system yet (Phase 10) to email
  // this, so the platform admin relays it to the business owner directly.
  return { slug, ownerEmail, temporaryPassword };
}
