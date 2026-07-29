import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const users = await prisma.user.count();
  const orgs = await prisma.organisation.count();
  console.log(`OK connected — users=${users} organisations=${orgs}`);
  process.exit(0);
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
