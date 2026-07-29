"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

type Activity = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  createdAt: string;
};

export default function ActivityPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Activity[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    api<Activity[]>("/activities", { token: accessToken })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, [accessToken]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Activity timeline
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Chronological record of meaningful workspace events.
        </p>
      </div>
      <ol className="relative space-y-0 border-l border-[var(--border)] pl-6">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No activity yet.</p>
        ) : (
          items.map((item) => (
            <li key={item.id} className="relative pb-8">
              <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                {item.type.replaceAll("_", " ")}
              </p>
              <p className="mt-1 font-medium text-[var(--fg)]">{item.title}</p>
              {item.description ? (
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                  {item.description}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-[var(--fg-muted)]">
                {formatDate(item.createdAt)}
              </p>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
