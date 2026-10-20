import { isRestrictedMarket } from "@/lib/sanctions";

export type CountryOption = {
  code: string;
  name: string;
  region: string;
};

/** Origin: Kenya and East Africa. Destinations: GCC, Europe, Asia (+ West Asia). */
export const COUNTRIES: CountryOption[] = [
  { code: "KE", name: "Kenya", region: "East Africa (origin)" },
  { code: "UG", name: "Uganda", region: "East Africa (origin)" },
  { code: "TZ", name: "Tanzania", region: "East Africa (origin)" },
  { code: "ET", name: "Ethiopia", region: "East Africa (origin)" },
  { code: "OM", name: "Oman", region: "Gulf (buyers)" },
  { code: "AE", name: "United Arab Emirates", region: "Gulf (buyers)" },
  { code: "SA", name: "Saudi Arabia", region: "Gulf (buyers)" },
  { code: "QA", name: "Qatar", region: "Gulf (buyers)" },
  { code: "BH", name: "Bahrain", region: "Gulf (buyers)" },
  { code: "KW", name: "Kuwait", region: "Gulf (buyers)" },
  // Restricted market (see lib/sanctions.ts): kept for name lookup, hidden from pickers.
  { code: "IR", name: "Iran", region: "Restricted (compliance review)" },
  { code: "IQ", name: "Iraq", region: "West Asia (buyers)" },
  { code: "NL", name: "Netherlands", region: "Europe (buyers)" },
  { code: "GB", name: "United Kingdom", region: "Europe (buyers)" },
  { code: "IT", name: "Italy", region: "Europe (buyers)" },
  { code: "DE", name: "Germany", region: "Europe (buyers)" },
  { code: "FR", name: "France", region: "Europe (buyers)" },
  { code: "ES", name: "Spain", region: "Europe (buyers)" },
  { code: "BE", name: "Belgium", region: "Europe (buyers)" },
  { code: "PL", name: "Poland", region: "Europe (buyers)" },
  { code: "CH", name: "Switzerland", region: "Europe (buyers)" },
  { code: "SE", name: "Sweden", region: "Europe (buyers)" },
  { code: "TR", name: "Türkiye", region: "Europe (buyers)" },
  { code: "IN", name: "India", region: "Asia (buyers)" },
  { code: "CN", name: "China", region: "Asia (buyers)" },
  { code: "JP", name: "Japan", region: "Asia (buyers)" },
  { code: "KR", name: "South Korea", region: "Asia (buyers)" },
  { code: "SG", name: "Singapore", region: "Asia (buyers)" },
  { code: "MY", name: "Malaysia", region: "Asia (buyers)" },
  { code: "HK", name: "Hong Kong", region: "Asia (buyers)" },
  { code: "PK", name: "Pakistan", region: "Asia (buyers)" },
  { code: "BD", name: "Bangladesh", region: "Asia (buyers)" },
  { code: "VN", name: "Vietnam", region: "Asia (buyers)" },
  { code: "EG", name: "Egypt", region: "Africa & Levant (buyers)" },
  { code: "JO", name: "Jordan", region: "Africa & Levant (buyers)" },
  { code: "LB", name: "Lebanon", region: "Africa & Levant (buyers)" },
  { code: "ZA", name: "South Africa", region: "Africa & Levant (buyers)" },
  { code: "NG", name: "Nigeria", region: "Africa & Levant (buyers)" },
  { code: "US", name: "United States", region: "Americas & Oceania (buyers)" },
  { code: "CA", name: "Canada", region: "Americas & Oceania (buyers)" },
  { code: "AU", name: "Australia", region: "Americas & Oceania (buyers)" },
];

export const KENYA_ORIGIN = "KE";

/** Legacy Gulf/West Asia focus (kept for Kenya directory filters). */
export const GULF_WEST_ASIA_BUYERS = ["OM", "IQ", "SA"] as const;

/** Primary V1 world destinations for Kenya export procurement. */
export const WORLD_BUYER_DESTINATIONS = [
  "AE",
  "SA",
  "OM",
  "NL",
  "GB",
  "IN",
  "IQ",
] as const;

/**
 * Destinations that require Halal + certificate of origin on the lot.
 * IR stays listed as a document rule only; trade there is blocked by
 * RESTRICTED_MARKETS unless a compliance override is set.
 */
export const GCC_FOOD_IMPORT = [
  "OM",
  "AE",
  "SA",
  "QA",
  "BH",
  "KW",
  "IR",
  "IQ",
] as const;

export const FEATURED_CORRIDORS = [
  {
    id: "KE-AE",
    origin: "KE",
    destination: "AE",
    title: "Kenya → UAE",
    ports: "Mombasa / Nairobi → Jebel Ali / Dubai",
    note: "Fresh produce, avocado, mango into GCC retail and food service.",
  },
  {
    id: "KE-SA",
    origin: "KE",
    destination: "SA",
    title: "Kenya → Saudi Arabia",
    ports: "Mombasa → Jeddah / Dammam",
    note: "Food-security offtake and wholesale horticulture.",
  },
  {
    id: "KE-OM",
    origin: "KE",
    destination: "OM",
    title: "Kenya → Oman",
    ports: "Mombasa → Sohar / Muscat",
    note: "Tea, avocado, coffee, and horticulture into GCC retail.",
  },
  {
    id: "KE-NL",
    origin: "KE",
    destination: "NL",
    title: "Kenya → Netherlands",
    ports: "Nairobi / Mombasa → Schiphol / Rotterdam",
    note: "Specialty produce and flowers into European wholesale.",
  },
  {
    id: "KE-GB",
    origin: "KE",
    destination: "GB",
    title: "Kenya → United Kingdom",
    ports: "Nairobi air / Mombasa sea → UK hubs",
    note: "Beans, avocado, and specialty horticulture.",
  },
  {
    id: "KE-IN",
    origin: "KE",
    destination: "IN",
    title: "Kenya → India",
    ports: "Mombasa → Mumbai / Nhava Sheva",
    note: "Pulses, oilseeds, and emerging fresh corridors.",
  },
] as const;

export const KENYA_PRODUCE = [
  "Avocado",
  "Arabica coffee",
  "Tea",
  "Macadamia",
  "Mango",
  "French beans",
  "Cut flowers",
  "Dried spices",
] as const;

export const GULF_INCOTERMS = ["FOB Mombasa", "CFR", "CIF", "DAP"] as const;

export function countryName(code?: string | null) {
  if (!code) return "";
  const hit = COUNTRIES.find((c) => c.code === code.toUpperCase());
  return hit?.name ?? code.toUpperCase();
}

export function corridorLabel(origin?: string | null, dest?: string | null) {
  if (!origin || !dest) return null;
  return `${origin.toUpperCase()}-${dest.toUpperCase()}`;
}

export function isGulfWestAsiaBuyer(code?: string | null) {
  if (!code) return false;
  return (GULF_WEST_ASIA_BUYERS as readonly string[]).includes(
    code.toUpperCase(),
  );
}

export function isWorldBuyerDestination(code?: string | null) {
  if (!code) return false;
  return (WORLD_BUYER_DESTINATIONS as readonly string[]).includes(
    code.toUpperCase(),
  );
}

export function isGulfFoodImport(code?: string | null) {
  if (!code) return false;
  return (GCC_FOOD_IMPORT as readonly string[]).includes(code.toUpperCase());
}

export function freightUsdPerKg(dest?: string | null) {
  const d = (dest ?? "").toUpperCase();
  if (["AE", "SA", "OM", "QA", "BH", "KW", "IR", "IQ"].includes(d)) return 0.35;
  if (["NL", "GB", "IT", "DE", "FR", "ES", "BE", "PL", "CH", "SE", "TR"].includes(d)) return 0.42;
  if (["IN", "CN", "PK", "BD"].includes(d)) return 0.4;
  if (["JP", "KR", "SG", "MY", "HK", "VN"].includes(d)) return 0.48;
  if (["US", "CA", "AU"].includes(d)) return 0.6;
  return 0.38;
}

/** Country picker groups. Restricted (sanctioned) markets are omitted by default. */
export function groupedCountries(opts?: { includeRestricted?: boolean }) {
  const groups = new Map<string, CountryOption[]>();
  for (const c of COUNTRIES) {
    if (!opts?.includeRestricted && isRestrictedMarket(c.code)) continue;
    const list = groups.get(c.region) ?? [];
    list.push(c);
    groups.set(c.region, list);
  }
  return Array.from(groups.entries());
}
