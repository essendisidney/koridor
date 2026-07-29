"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Organisation = {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  verificationStatus: string;
  countryCode: string;
  city?: string | null;
  registrationNumber?: string | null;
  taxId?: string | null;
  website?: string | null;
  description?: string | null;
};

type Contact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  isPrimary: boolean;
};

type TrustMe = { trustScore: number };

export default function OrganisationPage() {
  const { accessToken } = useAuth();
  const [org, setOrg] = useState<Organisation | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadContacts = useCallback(
    (orgId: string) => {
      if (!accessToken) return;
      api<Contact[]>(`/organisations/${orgId}/contacts`, { token: accessToken })
        .then(setContacts)
        .catch(() => setContacts([]));
    },
    [accessToken],
  );

  useEffect(() => {
    if (!accessToken) return;
    api<Organisation>("/organisations/me", { token: accessToken })
      .then((o) => {
        setOrg(o);
        loadContacts(o.id);
      })
      .catch(() => setOrg(null));
    api<TrustMe>("/trust/me", { token: accessToken })
      .then((t) => setTrustScore(t.trustScore))
      .catch(() => setTrustScore(null));
  }, [accessToken, loadContacts]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken || !org) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    const form = new FormData(e.currentTarget);
    try {
      const updated = await api<Organisation>(`/organisations/${org.id}`, {
        method: "PATCH",
        token: accessToken,
        body: {
          name: String(form.get("name")),
          city: String(form.get("city") || "") || undefined,
          registrationNumber:
            String(form.get("registrationNumber") || "") || undefined,
          taxId: String(form.get("taxId") || "") || undefined,
          website: String(form.get("website") || "") || undefined,
          description: String(form.get("description") || "") || undefined,
        },
      });
      setOrg(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function addContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken || !org) return;
    const form = new FormData(e.currentTarget);
    try {
      await api(`/organisations/${org.id}/contacts`, {
        method: "POST",
        token: accessToken,
        body: {
          name: String(form.get("name")),
          email: String(form.get("email") || "") || undefined,
          phone: String(form.get("phone") || "") || undefined,
          title: String(form.get("title") || "") || undefined,
          isPrimary: form.get("isPrimary") === "on",
        },
      });
      e.currentTarget.reset();
      loadContacts(org.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Contact failed");
    }
  }

  async function removeContact(contactId: string) {
    if (!accessToken || !org) return;
    await api(`/organisations/${org.id}/contacts/${contactId}`, {
      method: "DELETE",
      token: accessToken,
    });
    loadContacts(org.id);
  }

  if (!org) {
    return (
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Organisation
        </h1>
        <p className="text-sm text-[var(--fg-muted)]">
          No organisation linked to your account yet.
        </p>
        <Link href="/onboarding/organisation">
          <Button>Register organisation</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Organisation
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          {org.slug} · {org.type.replaceAll("_", " ")} · {org.status} ·{" "}
          {org.verificationStatus}
          {trustScore !== null ? ` · Trust ${trustScore}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/dashboard/trust">
            <Button size="sm" variant="secondary">
              Trust profile
            </Button>
          </Link>
          <Link href="/dashboard/verification">
            <Button size="sm" variant="secondary">
              Verification
            </Button>
          </Link>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Legal name" name="name" defaultValue={org.name} required />
        <Input label="City" name="city" defaultValue={org.city ?? ""} />
        <Input
          label="Registration number"
          name="registrationNumber"
          defaultValue={org.registrationNumber ?? ""}
        />
        <Input label="Tax ID" name="taxId" defaultValue={org.taxId ?? ""} />
        <Input
          label="Website"
          name="website"
          defaultValue={org.website ?? ""}
        />
        <Input
          label="Description"
          name="description"
          defaultValue={org.description ?? ""}
        />
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        {saved ? (
          <p className="text-sm text-[var(--success)]">Organisation updated.</p>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <section className="space-y-4 border-t border-[var(--border)] pt-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Contacts
        </h2>
        <div className="space-y-2">
          {contacts.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">No contacts yet.</p>
          ) : (
            contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {c.name}
                    {c.isPrimary ? " · Primary" : ""}
                  </p>
                  <p className="text-[var(--fg-muted)]">
                    {[c.title, c.email, c.phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => removeContact(c.id)}
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </div>
        <form onSubmit={addContact} className="grid gap-3 sm:grid-cols-2">
          <Input label="Name" name="name" required />
          <Input label="Title" name="title" />
          <Input label="Email" name="email" type="email" />
          <Input label="Phone" name="phone" />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="isPrimary" />
            Primary contact
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" size="sm">
              Add contact
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
