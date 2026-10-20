export type Product = {
  slug: string;
  name: string;
  /** Terms used to find matching lots/requirements by commodity name. */
  match: string[];
  varieties: string[];
  /** Typical Kenyan harvest months (1–12). Indicative only. */
  seasonMonths: number[];
  /** Indicative FOB Mombasa/Nairobi range, USD per kg. Indicative only. */
  fobUsdPerKg: [number, number];
  packaging: string;
  certifications: string[];
  blurb: string;
};

export const PRODUCTS: Product[] = [
  {
    slug: "avocado",
    name: "Avocado",
    match: ["avocado"],
    varieties: ["Hass", "Fuerte"],
    seasonMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    fobUsdPerKg: [1.4, 2.4],
    packaging: "4 kg cartons, 40ft reefer",
    certifications: ["GlobalG.A.P.", "KEPHIS phyto"],
    blurb: "Africa's largest avocado exporter. Hass by sea reefer, Fuerte for processing.",
  },
  {
    slug: "tea",
    name: "Tea",
    match: ["tea"],
    varieties: ["CTC black", "Orthodox", "Purple tea"],
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    fobUsdPerKg: [2.2, 3.6],
    packaging: "Paper sacks 50–65 kg",
    certifications: ["Rainforest Alliance", "Fairtrade"],
    blurb: "World's top black tea exporter. Year-round supply, direct from estates.",
  },
  {
    slug: "coffee",
    name: "Arabica coffee",
    match: ["coffee", "arabica"],
    varieties: ["SL28", "SL34", "Ruiru 11", "Batian"],
    seasonMonths: [4, 5, 6, 10, 11, 12],
    fobUsdPerKg: [5.5, 11],
    packaging: "60 kg jute bags",
    certifications: ["Rainforest Alliance", "Organic", "EUDR geolocation"],
    blurb: "Specialty AA/AB grades from Nyeri, Kirinyaga and Mt Kenya estates.",
  },
  {
    slug: "macadamia",
    name: "Macadamia",
    match: ["macadamia"],
    varieties: ["Kernel style 0–4", "Nut-in-shell"],
    seasonMonths: [2, 3, 4, 5, 6, 7],
    fobUsdPerKg: [7, 13],
    packaging: "11.34 kg vacuum cartons",
    certifications: ["HACCP", "BRCGS"],
    blurb: "Processed kernel and nut-in-shell from central Kenya.",
  },
  {
    slug: "mango",
    name: "Mango",
    match: ["mango"],
    varieties: ["Apple", "Ngowe", "Kent", "Tommy Atkins"],
    seasonMonths: [11, 12, 1, 2, 3],
    fobUsdPerKg: [0.9, 1.8],
    packaging: "4 kg cartons",
    certifications: ["GlobalG.A.P.", "KEPHIS phyto"],
    blurb: "Coastal and Eastern Kenya mango, fresh or for pulp.",
  },
  {
    slug: "french-beans",
    name: "French beans",
    match: ["bean"],
    varieties: ["Fine", "Extra fine", "Bobby"],
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    fobUsdPerKg: [2.5, 4.5],
    packaging: "Air-freight cartons",
    certifications: ["GlobalG.A.P.", "KS1758"],
    blurb: "Year-round air-freighted green beans for EU and UK retail.",
  },
  {
    slug: "cut-flowers",
    name: "Cut flowers",
    match: ["flower", "rose"],
    varieties: ["Roses", "Spray roses", "Carnations", "Summer flowers"],
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    fobUsdPerKg: [3, 6],
    packaging: "Air-freight boxes",
    certifications: ["MPS", "Fairtrade", "KFC Silver"],
    blurb: "Naivasha roses and summer flowers, daily air capacity to Europe and the Gulf.",
  },
  {
    slug: "spices",
    name: "Dried spices",
    match: ["spice", "chilli", "chili", "ginger"],
    varieties: ["Bird's eye chilli", "Ginger", "Turmeric"],
    seasonMonths: [6, 7, 8, 9, 10, 11],
    fobUsdPerKg: [2, 6],
    packaging: "25 kg bags",
    certifications: ["HACCP", "Organic"],
    blurb: "Sun-dried chilli, ginger and turmeric for food manufacturers.",
  },
];

export const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function productBySlug(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function searchProducts(q?: string | null) {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return PRODUCTS;
  return PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(needle) ||
      p.match.some((m) => needle.includes(m) || m.includes(needle)) ||
      p.varieties.some((v) => v.toLowerCase().includes(needle)),
  );
}
