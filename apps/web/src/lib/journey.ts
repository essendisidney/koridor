/** Shared CropChain corridor path — same four phases from landing through the workspace. */

export type Persona = "buyer" | "supplier" | "chamber" | "funder";

export type PhaseId = "connect" | "verify" | "negotiate" | "execute";

export type PhaseStatus = "complete" | "current" | "upcoming";

export type JourneyPhase = {
  id: PhaseId;
  title: string;
  caption: string;
  status: PhaseStatus;
};

export const JOURNEY_PHASES: {
  id: PhaseId;
  title: string;
  caption: string;
}[] = [
  {
    id: "connect",
    title: "Connect",
    caption: "Account and organisation on the Kenya–GCC corridor",
  },
  {
    id: "verify",
    title: "Verify",
    caption: "KYB so the lot can be contracted and financed",
  },
  {
    id: "negotiate",
    title: "Negotiate",
    caption: "Dated offtake — order before Kenyan farmers plant",
  },
  {
    id: "execute",
    title: "Execute",
    caption: "One Trade Passport through shipping and settlement",
  },
];

export const START_PATHS = [
  {
    id: "buyer",
    href: "/register?role=BUYER&country=OM",
    role: "BUYER",
    country: "OM",
    title: "I buy from Kenya",
    body: "GCC or Iranian importer. Publish a dated offtake, then Kenyan cooperatives fulfil it.",
    cta: "Continue as buyer",
  },
  {
    id: "supplier",
    href: "/register?role=COOPERATIVE&country=KE",
    role: "COOPERATIVE",
    country: "KE",
    title: "I supply from Kenya",
    body: "Cooperative, exporter, or producer group. Verify, list, and answer a locked Gulf order.",
    cta: "Continue as cooperative",
  },
  {
    id: "chamber",
    href: "/register?role=CHAMBER_OF_COMMERCE&country=KE",
    role: "CHAMBER_OF_COMMERCE",
    country: "KE",
    title: "I am a chamber partner",
    body: "Vet Kenyan producer groups county by county. You are not 700,000 individual farmers.",
    cta: "Continue as chamber",
  },
] as const;

export function orgTypeFromRoles(roles: string[]) {
  if (roles.includes("BUYER")) return "BUYER";
  if (roles.includes("COOPERATIVE")) return "COOPERATIVE";
  if (roles.includes("FARMER")) return "FARMER";
  if (roles.includes("CHAMBER_OF_COMMERCE")) return "CHAMBER_OF_COMMERCE";
  if (roles.includes("BANK")) return "BANK";
  if (roles.includes("LOGISTICS_PROVIDER")) return "LOGISTICS_PROVIDER";
  return "EXPORTER";
}

export function personaFrom(roles: string[], orgType?: string | null): Persona {
  const type = (orgType ?? "").toUpperCase();
  if (type === "BUYER" || roles.includes("BUYER")) return "buyer";
  if (type === "CHAMBER_OF_COMMERCE" || roles.includes("CHAMBER_OF_COMMERCE")) {
    return "chamber";
  }
  if (type === "BANK" || roles.includes("BANK") || roles.includes("INSURANCE")) {
    return "funder";
  }
  return "supplier";
}

export function postAuthPath(user: {
  organisationId?: string | null;
  roles: string[];
}) {
  if (!user.organisationId) {
    return `/onboarding/organisation?type=${orgTypeFromRoles(user.roles)}`;
  }
  return "/dashboard";
}

export function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.startsWith("/login") || raw.startsWith("/register")) return null;
  return raw;
}

export type WorkspaceMetric = {
  label: string;
  value: string | number;
  href?: string;
};

export type WorkspaceHighlight = {
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
};

export type WorkspaceView = {
  headline: string;
  subhead: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  metrics: WorkspaceMetric[];
  highlights: WorkspaceHighlight[];
};

export function personaCopy(persona: Persona, isAdmin = false) {
  if (isAdmin) {
    return {
      headline: "What needs attention?",
      blurb:
        "Live demand, open RFQs, deal rooms, and verification queues across the corridor.",
    };
  }
  switch (persona) {
    case "buyer":
      return {
        headline: "What are you looking to source?",
        blurb:
          "Post a structured buying requirement. Koridor will match Kenyan supply, aggregate capacity, and issue RFQs.",
      };
    case "chamber":
      return {
        headline: "Your chamber workspace",
        blurb:
          "Verify this chamber, then list so Kenyan cooperatives can be found by Gulf buyers.",
      };
    case "funder":
      return {
        headline: "Your corridor finance desk",
        blurb:
          "Read bankability and fund or issue in-kind credit against a locked passport — not a side transfer.",
      };
    default:
      return {
        headline: "What are buyers looking for?",
        blurb:
          "Browse verified international demand, declare supply lots, and respond to RFQs from one mobile-first workspace.",
      };
  }
}

export function buyerWorkspace(
  stats: {
    requirements: number;
    matches: number;
    openRfqs: number;
    deals: number;
  },
  highlights: WorkspaceHighlight[],
): WorkspaceView {
  return {
    headline: "What are you looking to source?",
    subhead:
      "Tell Koridor what you need — product, quantity, destination, and delivery window.",
    primaryCta: {
      label: "+ Post buying requirement",
      href: "/dashboard/requirements/new",
    },
    secondaryCta: {
      label: "View my requirements",
      href: "/dashboard/requirements",
    },
    metrics: [
      { label: "Active requirements", value: stats.requirements, href: "/dashboard/requirements" },
      { label: "Matched supply", value: stats.matches, href: "/dashboard/requirements" },
      { label: "Open RFQs", value: stats.openRfqs, href: "/dashboard/rfqs" },
      { label: "Active deals", value: stats.deals, href: "/dashboard/deals" },
    ],
    highlights,
  };
}

export function supplierWorkspace(
  stats: {
    supplyLots: number;
    openDemand: number;
    offers: number;
    deals: number;
  },
  highlights: WorkspaceHighlight[],
): WorkspaceView {
  return {
    headline: "What are buyers looking for?",
    subhead:
      "Verified demand from GCC and global buyers. Declare capacity and respond to RFQs.",
    primaryCta: {
      label: "+ Add supply",
      href: "/dashboard/supply",
    },
    secondaryCta: {
      label: "See all buyer demand",
      href: "/dashboard/demand",
    },
    metrics: [
      { label: "Supply lots", value: stats.supplyLots, href: "/dashboard/supply" },
      { label: "Live buyer demand", value: stats.openDemand, href: "/dashboard/demand" },
      { label: "Your offers", value: stats.offers, href: "/dashboard/rfqs" },
      { label: "Active deals", value: stats.deals, href: "/dashboard/deals" },
    ],
    highlights,
  };
}

export function adminWorkspace(
  stats: {
    requirements: number;
    openRfqs: number;
    deals: number;
    verificationQueue: number;
    supplyLots: number;
  },
): WorkspaceView {
  return {
    headline: "What needs attention?",
    subhead: "Corridor pipeline, verification queue, and operational exceptions.",
    primaryCta: {
      label: "Open Control Tower",
      href: "/dashboard/admin",
    },
    secondaryCta: {
      label: "Verification queue",
      href: "/dashboard/reviews",
    },
    metrics: [
      { label: "Live requirements", value: stats.requirements, href: "/dashboard/requirements" },
      { label: "Open RFQs", value: stats.openRfqs, href: "/dashboard/rfqs" },
      { label: "Deal rooms", value: stats.deals, href: "/dashboard/deals" },
      {
        label: "Verification queue",
        value: stats.verificationQueue,
        href: "/dashboard/reviews",
      },
      { label: "Supply lots", value: stats.supplyLots, href: "/dashboard/supply" },
    ],
    highlights: [],
  };
}
