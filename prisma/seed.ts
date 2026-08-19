import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Seeding runs with full DB privileges (SEED_DATABASE_URL, typically the
// migration/superuser connection) — it deliberately does NOT go through
// getTenantPrismaClient()/RLS, since it needs to create rows across
// multiple tenants in one script.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.SEED_DATABASE_URL ?? process.env.DATABASE_URL } },
});

async function main() {
  const staffPasswordHash = await bcrypt.hash("staff-password-123", 10);
  const customerPasswordHash = await bcrypt.hash("customer-password-123", 10);
  const platformAdminPasswordHash = await bcrypt.hash("admin-password-123", 10);

  await prisma.platformAdmin.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: platformAdminPasswordHash,
      fullName: "Test Platform Admin",
    },
  });
  console.log("Seeded platform admin (admin@example.com)");

  for (const [slug, businessName] of [
    ["elite-football", "Elite Football"],
    ["city-arena", "City Arena"],
  ] as const) {
    const tenant = await prisma.tenant.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        ownerName: `${businessName} Owner`,
        ownerEmail: `owner@${slug}.test`,
        status: "active",
        settings: {
          create: { defaultLanguage: "en", timezone: "Africa/Tunis", currency: "TND", currencySymbol: "DT" },
        },
        branding: {
          create: { businessName, description: `Book pitches at ${businessName}.` },
        },
      },
    });

    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: "manager@example.com" } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: "manager@example.com",
        passwordHash: staffPasswordHash,
        fullName: "Test Manager",
        role: "manager",
      },
    });

    let location = await prisma.location.findFirst({ where: { tenantId: tenant.id, name: "Main Location" } });
    if (!location) {
      location = await prisma.location.create({
        data: { tenantId: tenant.id, name: "Main Location", city: "Tunis" },
      });
    }

    const pitch = await prisma.pitch.findFirst({ where: { tenantId: tenant.id, name: "Pitch 1" } });
    if (!pitch) {
      await prisma.pitch.create({
        data: {
          tenantId: tenant.id,
          locationId: location.id,
          name: "Pitch 1",
          pitchType: "5v5",
          basePrice: 8000,
        },
      });
    }

    const customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id, phone: "+21600000000" } });
    if (!customer) {
      await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          fullName: "Test Customer",
          phone: "+21600000000",
          passwordHash: customerPasswordHash,
        },
      });
    }

    console.log(`Seeded tenant "${slug}" (${tenant.id})`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
