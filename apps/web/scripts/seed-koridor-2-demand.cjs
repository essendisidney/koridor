/**
 * Seed demo buyer requirements + Kenya supply lots for Koridor 2.0.
 * From apps/web: node scripts/seed-koridor-2-demand.cjs
 */
const fs = require("fs");
const path = require("path");
const {
  PrismaClient,
  RequirementStatus,
  RequirementFrequency,
  SupplyLotStatus,
} = require("@prisma/client");

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

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient();
  try {
    const saudi = await prisma.organisation.findFirst({
      where: { slug: "jeddah-food-security", deletedAt: null },
    });
    const oman = await prisma.organisation.findFirst({
      where: { slug: "sohar-fresh-trading", deletedAt: null },
    });
    const exporter = await prisma.organisation.findFirst({
      where: { slug: "demo-exports-kenya", deletedAt: null },
    });
    if (!saudi || !exporter) {
      throw new Error("Demo orgs missing — run gulf buyer seed first");
    }

    const buyerUser = await prisma.user.findFirst({
      where: { email: "saudi@demo.koridor.io", deletedAt: null },
    });
    const exporterUser = await prisma.user.findFirst({
      where: { email: "exporter@demo.koridor.io", deletedAt: null },
    });
    if (!buyerUser || !exporterUser) throw new Error("Demo users missing");

    for (const r of [
      {
        reference: "KR-000001",
        buyerOrgId: saudi.id,
        createdById: buyerUser.id,
        commodity: "Avocado",
        variety: "Hass",
        quantity: 2000,
        frequency: RequirementFrequency.MONTHLY,
        destinationCountry: "SA",
        destinationCity: "Jeddah",
        destinationPort: "Jeddah Islamic Port",
        certifications: ["GlobalG.A.P."],
        grade: "A",
        packaging: "4kg cartons",
        incoterm: "CIF",
        paymentTerms: "LC",
      },
      {
        reference: "KR-000002",
        buyerOrgId: (oman ?? saudi).id,
        createdById: buyerUser.id,
        commodity: "Mango",
        quantity: 500,
        frequency: RequirementFrequency.ONE_OFF,
        destinationCountry: "AE",
        destinationCity: "Dubai",
        certifications: ["GlobalG.A.P."],
        grade: "A",
        incoterm: "CIF",
        paymentTerms: "LC",
      },
    ]) {
      await prisma.buyerRequirement.upsert({
        where: { reference: r.reference },
        update: {
          status: RequirementStatus.PUBLISHED,
          verifiedDemand: true,
          publishedAt: new Date(),
          deletedAt: null,
        },
        create: {
          ...r,
          unit: "MT",
          originPreference: "KE",
          currency: "USD",
          status: RequirementStatus.PUBLISHED,
          verifiedDemand: true,
          publishedAt: new Date(),
          createdBy: buyerUser.id,
        },
      });
      console.log("requirement", r.reference);
    }

    await prisma.supplyLot.upsert({
      where: { reference: "KR-KE-AVO-000001" },
      update: {
        availableQuantity: 700,
        status: SupplyLotStatus.EXPORT_ELIGIBLE,
        deletedAt: null,
      },
      create: {
        reference: "KR-KE-AVO-000001",
        supplierOrgId: exporter.id,
        createdById: exporterUser.id,
        commodity: "Avocado",
        variety: "Hass",
        originCountry: "KE",
        originRegion: "Murang'a",
        quantity: 700,
        availableQuantity: 700,
        unit: "MT",
        grade: "A",
        certifications: ["GlobalG.A.P.", "Phytosanitary"],
        packaging: "4kg cartons",
        status: SupplyLotStatus.EXPORT_ELIGIBLE,
        createdBy: exporterUser.id,
      },
    });
    console.log("supply lot KR-KE-AVO-000001");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
