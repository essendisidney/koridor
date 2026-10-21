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
    title: "Sign up",
    caption: "Create your account and company profile",
  },
  {
    id: "verify",
    title: "Get verified",
    caption: "We check your business so others can trade with you",
  },
  {
    id: "negotiate",
    title: "Agree a deal",
    caption: "Request, compare offers and accept the best one",
  },
  {
    id: "execute",
    title: "Ship & get paid",
    caption: "Escrow, export documents and tracked delivery",
  },
];

export const START_PATHS = [
  {
    id: "buyer",
    href: "/register?role=BUYER",
    role: "BUYER",
    title: "I want to buy",
    body: "Importers, wholesalers and retailers anywhere. Post what you need and get offers from verified Kenyan farms.",
    cta: "Continue as a buyer",
  },
  {
    id: "farm",
    href: "/register?role=FARMER&country=KE",
    role: "FARMER",
    title: "I sell from my farm",
    body: "Large farms, estates and exporters in Kenya. List your harvest once and get matched to buyers by SMS.",
    cta: "Continue as a seller",
  },
  {
    id: "cooperative",
    href: "/register?role=COOPERATIVE&country=KE",
    role: "COOPERATIVE",
    title: "I run a cooperative",
    body: "Pool your members' volume to fill container-sized orders you couldn't win alone.",
    cta: "Continue as a co-op",
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
        "Live demand, open quote requests, deals and businesses waiting for verification.",
    };
  }
  switch (persona) {
    case "buyer":
      return {
        headline: "What are you looking to source?",
        blurb:
          "Tell us what you need. We match you with verified Kenyan farms, combine several farms for big orders, and collect their offers for you.",
      };
    case "chamber":
      return {
        headline: "Your chamber workspace",
        blurb:
          "Get your chamber verified, then list it so buyers can find the producer groups you vouch for.",
      };
    case "funder":
      return {
        headline: "Your finance desk",
        blurb:
          "See which trades are ready to finance and fund them against a signed contract.",
      };
    default:
      return {
        headline: "What are buyers looking for?",
        blurb:
          "See buyers looking for what you grow, list your harvest, and reply to quote requests, all from your phone.",
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
