"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
};

export default function NotificationsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);

  async function load() {
    if (!accessToken) return;
    const data = await api<Notification[]>("/notifications", {
      token: accessToken,
    });
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [accessToken]);

  async function markRead(id: string) {
    if (!accessToken) return;
    await api(`/notifications/${id}/read`, {
      method: "PATCH",
      token: accessToken,
    });
    await load();
  }

  async function markAll() {
    if (!accessToken) return;
    await api("/notifications/read-all", {
      method: "PATCH",
      token: accessToken,
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            In-app alerts for organisation and account events.
          </p>
        </div>
        <Button variant="secondary" onClick={markAll}>
          Mark all read
        </Button>
      </div>
      <div className="divide-y divide-[var(--border)] border border-[var(--border)] bg-white">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-[var(--fg-muted)]">No notifications.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
            >
              <div>
                <p className="font-medium text-[var(--fg)]">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">{item.body}</p>
                <p className="mt-2 text-xs text-[var(--fg-muted)]">
                  {formatDate(item.createdAt)} · {item.status}
                </p>
              </div>
              {item.status === "UNREAD" ? (
                <Button size="sm" variant="secondary" onClick={() => markRead(item.id)}>
                  Mark read
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
