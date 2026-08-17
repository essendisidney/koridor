"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Activity = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  createdAt: string;
};

type Notification = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
};

export default function DashboardPage() {
  const { accessToken, user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      api<Activity[]>("/activities?limit=5", { token: accessToken }),
      api<Notification[]>("/notifications?limit=5", { token: accessToken }),
      api<{ count: number }>("/notifications/unread-count", {
        token: accessToken,
      }),
    ])
      .then(([acts, notes, count]) => {
        setActivities(Array.isArray(acts) ? acts : []);
        setNotifications(Array.isArray(notes) ? notes : []);
        setUnread(count?.count ?? 0);
      })
      .catch(() => {
        setActivities([]);
        setNotifications([]);
      });
  }, [accessToken]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--fg)]">
            Welcome, {user?.firstName}
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Kenya origin to Oman, Iran, and Iraq — RFQs, contracts, and shipping
            on one Trade Passport.
          </p>
        </div>
        {!user?.organisationId ? (
          <Link href="/onboarding/organisation">
            <Button>Register organisation</Button>
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Unread notifications" value={String(unread)} />
        <Stat label="Roles" value={String(user?.roles.length ?? 0)} />
        <Stat
          label="Organisation"
          value={user?.organisationId ? "Linked" : "Pending"}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/kenya">
          <Button size="sm">Kenya → Oman / Iran / Iraq</Button>
        </Link>
        <Link href="/dashboard/rfqs">
          <Button variant="secondary" size="sm">
            RFQ Kenyan produce
          </Button>
        </Link>
        <Link href="/dashboard/trust">
          <Button variant="secondary" size="sm">
            Trust score
          </Button>
        </Link>
        <Link href="/dashboard/documents">
          <Button variant="secondary" size="sm">
            Documents
          </Button>
        </Link>
        <Link href="/dashboard/verification">
          <Button variant="secondary" size="sm">
            Verification
          </Button>
        </Link>
        <Link href="/dashboard/registry">
          <Button variant="secondary" size="sm">
            Registry
          </Button>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              Recent activity
            </h2>
            <Link
              href="/dashboard/activity"
              className="text-sm text-[var(--accent)]"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)] border-y border-[var(--border)] bg-white/70">
            {activities.length === 0 ? (
              <p className="py-6 text-sm text-[var(--fg-muted)]">
                No activity yet.
              </p>
            ) : (
              activities.map((item) => (
                <div key={item.id} className="py-4">
                  <p className="text-sm font-medium text-[var(--fg)]">
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-[var(--fg-muted)]">
                      {item.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-[var(--fg-muted)]">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              Notifications
            </h2>
            <Link
              href="/dashboard/notifications"
              className="text-sm text-[var(--accent)]"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)] border-y border-[var(--border)] bg-white/70">
            {notifications.length === 0 ? (
              <p className="py-6 text-sm text-[var(--fg-muted)]">
                No notifications.
              </p>
            ) : (
              notifications.map((item) => (
                <div key={item.id} className="py-4">
                  <p className="text-sm font-medium text-[var(--fg)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--fg-muted)]">
                    {item.body}
                  </p>
                  <p className="mt-2 text-xs text-[var(--fg-muted)]">
                    {formatDate(item.createdAt)} · {item.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--border)] bg-white px-5 py-4">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--fg-muted)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--fg)]">
        {value}
      </p>
    </div>
  );
}
