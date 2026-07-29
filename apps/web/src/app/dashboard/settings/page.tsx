"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Settings = {
  locale: string;
  timezone: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  theme: string;
};

export default function SettingsPage() {
  const { accessToken, user, refreshProfile } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    api<Settings>("/settings", { token: accessToken })
      .then(setSettings)
      .catch(() =>
        setSettings({
          locale: "en",
          timezone: "UTC",
          emailNotifications: true,
          smsNotifications: false,
          theme: "system",
        }),
      );
  }, [accessToken]);

  async function onProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    setSaved(false);
    const form = new FormData(e.currentTarget);
    try {
      await api("/users/me", {
        method: "PATCH",
        token: accessToken,
        body: {
          firstName: String(form.get("firstName")),
          lastName: String(form.get("lastName")),
          phone: String(form.get("phone") || "") || undefined,
        },
      });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Profile update failed");
    }
  }

  async function onSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    setSaved(false);
    const form = new FormData(e.currentTarget);
    try {
      const updated = await api<Settings>("/settings", {
        method: "PATCH",
        token: accessToken,
        body: {
          locale: String(form.get("locale")),
          timezone: String(form.get("timezone")),
          theme: String(form.get("theme")),
          emailNotifications: form.get("emailNotifications") === "on",
          smsNotifications: form.get("smsNotifications") === "on",
        },
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Settings update failed",
      );
    }
  }

  if (!settings || !user) {
    return (
      <p className="text-sm text-[var(--fg-muted)]">Loading settings…</p>
    );
  }

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Profile and notification preferences.
        </p>
      </div>

      <form onSubmit={onProfile} className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
          Profile
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            name="firstName"
            defaultValue={user.firstName}
            required
          />
          <Input
            label="Last name"
            name="lastName"
            defaultValue={user.lastName}
            required
          />
        </div>
        <Input label="Phone" name="phone" defaultValue={user.phone ?? ""} />
        <Button type="submit">Save profile</Button>
      </form>

      <form onSubmit={onSettings} className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
          Preferences
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Locale" name="locale" defaultValue={settings.locale} />
          <Input
            label="Timezone"
            name="timezone"
            defaultValue={settings.timezone}
          />
        </div>
        <Select label="Theme" name="theme" defaultValue={settings.theme}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="emailNotifications"
            defaultChecked={settings.emailNotifications}
          />
          Email notifications
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="smsNotifications"
            defaultChecked={settings.smsNotifications}
          />
          SMS notifications
        </label>
        <Button type="submit">Save preferences</Button>
      </form>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {saved ? (
        <p className="text-sm text-[var(--success)]">Changes saved.</p>
      ) : null}
    </div>
  );
}
