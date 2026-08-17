"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountrySelect } from "@/components/country-select";
import { GULF_WEST_ASIA_BUYERS, KENYA_PRODUCE } from "@/lib/corridors";

type RegistryItem = {
  id: string;
  organisationType: string;
  summary?: string | null;
  commodities: string[];
  exportMarkets: string[];
  yearsInOperation?: number | null;
  organisation: {
    name: string;
    slug: string;
    countryCode: string;
    city?: string | null;
    verificationStatus: string;
    trustScore: number;
  };
};

type MyProfile = {
  summary?: string | null;
  commodities: string[];
  exportMarkets: string[];
  yearsInOperation?: number | null;
  isListed: boolean;
} | null;

const TYPES = ["", "EXPORTER", "BUYER", "FARMER", "COOPERATIVE"];

export default function RegistryPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [mine, setMine] = useState<MyProfile>(null);
  const [type, setType] = useState("");
  const [country, setCountry] = useState("");
  const [market, setMarket] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadBrowse = useCallback(() => {
    if (!accessToken) return;
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (country) params.set("country", country);
    if (market) params.set("market", market);
    if (q) params.set("q", q);
    api<RegistryItem[]>(`/registry?${params.toString()}`, { token: accessToken })
      .then(setItems)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Browse failed"),
      );
  }, [accessToken, type, country, market, q]);

  useEffect(() => {
    if (!accessToken) return;
    api<MyProfile>("/registry/me", { token: accessToken })
      .then(setMine)
      .catch(() => setMine(null));
  }, [accessToken]);

  useEffect(() => {
    loadBrowse();
  }, [loadBrowse]);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    const form = new FormData(e.currentTarget);
    try {
      const profile = await api<MyProfile>("/registry/me", {
        method: "PUT",
        token: accessToken,
        body: {
          summary: String(form.get("summary") || ""),
          commodities: String(form.get("commodities") || ""),
          exportMarkets: String(form.get("exportMarkets") || ""),
          yearsInOperation: String(form.get("yearsInOperation") || ""),
          isListed: form.get("isListed") === "on",
        },
      });
      setMine(profile);
      setSaved(true);
      loadBrowse();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Registry
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Kenyan farmers and exporters, plus buyers in Oman, Iran, and Iraq.
          List commodities and Gulf export markets (OM, IR, IQ) so importers can
          find you.
        </p>
      </div>

      <section className="space-y-4 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Your listing
        </h2>
        <form onSubmit={saveProfile} className="space-y-3">
          <Input
            label="Summary"
            name="summary"
            defaultValue={mine?.summary ?? ""}
          />
          <Input
            label="Commodities (comma-separated)"
            name="commodities"
            placeholder="avocado, tea, coffee"
            defaultValue={mine?.commodities?.join(", ") ?? ""}
          />
          <Input
            label="Export / source markets (comma-separated ISO-2)"
            name="exportMarkets"
            placeholder="OM, IR, IQ"
            defaultValue={mine?.exportMarkets?.join(", ") ?? ""}
          />
          <Input
            label="Years in operation"
            name="yearsInOperation"
            type="number"
            min={0}
            defaultValue={mine?.yearsInOperation ?? ""}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isListed"
              defaultChecked={mine?.isListed ?? true}
            />
            List in public registry
          </label>
          {saved ? (
            <p className="text-sm text-[var(--success)]">Listing saved.</p>
          ) : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save listing"}
          </Button>
        </form>
      </section>

      <section className="space-y-4 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Browse
        </h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-11 rounded-md border border-[var(--border)] bg-white px-3 text-sm"
          >
            <option value="">All types</option>
            {TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <CountrySelect
            label=""
            name="countryFilter"
            allowEmpty
            emptyLabel="All countries"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-11"
          />
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="h-11 rounded-md border border-[var(--border)] bg-white px-3 text-sm"
          >
            <option value="">Any export market</option>
            {GULF_WEST_ASIA_BUYERS.map((c) => (
              <option key={c} value={c}>
                Ships to {c}
              </option>
            ))}
            <option value="KE">Ships to KE</option>
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name…"
            className="h-11 min-w-[200px] flex-1 rounded-md border border-[var(--border)] bg-white px-3 text-sm"
          />
        </div>
        <p className="text-xs text-[var(--fg-muted)]">
          Quick: Kenyan {KENYA_PRODUCE.slice(0, 4).join(", ").toLowerCase()}{" "}
          towards Oman, Iran, Iraq.
        </p>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">No listings found.</p>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/registry/${item.organisation.slug}`}
                className="block border-b border-[var(--border)] py-3 transition hover:bg-[var(--bg-muted)]/40"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{item.organisation.name}</p>
                  <p className="text-sm text-[var(--accent)]">
                    Trust {item.organisation.trustScore}
                  </p>
                </div>
                <p className="text-xs text-[var(--fg-muted)]">
                  {item.organisationType.replaceAll("_", " ")} ·{" "}
                  {item.organisation.countryCode}
                  {item.organisation.city ? ` · ${item.organisation.city}` : ""}{" "}
                  · {item.organisation.verificationStatus}
                  {item.commodities?.length
                    ? ` · ${item.commodities.slice(0, 3).join(", ")}`
                    : ""}
                  {item.exportMarkets?.length
                    ? ` · markets ${item.exportMarkets.slice(0, 4).join(", ")}`
                    : ""}
                </p>
                {item.summary ? (
                  <p className="mt-1 text-sm text-[var(--fg-muted)]">
                    {item.summary}
                  </p>
                ) : null}
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
