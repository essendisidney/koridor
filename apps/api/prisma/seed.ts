import {
  ActivityType,
  CertificateStatus,
  CertificateType,
  ComplianceApprovalStatus,
  IdDocumentType,
  KycStatus,
  NotificationChannel,
  NotificationStatus,
  OrganisationMemberRole,
  OrganisationStatus,
  OrganisationType,
  PrismaClient,
  SystemRole,
  VerificationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Koridor database...');

  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const demoPassword = await bcrypt.hash('Demo123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@koridor.io' },
    update: {
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: 'admin@koridor.io',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      settings: { create: { locale: 'en', timezone: 'UTC' } },
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_role: { userId: admin.id, role: SystemRole.SYSTEM_ADMIN },
    },
    update: { deletedAt: null },
    create: {
      userId: admin.id,
      role: SystemRole.SYSTEM_ADMIN,
      createdBy: admin.id,
    },
  });

  const exporterUser = await prisma.user.upsert({
    where: { email: 'exporter@demo.koridor.io' },
    update: {
      passwordHash: demoPassword,
      firstName: 'Elena',
      lastName: 'Exporter',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: 'exporter@demo.koridor.io',
      passwordHash: demoPassword,
      firstName: 'Elena',
      lastName: 'Exporter',
      phone: '+254711000001',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      settings: { create: { locale: 'en', timezone: 'Africa/Nairobi' } },
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_role: { userId: exporterUser.id, role: SystemRole.EXPORTER },
    },
    update: { deletedAt: null },
    create: {
      userId: exporterUser.id,
      role: SystemRole.EXPORTER,
      createdBy: admin.id,
    },
  });

  const buyerUser = await prisma.user.upsert({
    where: { email: 'buyer@demo.koridor.io' },
    update: {
      passwordHash: demoPassword,
      firstName: 'Brian',
      lastName: 'Buyer',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: 'buyer@demo.koridor.io',
      passwordHash: demoPassword,
      firstName: 'Brian',
      lastName: 'Buyer',
      phone: '+254711000002',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      settings: { create: { locale: 'en', timezone: 'Africa/Nairobi' } },
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_role: { userId: buyerUser.id, role: SystemRole.BUYER },
    },
    update: { deletedAt: null },
    create: {
      userId: buyerUser.id,
      role: SystemRole.BUYER,
      createdBy: admin.id,
    },
  });

  const exporterOrg = await prisma.organisation.upsert({
    where: { slug: 'demo-exports-kenya' },
    update: {
      name: 'Demo Exports Kenya',
      type: OrganisationType.EXPORTER,
      status: OrganisationStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      countryCode: 'KE',
      city: 'Nairobi',
      ownerId: exporterUser.id,
      deletedAt: null,
    },
    create: {
      name: 'Demo Exports Kenya',
      slug: 'demo-exports-kenya',
      type: OrganisationType.EXPORTER,
      status: OrganisationStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      countryCode: 'KE',
      city: 'Nairobi',
      addressLine1: 'Industrial Area',
      description: 'Demo exporter organisation for Koridor Phase 1',
      ownerId: exporterUser.id,
      createdBy: exporterUser.id,
    },
  });

  await prisma.organisationMember.upsert({
    where: {
      organisationId_userId: {
        organisationId: exporterOrg.id,
        userId: exporterUser.id,
      },
    },
    update: {
      role: OrganisationMemberRole.OWNER,
      deletedAt: null,
    },
    create: {
      organisationId: exporterOrg.id,
      userId: exporterUser.id,
      role: OrganisationMemberRole.OWNER,
      createdBy: exporterUser.id,
    },
  });

  const buyerOrg = await prisma.organisation.upsert({
    where: { slug: 'demo-buyers-limited' },
    update: {
      name: 'Demo Buyers Limited',
      type: OrganisationType.BUYER,
      status: OrganisationStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      countryCode: 'KE',
      city: 'Mombasa',
      ownerId: buyerUser.id,
      deletedAt: null,
    },
    create: {
      name: 'Demo Buyers Limited',
      slug: 'demo-buyers-limited',
      type: OrganisationType.BUYER,
      status: OrganisationStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      countryCode: 'KE',
      city: 'Mombasa',
      addressLine1: 'Portside Avenue',
      description: 'Demo buyer organisation for Koridor Phase 1',
      ownerId: buyerUser.id,
      createdBy: buyerUser.id,
    },
  });

  await prisma.organisationMember.upsert({
    where: {
      organisationId_userId: {
        organisationId: buyerOrg.id,
        userId: buyerUser.id,
      },
    },
    update: {
      role: OrganisationMemberRole.OWNER,
      deletedAt: null,
    },
    create: {
      organisationId: buyerOrg.id,
      userId: buyerUser.id,
      role: OrganisationMemberRole.OWNER,
      createdBy: buyerUser.id,
    },
  });

  // Clear and recreate sample notifications / activities / audit for idempotent demos
  await prisma.notification.deleteMany({
    where: {
      userId: { in: [exporterUser.id, buyerUser.id, admin.id] },
      title: { startsWith: '[Seed]' },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: exporterUser.id,
        title: '[Seed] Welcome to Koridor',
        body: 'Your exporter workspace is ready. Complete your organisation profile to get started.',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.UNREAD,
        link: '/organisations',
        createdBy: admin.id,
      },
      {
        userId: exporterUser.id,
        title: '[Seed] Document checklist',
        body: 'Upload your trade license and tax certificate for verification.',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.UNREAD,
        createdBy: admin.id,
      },
      {
        userId: buyerUser.id,
        title: '[Seed] Welcome to Koridor',
        body: 'Your buyer workspace is ready. Browse exporters once onboarding is complete.',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.UNREAD,
        link: '/organisations',
        createdBy: admin.id,
      },
      {
        userId: admin.id,
        title: '[Seed] Platform seeded',
        body: 'Demo organisations and users were created successfully.',
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.READ,
        readAt: new Date(),
        createdBy: admin.id,
      },
    ],
  });

  await prisma.activity.deleteMany({
    where: {
      title: { startsWith: '[Seed]' },
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        type: ActivityType.USER_REGISTERED,
        title: '[Seed] Admin account ready',
        description: 'System administrator seeded',
        actorId: admin.id,
        entityType: 'User',
        entityId: admin.id,
        createdBy: admin.id,
      },
      {
        type: ActivityType.ORG_CREATED,
        title: '[Seed] Demo exporter organisation',
        description: exporterOrg.name,
        actorId: exporterUser.id,
        organisationId: exporterOrg.id,
        entityType: 'Organisation',
        entityId: exporterOrg.id,
        createdBy: exporterUser.id,
      },
      {
        type: ActivityType.ORG_CREATED,
        title: '[Seed] Demo buyer organisation',
        description: buyerOrg.name,
        actorId: buyerUser.id,
        organisationId: buyerOrg.id,
        entityType: 'Organisation',
        entityId: buyerOrg.id,
        createdBy: buyerUser.id,
      },
      {
        type: ActivityType.ROLE_ASSIGNED,
        title: '[Seed] Exporter role assigned',
        description: SystemRole.EXPORTER,
        actorId: admin.id,
        organisationId: exporterOrg.id,
        entityType: 'User',
        entityId: exporterUser.id,
        createdBy: admin.id,
      },
    ],
  });

  await prisma.auditLog.deleteMany({
    where: {
      action: { startsWith: 'SEED_' },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        action: 'SEED_ADMIN_CREATED',
        entityType: 'User',
        entityId: admin.id,
        actorId: admin.id,
        after: { email: admin.email, role: SystemRole.SYSTEM_ADMIN },
        createdBy: admin.id,
      },
      {
        action: 'SEED_ORG_CREATED',
        entityType: 'Organisation',
        entityId: exporterOrg.id,
        actorId: exporterUser.id,
        organisationId: exporterOrg.id,
        after: { name: exporterOrg.name, slug: exporterOrg.slug },
        createdBy: exporterUser.id,
      },
      {
        action: 'SEED_ORG_CREATED',
        entityType: 'Organisation',
        entityId: buyerOrg.id,
        actorId: buyerUser.id,
        organisationId: buyerOrg.id,
        after: { name: buyerOrg.name, slug: buyerOrg.slug },
        createdBy: buyerUser.id,
      },
      {
        action: 'SEED_ROLE_ASSIGNED',
        entityType: 'UserRole',
        actorId: admin.id,
        after: { userId: buyerUser.id, role: SystemRole.BUYER },
        createdBy: admin.id,
      },
    ],
  });

  // Phase 2 — Trust Engine demo data
  await prisma.orgContact.deleteMany({
    where: { organisationId: { in: [exporterOrg.id, buyerOrg.id] } },
  });
  await prisma.orgContact.createMany({
    data: [
      {
        organisationId: exporterOrg.id,
        name: 'Elena Exporter',
        email: 'exporter@demo.koridor.io',
        phone: '+254711000001',
        title: 'Managing Director',
        isPrimary: true,
        createdBy: exporterUser.id,
      },
      {
        organisationId: buyerOrg.id,
        name: 'Brian Buyer',
        email: 'buyer@demo.koridor.io',
        phone: '+254711000002',
        title: 'Procurement Lead',
        isPrimary: true,
        createdBy: buyerUser.id,
      },
    ],
  });

  await prisma.registryProfile.upsert({
    where: { organisationId: exporterOrg.id },
    update: {
      summary:
        'East African agricultural exporter specialising in coffee and avocado.',
      commodities: ['coffee', 'avocado'],
      exportMarkets: ['EU', 'UK', 'UAE'],
      yearsInOperation: 8,
      isListed: true,
      deletedAt: null,
    },
    create: {
      organisationId: exporterOrg.id,
      organisationType: OrganisationType.EXPORTER,
      summary:
        'East African agricultural exporter specialising in coffee and avocado.',
      commodities: ['coffee', 'avocado'],
      exportMarkets: ['EU', 'UK', 'UAE'],
      yearsInOperation: 8,
      isListed: true,
      createdBy: exporterUser.id,
    },
  });

  await prisma.registryProfile.upsert({
    where: { organisationId: buyerOrg.id },
    update: {
      summary:
        'Buyer sourcing specialty coffee and fresh produce from East Africa.',
      commodities: ['coffee', 'fresh produce'],
      exportMarkets: ['KE', 'UG', 'TZ'],
      yearsInOperation: 12,
      isListed: true,
      deletedAt: null,
    },
    create: {
      organisationId: buyerOrg.id,
      organisationType: OrganisationType.BUYER,
      summary:
        'Buyer sourcing specialty coffee and fresh produce from East Africa.',
      commodities: ['coffee', 'fresh produce'],
      exportMarkets: ['KE', 'UG', 'TZ'],
      yearsInOperation: 12,
      isListed: true,
      createdBy: buyerUser.id,
    },
  });

  const existingKyc = await prisma.kycProfile.findFirst({
    where: { userId: exporterUser.id, deletedAt: null },
  });
  if (!existingKyc) {
    await prisma.kycProfile.create({
      data: {
        userId: exporterUser.id,
        status: KycStatus.VERIFIED,
        idDocumentType: IdDocumentType.NATIONAL_ID,
        idNumberHash: 'seed-demo-export-id',
        idNumberLast4: '0001',
        countryCode: 'KE',
        submittedAt: new Date(),
        reviewedAt: new Date(),
        createdBy: exporterUser.id,
      },
    });
  }

  await prisma.trustProfile.upsert({
    where: { organisationId: exporterOrg.id },
    update: {
      trustScore: 75,
      scoreBreakdown: {
        profileCompleteness: 25,
        requiredDocuments: 0,
        verificationStatus: 30,
        memberKyc: 20,
        total: 75,
      },
      lastScoredAt: new Date(),
      deletedAt: null,
    },
    create: {
      organisationId: exporterOrg.id,
      trustScore: 75,
      scoreBreakdown: {
        profileCompleteness: 25,
        requiredDocuments: 0,
        verificationStatus: 30,
        memberKyc: 20,
        total: 75,
      },
      lastScoredAt: new Date(),
      createdBy: exporterUser.id,
    },
  });

  await prisma.trustProfile.upsert({
    where: { organisationId: buyerOrg.id },
    update: {
      trustScore: 55,
      scoreBreakdown: {
        profileCompleteness: 25,
        requiredDocuments: 0,
        verificationStatus: 30,
        memberKyc: 0,
        total: 55,
      },
      lastScoredAt: new Date(),
      deletedAt: null,
    },
    create: {
      organisationId: buyerOrg.id,
      trustScore: 55,
      scoreBreakdown: {
        profileCompleteness: 25,
        requiredDocuments: 0,
        verificationStatus: 30,
        memberKyc: 0,
        total: 55,
      },
      lastScoredAt: new Date(),
      createdBy: buyerUser.id,
    },
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 120);

  const existingCert = await prisma.complianceCertificate.findUnique({
    where: { reference: 'COO-SEED-001' },
  });
  if (!existingCert) {
    const cert = await prisma.complianceCertificate.create({
      data: {
        reference: 'COO-SEED-001',
        organisationId: exporterOrg.id,
        type: CertificateType.CERTIFICATE_OF_ORIGIN,
        title: 'Certificate of Origin — Arabica lot A',
        status: CertificateStatus.PENDING_APPROVAL,
        issuingCountry: 'KE',
        destinationCountry: 'NL',
        commodity: 'Arabica coffee',
        quantity: 50,
        unit: 'MT',
        expiresAt,
        submittedAt: new Date(),
        payload: {
          documentTitle: 'Certificate of Origin — Arabica lot A',
          organisationName: exporterOrg.name,
          type: 'CERTIFICATE_OF_ORIGIN',
          commodity: 'Arabica coffee',
          quantity: 50,
          unit: 'MT',
          issuingCountry: 'KE',
          destinationCountry: 'NL',
          clauses: [
            'The goods described herein originate from the stated country of origin.',
            'This certificate is issued for customs and trade compliance purposes.',
          ],
          generatedAt: new Date().toISOString(),
        },
        createdById: exporterUser.id,
        createdBy: exporterUser.id,
        updatedBy: exporterUser.id,
        approvals: {
          create: {
            status: ComplianceApprovalStatus.PENDING,
            createdBy: exporterUser.id,
          },
        },
      },
    });
    console.log(`  Seeded certificate ${cert.reference}`);
  }

  for (const org of [
    { org: exporterOrg, userId: exporterUser.id, balance: 25000 },
    { org: buyerOrg, userId: buyerUser.id, balance: 100000 },
  ]) {
    await prisma.wallet.upsert({
      where: {
        organisationId_currency: {
          organisationId: org.org.id,
          currency: 'USD',
        },
      },
      update: {
        availableBalance: org.balance,
        status: 'ACTIVE',
        deletedAt: null,
      },
      create: {
        organisationId: org.org.id,
        currency: 'USD',
        availableBalance: org.balance,
        heldBalance: 0,
        createdBy: org.userId,
        updatedBy: org.userId,
      },
    });
  }

  console.log('Seed complete:');
  console.log('  admin@koridor.io / Admin123!');
  console.log('  exporter@demo.koridor.io / Demo123!');
  console.log('  buyer@demo.koridor.io / Demo123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
