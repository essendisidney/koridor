"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type Detail = {
  organisation: {
    name: string;
    slug: string;
    type: string;
    countryCode: string;
    city?: string | null;
    description?: string | null;
    website?: string | null;
    verificationStatus: string;
    trustScore: number;
  };
  registry: {
    summary?: string | null;
    commodities: string[];
    exportMarkets: string[];
    yearsInOperation?: number | null;
  };
  primaryContact?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
  } | null;
};

export default function RegistryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { accessToken } = useAuth();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !slug) return;
    api<Detail>(`/registry/${slug}`, { token: accessToken })
      .then(setDetail)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Not found"),
      );
  }, [accessToken, slug]);

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--danger)]">{error}</p>
        <Link href="/dashboard/registry">
          <Button variant="secondary">Back to registry</Button>
        </Link>
      </div>
    );
  }

  if (!detail) {
    return (
      <p className="text-sm text-[var(--fg-muted)]">Loading profile…</p>
    );
  }

  const { organisation: org, registry, primaryContact } = detail;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/registry"
        className="text-sm text-[var(--accent)] hover:underline"
      >
        ← Registry
      </Link>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {org.name}
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          {org.type.replaceAll("_", " ")} · {org.countryCode}
          {org.city ? ` · ${org.city}` : ""} · {org.verificationStatus} · Trust{" "}
          {org.trustScore}
        </p>
      </div>
      {registry.summary ? (
        <p className="text-sm leading-relaxed">{registry.summary}</p>
      ) : null}
      {org.description ? (
        <p className="text-sm text-[var(--fg-muted)]">{org.description}</p>
      ) : null}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--fg-muted)]">Commodities</dt>
          <dd>{registry.commodities.join(", ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--fg-muted)]">Export markets</dt>
          <dd>{registry.exportMarkets.join(", ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--fg-muted)]">Years in operation</dt>
          <dd>{registry.yearsInOperation ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--fg-muted)]">Website</dt>
          <dd>
            {org.website ? (
              <a
                href={org.website}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)]"
              >
                {org.website}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
      {primaryContact ? (
        <div className="border-t border-[var(--border)] pt-4 text-sm">
          <p className="font-medium">Primary contact</p>
          <p className="text-[var(--fg-muted)]">
            {primaryContact.name}
            {primaryContact.title ? ` · ${primaryContact.title}` : ""}
            {primaryContact.email ? ` · ${primaryContact.email}` : ""}
            {primaryContact.phone ? ` · ${primaryContact.phone}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
