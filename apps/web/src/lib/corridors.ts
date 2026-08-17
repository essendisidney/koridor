export type CountryOption = {
  code: string;
  name: string;
  region: string;
};

/** Origin: Kenya and East African supply. Destinations: Oman, Iran, Iraq first. */
export const COUNTRIES: CountryOption[] = [
  { code: "KE", name: "Kenya", region: "East Africa (origin)" },
  { code: "UG", name: "Uganda", region: "East Africa (origin)" },
  { code: "TZ", name: "Tanzania", region: "East Africa (origin)" },
  { code: "ET", name: "Ethiopia", region: "East Africa (origin)" },
  { code: "OM", name: "Oman", region: "Gulf & West Asia (buyers)" },
  { code: "IR", name: "Iran", region: "Gulf & West Asia (buyers)" },
  { code: "IQ", name: "Iraq", region: "Gulf & West Asia (buyers)" },
  { code: "AE", name: "United Arab Emirates", region: "Gulf & West Asia (buyers)" },
  { code: "SA", name: "Saudi Arabia", region: "Gulf & West Asia (buyers)" },
  { code: "QA", name: "Qatar", region: "Gulf & West Asia (buyers)" },
  { code: "BH", name: "Bahrain", region: "Gulf & West Asia (buyers)" },
  { code: "KW", name: "Kuwait", region: "Gulf & West Asia (buyers)" },
];

export const KENYA_ORIGIN = "KE";

export const GULF_WEST_ASIA_BUYERS = ["OM", "IR", "IQ"] as const;

export const FEATURED_CORRIDORS = [
  {
    id: "KE-OM",
    origin: "KE",
    destination: "OM",
    title: "Kenya → Oman",
    ports: "Mombasa / Nairobi cargo → Sohar / Muscat",
    note: "Tea, avocado, coffee, and horticulture into GCC retail and food service.",
  },
  {
    id: "KE-IR",
    origin: "KE",
    destination: "IR",
    title: "Kenya → Iran",
    ports: "Mombasa → Bandar Abbas",
    note: "Coffee, tea, and oilseeds with Halal and certificate of origin.",
  },
  {
    id: "KE-IQ",
    origin: "KE",
    destination: "IQ",
    title: "Kenya → Iraq",
    ports: "Mombasa → Umm Qasr (via Jebel Ali or Bandar Abbas)",
    note: "Staples and fresh produce for wholesale importers.",
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

export function groupedCountries() {
  const groups = new Map<string, CountryOption[]>();
  for (const c of COUNTRIES) {
    const list = groups.get(c.region) ?? [];
    list.push(c);
    groups.set(c.region, list);
  }
  return Array.from(groups.entries());
}
