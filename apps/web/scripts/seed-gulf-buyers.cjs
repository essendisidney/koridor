/**
 * Idempotent demo GCC buyers for the Kenya directory.
 * Loads apps/web env, repo .env, then apps/api/.env. From apps/web:
 *   node scripts/seed-gulf-buyers.cjs
 */
const fs = require("fs");
const path = require("path");
const {
  PrismaClient,
  OrganisationType,
  OrganisationStatus,
  VerificationStatus,
  OrganisationMemberRole,
  SystemRole,
} = require("@prisma/client");
const bcrypt = require("bcryptjs");

const webRoot = path.join(__dirname, "..");
const repoRoot = path.join(webRoot, "..", "..");

function loadEnv(file) {
  const full = path.isAbsolute(file) ? file : path.join(webRoot, file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(".env");
loadEnv(".env.local");
loadEnv(path.join(repoRoot, ".env"));
loadEnv(path.join(repoRoot, "apps", "api", ".env"));

const gulfBuyers = [
  {
    email: "oman@demo.koridor.io",
    firstName: "Amira",
    lastName: "Al-Busaidi",
    phone: "+96824000001",
    tz: "Asia/Muscat",
    slug: "sohar-fresh-trading",
    name: "Sohar Fresh Trading",
    city: "Muscat",
    country: "OM",
    summary:
      "Omani importer sourcing Kenyan avocado, mango and tea through Mombasa–Sohar.",
    commodities: ["avocado", "mango", "tea"],
  },
  {
    email: "iran@demo.koridor.io",
    firstName: "Reza",
    lastName: "Karimi",
    phone: "+98210000001",
    tz: "Asia/Tehran",
    slug: "caspian-agro-imports",
    name: "Caspian Agro Imports",
    city: "Tehran",
    country: "IR",
    summary:
      "Iranian buyer of Kenyan coffee, tea and oilseeds with Halal documentation.",
    commodities: ["coffee", "tea", "spices"],
  },
  {
    email: "iraq@demo.koridor.io",
    firstName: "Layla",
    lastName: "Al-Saadi",
    phone: "+96410000001",
    tz: "Asia/Baghdad",
    slug: "basra-produce-house",
    name: "Basra Produce House",
    city: "Basra",
    country: "IQ",
    summary:
      "Iraqi wholesaler importing Kenyan horticulture and staples via Umm Qasr.",
    commodities: ["avocado", "french beans", "tea"],
  },
  {
    email: "saudi@demo.koridor.io",
    firstName: "Noura",
    lastName: "Al-Qahtani",
    phone: "+96611000001",
    tz: "Asia/Riyadh",
    slug: "jeddah-food-security",
    name: "Jeddah Food Security Co",
    city: "Jeddah",
    country: "SA",
    summary:
      "Saudi offtaker for Kenyan tea, avocado and horticulture into Jeddah and Dammam.",
    commodities: ["tea", "avocado", "mango"],
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const prisma = new PrismaClient();
  const demoPassword = await bcrypt.hash("Demo123!", 12);

  try {
    for (const b of gulfBuyers) {
      const user = await prisma.user.upsert({
        where: { email: b.email },
        update: {
          passwordHash: demoPassword,
          firstName: b.firstName,
          lastName: b.lastName,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          isActive: true,
          deletedAt: null,
        },
        create: {
          email: b.email,
          passwordHash: demoPassword,
          firstName: b.firstName,
          lastName: b.lastName,
          phone: b.phone,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          settings: { create: { locale: "en", timezone: b.tz } },
        },
      });

      await prisma.userRole.upsert({
        where: { userId_role: { userId: user.id, role: SystemRole.BUYER } },
        update: { deletedAt: null },
        create: { userId: user.id, role: SystemRole.BUYER },
      });

      const org = await prisma.organisation.upsert({
        where: { slug: b.slug },
        update: {
          name: b.name,
          type: OrganisationType.BUYER,
          status: OrganisationStatus.ACTIVE,
          verificationStatus: VerificationStatus.VERIFIED,
          countryCode: b.country,
          city: b.city,
          description: b.summary,
          ownerId: user.id,
          deletedAt: null,
        },
        create: {
          name: b.name,
          slug: b.slug,
          type: OrganisationType.BUYER,
          status: OrganisationStatus.ACTIVE,
          verificationStatus: VerificationStatus.VERIFIED,
          countryCode: b.country,
          city: b.city,
          description: b.summary,
          ownerId: user.id,
          createdBy: user.id,
        },
      });

      await prisma.organisationMember.upsert({
        where: {
          organisationId_userId: {
            organisationId: org.id,
            userId: user.id,
          },
        },
        update: { role: OrganisationMemberRole.OWNER, deletedAt: null },
        create: {
          organisationId: org.id,
          userId: user.id,
          role: OrganisationMemberRole.OWNER,
          createdBy: user.id,
        },
      });

      await prisma.registryProfile.upsert({
        where: { organisationId: org.id },
        update: {
          organisationType: OrganisationType.BUYER,
          summary: b.summary,
          commodities: [...b.commodities],
          exportMarkets: ["KE"],
          isListed: true,
          deletedAt: null,
        },
        create: {
          organisationId: org.id,
          organisationType: OrganisationType.BUYER,
          summary: b.summary,
          commodities: [...b.commodities],
          exportMarkets: ["KE"],
          yearsInOperation: 5,
          isListed: true,
          createdBy: user.id,
        },
      });

      await prisma.trustProfile.upsert({
        where: { organisationId: org.id },
        update: { deletedAt: null, lastScoredAt: new Date() },
        create: {
          organisationId: org.id,
          trustScore: 68,
          lastScoredAt: new Date(),
          createdBy: user.id,
        },
      });

      console.log(`upserted ${b.email} → ${b.slug}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
