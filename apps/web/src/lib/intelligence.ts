import { FEATURED_CORRIDORS, countryName } from "@/lib/corridors";

/** Curated intelligence — not live market prices. Explicitly labelled. */
export type IntelligenceBrief = {
  id: string;
  product: string;
  origin: string;
  destination: string;
  signal: "HIGH_DEMAND" | "BALANCED" | "SUPPLY_GAP" | "WATCH";
  demandNote: string;
  supplyNote: string;
  recommendation: string;
  curated: true;
};

export type IntelligenceSection = {
  id: string;
  title: string;
  blurb: string;
};

export const INTELLIGENCE_SECTIONS: IntelligenceSection[] = [
  {
    id: "overview",
    title: "Market overview",
    blurb:
      "Curated corridor briefs for Kenya export into GCC, Europe, and Asia. Not live price feeds.",
  },
  {
    id: "demand",
    title: "Demand",
    blurb: "Where verified buyers are asking Koridor to source.",
  },
  {
    id: "supply",
    title: "Supply",
    blurb: "Kenyan capacity themes by product and season.",
  },
  {
    id: "opportunities",
    title: "Opportunities",
    blurb: "Gaps between published demand and declared supply.",
  },
];

export const CURATED_BRIEFS: IntelligenceBrief[] = [
  {
    id: "avo-sa",
    product: "Hass Avocado",
    origin: "KE",
    destination: "SA",
    signal: "HIGH_DEMAND",
    demandNote:
      "Saudi food-service and wholesale offtake for Grade A Hass remains the strongest V1 demand theme.",
    supplyNote:
      "Kenyan harvest windows cluster Nov–Mar; GlobalG.A.P. capacity is the binding constraint.",
    recommendation:
      "Recruit additional verified Kenyan lots and aggregate partial matches into RFQs.",
    curated: true,
  },
  {
    id: "avo-ae",
    product: "Hass Avocado",
    origin: "KE",
    destination: "AE",
    signal: "BALANCED",
    demandNote: "UAE retail and re-export demand into wider GCC.",
    supplyNote: "Exporters with Jebel Ali experience and CIF quotes convert faster.",
    recommendation: "Prioritise listed registry exporters with UAE shipment history.",
    curated: true,
  },
  {
    id: "mango-om",
    product: "Mango",
    origin: "KE",
    destination: "OM",
    signal: "SUPPLY_GAP",
    demandNote: "Omani importers seek seasonal mango with phytosanitary readiness.",
    supplyNote: "Declared lots trail published demand in seed corridors.",
    recommendation: "Run a sourcing campaign for export-eligible mango cooperatives.",
    curated: true,
  },
  {
    id: "mac-nl",
    product: "Macadamia",
    origin: "KE",
    destination: "NL",
    signal: "WATCH",
    demandNote: "European processors source kernel and in-shell via Rotterdam.",
    supplyNote: "Quality and moisture specs matter more than lowest price.",
    recommendation: "Build future-supply calendars before committing annual RFQs.",
    curated: true,
  },
  {
    id: "coffee-gb",
    product: "Coffee",
    origin: "KE",
    destination: "GB",
    signal: "BALANCED",
    demandNote: "Specialty and AA grades into UK roasters.",
    supplyNote: "Traceability and lot identity drive trust scores.",
    recommendation: "Attach inspection and origin evidence early on the passport.",
    curated: true,
  },
  {
    id: "beans-in",
    product: "French Beans",
    origin: "KE",
    destination: "IN",
    signal: "WATCH",
    demandNote: "Asia corridor demand is exploratory in V1.",
    supplyNote: "Air-freight vegetables need tight harvest-to-ship windows.",
    recommendation: "Treat as opportunistic until verified demand volume is confirmed.",
    curated: true,
  },
];

export function intelligenceCorridorCards() {
  return FEATURED_CORRIDORS.map((c) => ({
    ...c,
    originName: countryName(c.origin),
    destinationName: countryName(c.destination),
  }));
}

export function signalLabel(signal: IntelligenceBrief["signal"]) {
  switch (signal) {
    case "HIGH_DEMAND":
      return "High demand";
    case "SUPPLY_GAP":
      return "Supply gap";
    case "WATCH":
      return "Watch";
    default:
      return "Balanced";
  }
}
