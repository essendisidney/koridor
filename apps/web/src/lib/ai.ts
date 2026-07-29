import {
  AiInsightKind,
  AiJobStatus,
  AiJobType,
  Prisma,
  TradeStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type InsightDraft = {
  kind: AiInsightKind;
  title: string;
  body: string;
  severity?: string;
  score?: number;
  metadata?: Prisma.InputJsonValue;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

async function maybePersistJob(input: {
  organisationId?: string | null;
  tradeId?: string | null;
  documentId?: string | null;
  type: AiJobType;
  prompt?: string | null;
  actorId?: string;
  insights: InsightDraft[];
  result: Prisma.InputJsonValue;
  model?: string;
}) {
  try {
    const job = await prisma.aiJob.create({
      data: {
        organisationId: input.organisationId ?? null,
        tradeId: input.tradeId ?? null,
        documentId: input.documentId ?? null,
        type: input.type,
        status: AiJobStatus.COMPLETED,
        prompt: input.prompt ?? null,
        result: input.result,
        model: input.model ?? "koridor-heuristic-v1",
        startedAt: new Date(),
        completedAt: new Date(),
        createdBy: input.actorId,
        updatedBy: input.actorId,
        insights: {
          create: input.insights.map((i) => ({
            kind: i.kind,
            title: i.title,
            body: i.body,
            severity: i.severity ?? "info",
            score: i.score ?? null,
            metadata: i.metadata,
          })),
        },
      },
      include: { insights: true },
    });
    return job;
  } catch (error) {
    console.warn(
      "[ai] persist skipped:",
      error instanceof Error ? error.message : error,
    );
    return {
      id: "ephemeral",
      type: input.type,
      status: AiJobStatus.COMPLETED,
      model: input.model ?? "koridor-heuristic-v1",
      result: input.result,
      insights: input.insights.map((i, idx) => ({
        id: `e-${idx}`,
        ...i,
        severity: i.severity ?? "info",
      })),
    };
  }
}

export async function analyzeDocument(input: {
  organisationId: string;
  documentId: string;
  actorId?: string;
}) {
  const doc = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      organisationId: input.organisationId,
      deletedAt: null,
    },
  });
  if (!doc) throw new Error("Document not found");

  const insights: InsightDraft[] = [
    {
      kind: AiInsightKind.SUMMARY,
      title: "Document summary",
      body: `${doc.type.replaceAll("_", " ")} “${doc.fileName}” (${doc.status}) is on file for this organisation.`,
      severity: "info",
    },
  ];

  if (!doc.fileName?.trim()) {
    insights.push({
      kind: AiInsightKind.MISSING_FIELD,
      title: "Missing file name",
      body: "Document record has no file name; re-upload may improve auditability.",
      severity: "warn",
    });
  }

  if (doc.status === "REJECTED") {
    insights.push({
      kind: AiInsightKind.COMPLIANCE,
      title: "Document rejected",
      body: "This document was rejected. Upload a corrected version before using it in KYB or trade evidence.",
      severity: "high",
      score: 80,
    });
  } else if (doc.status === "PENDING") {
    insights.push({
      kind: AiInsightKind.COMPLIANCE,
      title: "Awaiting review",
      body: "Document is still PENDING. Approval is required before it strengthens trust score.",
      severity: "warn",
      score: 40,
    });
  }

  if (doc.type === "TRADE_LICENSE" || doc.type === "TAX_CERTIFICATE") {
    insights.push({
      kind: AiInsightKind.NEXT_ACTION,
      title: "Link to verification",
      body: "Ensure this document is attached to the organisation KYB case and marked APPROVED.",
      severity: "info",
    });
  }

  const score = clamp(
    20 +
      insights.filter((i) => i.severity === "high").length * 35 +
      insights.filter((i) => i.severity === "warn").length * 15,
  );

  const result = {
    documentId: doc.id,
    type: doc.type,
    riskScore: score,
    insightCount: insights.length,
  };

  return maybePersistJob({
    organisationId: input.organisationId,
    documentId: doc.id,
    type: AiJobType.DOCUMENT_ANALYSIS,
    actorId: input.actorId,
    insights,
    result,
  });
}

export async function scoreTradeRisk(input: {
  organisationId: string;
  tradeId: string;
  actorId?: string;
}) {
  const trade = await prisma.trade.findFirst({
    where: {
      id: input.tradeId,
      deletedAt: null,
      OR: [
        { buyerOrgId: input.organisationId },
        { sellerOrgId: input.organisationId },
        {
          participants: {
            some: { organisationId: input.organisationId, deletedAt: null },
          },
        },
      ],
    },
    include: {
      buyerOrg: { select: { verificationStatus: true, name: true } },
      sellerOrg: { select: { verificationStatus: true, name: true } },
      milestones: {
        where: { deletedAt: null },
        include: { evidence: { where: { deletedAt: null } } },
      },
      certificates: { where: { deletedAt: null, status: "APPROVED" }, take: 5 },
      contracts: {
        where: { deletedAt: null },
        include: {
          escrowRequests: { where: { deletedAt: null }, take: 3 },
          shipmentRequests: {
            where: { deletedAt: null },
            include: { shipment: true },
            take: 3,
          },
        },
        take: 1,
      },
    },
  });
  if (!trade) throw new Error("Trade not found");

  const insights: InsightDraft[] = [];
  let score = trade.riskScore || 40;

  if (trade.buyerOrg.verificationStatus !== "VERIFIED") {
    score += 15;
    insights.push({
      kind: AiInsightKind.RISK_FLAG,
      title: "Buyer not verified",
      body: `${trade.buyerOrg.name} is not VERIFIED. KYB completion reduces counterparty risk.`,
      severity: "high",
      score: 70,
    });
  }
  if (trade.sellerOrg && trade.sellerOrg.verificationStatus !== "VERIFIED") {
    score += 15;
    insights.push({
      kind: AiInsightKind.RISK_FLAG,
      title: "Supplier not verified",
      body: `${trade.sellerOrg.name} is not VERIFIED.`,
      severity: "high",
      score: 70,
    });
  }

  const missingEvidence = trade.milestones.filter((m) => {
    if (!m.requiredEvidenceTypes.length) return false;
    const have = new Set(m.evidence.map((e) => String(e.type)));
    return m.requiredEvidenceTypes.some((t) => !have.has(String(t)));
  });
  if (missingEvidence.length) {
    score += Math.min(25, missingEvidence.length * 4);
    insights.push({
      kind: AiInsightKind.MISSING_FIELD,
      title: "Evidence gaps",
      body: `${missingEvidence.length} milestone(s) still lack required evidence types.`,
      severity: "warn",
      score: 55,
      metadata: { codes: missingEvidence.map((m) => m.code) },
    });
  }

  if (trade.certificates.length === 0) {
    score += 10;
    insights.push({
      kind: AiInsightKind.COMPLIANCE,
      title: "No approved certificates",
      body: "Attach and approve at least one compliance certificate before shipping.",
      severity: "warn",
      score: 50,
    });
  }

  const contract = trade.contracts[0];
  const funded = contract?.escrowRequests.some(
    (e) => e.status === "FUNDED" || e.status === "RELEASED",
  );
  if (contract && !funded && trade.status !== TradeStatus.DRAFT) {
    score += 8;
    insights.push({
      kind: AiInsightKind.NEXT_ACTION,
      title: "Fund escrow",
      body: "Contract exists but escrow is not funded — settlement risk remains open.",
      severity: "warn",
    });
  }

  const shipment = contract?.shipmentRequests.map((s) => s.shipment).find(Boolean);
  if (
    (trade.status === TradeStatus.READY_TO_SHIP ||
      trade.status === TradeStatus.IN_TRANSIT ||
      trade.status === TradeStatus.AT_BORDER) &&
    !shipment
  ) {
    score += 10;
    insights.push({
      kind: AiInsightKind.NEXT_ACTION,
      title: "Book shipment",
      body: "Trade is past production/compliance but no shipment is booked.",
      severity: "warn",
    });
  }

  score = clamp(score);
  insights.unshift({
    kind: AiInsightKind.SUMMARY,
    title: "Trade risk overview",
    body: `${trade.tradeNumber} (${trade.status}) — estimated risk ${score}/100. Completion ${trade.completionPct}%.`,
    severity: score >= 70 ? "high" : score >= 45 ? "warn" : "info",
    score,
  });

  const result = {
    tradeId: trade.id,
    tradeNumber: trade.tradeNumber,
    riskScore: score,
    status: trade.status,
    completionPct: trade.completionPct,
  };

  // Best-effort write-back to trade riskScore
  try {
    await prisma.trade.update({
      where: { id: trade.id },
      data: { riskScore: score, updatedBy: input.actorId },
    });
  } catch {
    /* ignore */
  }

  return maybePersistJob({
    organisationId: input.organisationId,
    tradeId: trade.id,
    type: AiJobType.TRADE_RISK,
    actorId: input.actorId,
    insights,
    result,
  });
}

export async function askAssistant(input: {
  organisationId: string;
  actorId?: string;
  prompt: string;
  tradeId?: string | null;
}) {
  const q = input.prompt.trim().toLowerCase();
  const insights: InsightDraft[] = [];

  if (!q) throw new Error("prompt is required");

  if (q.includes("risk") && input.tradeId) {
    const scored = await scoreTradeRisk({
      organisationId: input.organisationId,
      tradeId: input.tradeId,
      actorId: input.actorId,
    });
    return scored;
  }

  if (q.includes("readiness") || q.includes("milestone") || q.includes("evidence")) {
    insights.push({
      kind: AiInsightKind.ANSWER,
      title: "Evidence-gated readiness",
      body: "Milestones complete only when dependencies are done and required TradeEvidence rows exist. Use Trade Workspace → Attach evidence, or let sync materialize evidence from contracts, escrow, certificates, and PoD.",
      severity: "info",
    });
  } else if (q.includes("escrow") || q.includes("wallet") || q.includes("finance")) {
    insights.push({
      kind: AiInsightKind.ANSWER,
      title: "Finance path",
      body: "Top up the organisation wallet, open escrow from a contract escrow request, fund to hold balances, then release after delivery/settlement milestones.",
      severity: "info",
    });
  } else if (q.includes("certificate") || q.includes("compliance")) {
    insights.push({
      kind: AiInsightKind.ANSWER,
      title: "Compliance path",
      body: "Create a certificate linked to the contract (inherits tradeId), submit for approval, then government/chamber review. Approved certs unlock CERTIFICATE_APPROVED evidence.",
      severity: "info",
    });
  } else if (q.includes("shipment") || q.includes("logistics") || q.includes("pod")) {
    insights.push({
      kind: AiInsightKind.ANSWER,
      title: "Logistics path",
      body: "Create a shipment from a shipment request, book → depart → track → deliver with PoD. Delivery materializes PROOF_OF_DELIVERY evidence on the Trade Passport.",
      severity: "info",
    });
  } else {
    insights.push({
      kind: AiInsightKind.ANSWER,
      title: "Koridor assistant",
      body: "I can help with trade risk scoring, evidence/readiness, escrow, compliance certificates, and logistics. Ask about a specific trade or paste a keyword like “risk”, “escrow”, or “certificate”.",
      severity: "info",
    });
    insights.push({
      kind: AiInsightKind.NEXT_ACTION,
      title: "Try next",
      body: "Open Analytics for KPIs, or run “Score trade risk” from the AI page with a trade id.",
      severity: "info",
    });
  }

  // Optional OpenAI enrichment
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  let model = "koridor-heuristic-v1";
  if (apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Koridor's trade ops assistant. Be concise (max 120 words). Focus on cross-border trade, evidence, escrow, compliance, logistics.",
            },
            { role: "user", content: input.prompt },
          ],
          temperature: 0.2,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content) {
          model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
          insights.unshift({
            kind: AiInsightKind.ANSWER,
            title: "LLM answer",
            body: content,
            severity: "info",
          });
        }
      }
    } catch (error) {
      console.warn(
        "[ai] openai skipped:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return maybePersistJob({
    organisationId: input.organisationId,
    tradeId: input.tradeId ?? null,
    type: AiJobType.ASSISTANT,
    prompt: input.prompt,
    actorId: input.actorId,
    insights,
    result: { prompt: input.prompt },
    model,
  });
}

export async function listAiJobs(organisationId: string, take = 20) {
  try {
    return await prisma.aiJob.findMany({
      where: { organisationId, deletedAt: null },
      include: { insights: { where: { deletedAt: null } } },
      orderBy: { createdAt: "desc" },
      take,
    });
  } catch {
    return [];
  }
}
