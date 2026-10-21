"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Clock } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KENYA_PRODUCE } from "@/lib/corridors";
import { PRODUCTS } from "@/lib/products";

type Lot = {
  id: string;
  reference: string;
  commodity: string;
  variety?: string | null;
  availableQuantity: string | number;
  quantity: string | number;
  unit: string;
  status: string;
  originRegion?: string | null;
  grade?: string | null;
  certifications?: string[];
  harvestStart?: string | null;
  harvestEnd?: string | null;
};

const COMMON_CERTS = [
  "GlobalG.A.P.",
  "KEPHIS phyto",
  "Rainforest Alliance",
  "Fairtrade",
  "Organic",
  "Halal",
  "HACCP",
  "BRCGS",
];

const selectClass =
  "mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-[var(--fg)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

function photoFor(commodity: string) {
  const c = commodity.toLowerCase();
  const p = PRODUCTS.find((x) => x.match.some((m) => c.includes(m)));
  return p ? `/images/products/${p.slug}.jpg` : null;
}

function monthLabel(d?: string | null) {
  return d ? new Date(d).toLocaleString("en", { month: "short", year: "numeric" }) : null;
}

export default function SupplyPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<Lot[]>([]);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [certs, setCerts] = useState<string[]>([]);

  const load = () => {
    if (!accessToken) return;
    api<Lot[]>("/supply-lots", { token: accessToken })
      .then(setRows)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed"));
    api<{ verificationStatus?: string }>("/organisations/me", { token: accessToken })
      .then((o) => setVerified(o.verificationStatus === "VERIFIED"))
      .catch(() => setVerified(null));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const qty = Number(form.get("quantity"));
    const month = (key: string) => {
      const v = String(form.get(key) || "");
      return v ? `${v}-01` : undefined;
    };
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api("/supply-lots", {
        method: "POST",
        token: accessToken,
        body: {
          commodity: String(form.get("commodity")),
          variety: String(form.get("variety") || "") || undefined,
          quantity: qty,
          availableQuantity: qty,
          originCountry: "KE",
          originRegion: String(form.get("originRegion") || "") || undefined,
          grade: String(form.get("grade") || "") || undefined,
          packaging: String(form.get("packaging") || "") || undefined,
          harvestStart: month("harvestStart"),
          harvestEnd: month("harvestEnd"),
          // Only what the farm actually holds; never assumed.
          certifications: certs,
        },
      });
      formEl.reset();
      setCerts([]);
      setNotice(
        verified
          ? "Listed. Buyers who need this will be matched to you now."
          : "Listed. Buyers will see it as soon as your business is verified.",
      );
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not list produce");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="eyebrow">My produce</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          What are you harvesting?
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          List it once. We match it to buyers who need it and text you when one does.
        </p>
      </div>

      {verified === false ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold)]" />
            <div>
              <p className="font-semibold">Buyers can&apos;t see your produce yet</p>
              <p className="mt-0.5 text-sm text-[var(--fg-muted)]">
                Every seller is verified before buyers are matched to them.
                Send your business documents to get started.
              </p>
            </div>
          </div>
          <Link href="/dashboard/verification" className="shrink-0">
            <Button size="sm">Get verified</Button>
          </Link>
        </div>
      ) : null}

      <form onSubmit={onCreate} className="card space-y-5 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Product
            <select name="commodity" className={selectClass} defaultValue="Avocado">
              {KENYA_PRODUCE.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <Input label="Variety (optional)" name="variety" placeholder="e.g. Hass" />
          <Input
            label="Tonnes available"
            name="quantity"
            type="number"
            min={1}
            placeholder="e.g. 120"
            required
          />
          <Input label="Grade (optional)" name="grade" placeholder="e.g. A / Class 1" />
          <Input label="Harvest from (optional)" name="harvestStart" type="month" />
          <Input label="Harvest until (optional)" name="harvestEnd" type="month" />
          <Input label="County or region (optional)" name="originRegion" placeholder="e.g. Murang'a" />
          <Input label="Packaging (optional)" name="packaging" placeholder="e.g. 4 kg cartons" />
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Certificates you hold</legend>
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
            Only tick what you can show. Buyers check these before signing.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {COMMON_CERTS.map((c) => {
              const on = certs.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setCerts((cs) => (on ? cs.filter((x) => x !== c) : [...cs, c]))
                  }
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] bg-white hover:border-[var(--accent)]/50"}`}
                >
                  {on ? "✓ " : ""}
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        {notice ? <p className="text-sm font-medium text-[var(--accent)]">{notice}</p> : null}

        <div className="flex justify-end border-t border-[var(--border)] pt-5">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Listing…" : "List produce"}
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--fg-muted)]">
          Your listings ({rows.length})
        </h2>
        {rows.length ? (
          <ul className="space-y-3">
            {rows.map((r) => {
              const photo = photoFor(r.commodity);
              const live = verified || ["VERIFIED", "EXPORT_ELIGIBLE"].includes(r.status);
              const harvest = [monthLabel(r.harvestStart), monthLabel(r.harvestEnd)]
                .filter(Boolean)
                .join(" – ");
              return (
                <li key={r.id} className="card flex items-center gap-4 overflow-hidden p-3 pr-5">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--accent-soft)]">
                    {photo ? (
                      <Image src={photo} alt="" fill sizes="64px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {[r.variety, r.commodity].filter(Boolean).join(" ")} ·{" "}
                      {Number(r.availableQuantity).toLocaleString()} {r.unit === "MT" ? "t" : r.unit}
                    </p>
                    <p className="truncate text-xs text-[var(--fg-muted)]">
                      {[
                        r.grade && `Grade ${r.grade}`,
                        r.originRegion,
                        harvest && `Harvest ${harvest}`,
                        r.certifications?.length ? r.certifications.join(", ") : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || r.reference}
                    </p>
                  </div>
                  <span
                    className={`hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${live ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--gold-soft)] text-[var(--gold)]"}`}
                  >
                    {live ? <BadgeCheck className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    {live ? "Visible to buyers" : "Waiting for verification"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="card p-6 text-sm text-[var(--fg-muted)]">
            Nothing listed yet. Add your first harvest above.
          </p>
        )}
      </section>
    </div>
  );
}
