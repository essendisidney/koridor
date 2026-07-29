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

  const existingTrade = await prisma.trade.findUnique({
    where: { tradeNumber: 'TRD-SEED-001' },
  });
  if (!existingTrade) {
    const trade = await prisma.trade.create({
      data: {
        tradeNumber: 'TRD-SEED-001',
        status: 'CONTRACTED',
        currentStage: 'Contract Signed',
        buyerOrgId: buyerOrg.id,
        sellerOrgId: exporterOrg.id,
        title: 'Arabica coffee corridor KE→NL',
        commodity: 'Arabica coffee',
        quantity: 50,
        unit: 'MT',
        value: 125000,
        currency: 'USD',
        originCountry: 'KE',
        destinationCountry: 'NL',
        corridor: 'KE-NL',
        incoterms: 'FOB',
        ownerId: buyerUser.id,
        trustScore: 78,
        riskScore: 32,
        completionPct: 23,
        createdBy: buyerUser.id,
        updatedBy: buyerUser.id,
        participants: {
          create: [
            {
              organisationId: buyerOrg.id,
              role: 'BUYER',
              createdBy: buyerUser.id,
            },
            {
              organisationId: exporterOrg.id,
              role: 'SUPPLIER',
              createdBy: buyerUser.id,
            },
          ],
        },
      },
    });

    const milestoneDefs = [
      {
        code: 'BUYER_VERIFIED',
        title: 'Buyer Verified',
        sequence: 1,
        requiredEvidenceTypes: [] as string[],
        dependsOnCodes: [] as string[],
        status: 'COMPLETED' as const,
      },
      {
        code: 'SUPPLIER_VERIFIED',
        title: 'Supplier Verified',
        sequence: 2,
        requiredEvidenceTypes: [],
        dependsOnCodes: [],
        status: 'COMPLETED' as const,
      },
      {
        code: 'CONTRACT_SIGNED',
        title: 'Contract Signed',
        sequence: 3,
        requiredEvidenceTypes: ['CONTRACT_PDF', 'DIGITAL_SIGNATURE'],
        dependsOnCodes: ['BUYER_VERIFIED', 'SUPPLIER_VERIFIED'],
        status: 'COMPLETED' as const,
      },
      {
        code: 'DEPOSIT_RECEIVED',
        title: 'Deposit Received',
        sequence: 4,
        requiredEvidenceTypes: ['PAYMENT_PROOF'],
        dependsOnCodes: ['CONTRACT_SIGNED'],
        status: 'PENDING' as const,
      },
      {
        code: 'PRODUCTION_STARTED',
        title: 'Production Started',
        sequence: 5,
        requiredEvidenceTypes: [],
        dependsOnCodes: ['CONTRACT_SIGNED'],
        status: 'PENDING' as const,
      },
      {
        code: 'PRODUCTION_COMPLETE',
        title: 'Production Complete',
        sequence: 6,
        requiredEvidenceTypes: [],
        dependsOnCodes: ['PRODUCTION_STARTED'],
        status: 'PENDING' as const,
      },
      {
        code: 'INSPECTION_PASSED',
        title: 'Inspection Passed',
        sequence: 7,
        requiredEvidenceTypes: ['INSPECTION_REPORT'],
        dependsOnCodes: ['PRODUCTION_COMPLETE'],
        status: 'PENDING' as const,
      },
      {
        code: 'CERTIFICATE_APPROVED',
        title: 'Certificate Approved',
        sequence: 8,
        requiredEvidenceTypes: ['CERTIFICATE'],
        dependsOnCodes: ['INSPECTION_PASSED'],
        status: 'PENDING' as const,
      },
      {
        code: 'SHIPMENT_BOOKED',
        title: 'Shipment Booked',
        sequence: 9,
        requiredEvidenceTypes: ['BILL_OF_LADING'],
        dependsOnCodes: ['CERTIFICATE_APPROVED'],
        status: 'PENDING' as const,
      },
      {
        code: 'BORDER_EXIT',
        title: 'Border Exit',
        sequence: 10,
        requiredEvidenceTypes: [],
        dependsOnCodes: ['SHIPMENT_BOOKED'],
        status: 'PENDING' as const,
      },
      {
        code: 'BORDER_ENTRY',
        title: 'Border Entry',
        sequence: 11,
        requiredEvidenceTypes: [],
        dependsOnCodes: ['BORDER_EXIT'],
        status: 'PENDING' as const,
      },
      {
        code: 'DELIVERED',
        title: 'Delivered',
        sequence: 12,
        requiredEvidenceTypes: ['PROOF_OF_DELIVERY'],
        dependsOnCodes: ['BORDER_ENTRY'],
        status: 'PENDING' as const,
      },
      {
        code: 'SETTLEMENT_COMPLETE',
        title: 'Settlement Complete',
        sequence: 13,
        requiredEvidenceTypes: ['PAYMENT_PROOF'],
        dependsOnCodes: ['DELIVERED'],
        status: 'PENDING' as const,
      },
      {
        code: 'CLOSED',
        title: 'Closed',
        sequence: 14,
        requiredEvidenceTypes: [],
        dependsOnCodes: ['SETTLEMENT_COMPLETE'],
        status: 'PENDING' as const,
      },
    ];

    for (const m of milestoneDefs) {
      await prisma.tradeMilestone.create({
        data: {
          tradeId: trade.id,
          code: m.code,
          title: m.title,
          sequence: m.sequence,
          requiredEvidenceTypes: m.requiredEvidenceTypes,
          dependsOnCodes: m.dependsOnCodes,
          status: m.status,
          completedAt: m.status === 'COMPLETED' ? new Date() : null,
          ownerOrgId:
            m.code.startsWith('BUYER') || m.code === 'DEPOSIT_RECEIVED'
              ? buyerOrg.id
              : exporterOrg.id,
          createdBy: buyerUser.id,
          updatedBy: buyerUser.id,
        },
      });
    }

    const contractMs = await prisma.tradeMilestone.findFirst({
      where: { tradeId: trade.id, code: 'CONTRACT_SIGNED' },
    });
    await prisma.tradeEvidence.createMany({
      data: [
        {
          tradeId: trade.id,
          milestoneId: contractMs?.id,
          type: 'CONTRACT_PDF',
          title: 'Signed contract PDF (seed)',
          referenceRef: 'CTR-SEED-001',
          actorId: buyerUser.id,
          createdBy: buyerUser.id,
        },
        {
          tradeId: trade.id,
          milestoneId: contractMs?.id,
          type: 'DIGITAL_SIGNATURE',
          title: 'Dual party signatures (seed)',
          referenceRef: 'CTR-SEED-001',
          actorId: buyerUser.id,
          createdBy: buyerUser.id,
        },
      ],
    });

    await prisma.tradeEvent.create({
      data: {
        tradeId: trade.id,
        type: 'TRADE_CREATED',
        message: 'Seed Trade Passport TRD-SEED-001 created (E2E demo)',
        actorId: buyerUser.id,
        createdBy: buyerUser.id,
      },
    });

    console.log('  Seeded trade TRD-SEED-001 with full milestones + contract evidence');
  } else {
    // Upgrade thin seed trades to the full milestone template when missing.
    const count = await prisma.tradeMilestone.count({
      where: { tradeId: existingTrade.id, deletedAt: null },
    });
    if (count < 10) {
      const codes = [
        'BUYER_VERIFIED',
        'SUPPLIER_VERIFIED',
        'CONTRACT_SIGNED',
        'DEPOSIT_RECEIVED',
        'PRODUCTION_STARTED',
        'PRODUCTION_COMPLETE',
        'INSPECTION_PASSED',
        'CERTIFICATE_APPROVED',
        'SHIPMENT_BOOKED',
        'BORDER_EXIT',
        'BORDER_ENTRY',
        'DELIVERED',
        'SETTLEMENT_COMPLETE',
        'CLOSED',
      ];
      let seq = 1;
      for (const code of codes) {
        await prisma.tradeMilestone.upsert({
          where: {
            tradeId_code: { tradeId: existingTrade.id, code },
          },
          update: { deletedAt: null },
          create: {
            tradeId: existingTrade.id,
            code,
            title: code
              .split('_')
              .map((w) => w[0] + w.slice(1).toLowerCase())
              .join(' '),
            sequence: seq,
            status:
              code === 'BUYER_VERIFIED' || code === 'SUPPLIER_VERIFIED'
                ? 'COMPLETED'
                : 'PENDING',
            completedAt:
              code === 'BUYER_VERIFIED' || code === 'SUPPLIER_VERIFIED'
                ? new Date()
                : null,
            createdBy: buyerUser.id,
            updatedBy: buyerUser.id,
          },
        });
        seq += 1;
      }
      console.log('  Upgraded TRD-SEED-001 milestones');
    }
  }

  const defaultFlags = [
    {
      key: 'analytics_v1',
      name: 'Analytics dashboard',
      description: 'Trade / corridor / risk analytics UI',
      enabled: true,
    },
    {
      key: 'ai_assistant_v1',
      name: 'AI assistant',
      description: 'Heuristic + optional OpenAI assistant',
      enabled: true,
    },
    {
      key: 'strict_evidence',
      name: 'Strict evidence mode',
      description: 'Gate milestone completion on TradeEvidence',
      enabled: true,
    },
    {
      key: 'finance_escrow',
      name: 'Finance escrow',
      description: 'Wallet hold/release escrow flows',
      enabled: true,
    },
  ];
  for (const f of defaultFlags) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: {
        name: f.name,
        description: f.description,
        enabled: f.enabled,
        deletedAt: null,
      },
      create: {
        key: f.key,
        name: f.name,
        description: f.description,
        enabled: f.enabled,
        percentage: 100,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
  }
  console.log('  Seeded feature flags');

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
