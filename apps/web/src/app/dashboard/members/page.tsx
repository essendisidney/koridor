"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

type Member = {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: { role: string }[];
  };
};

type Organisation = { id: string };

export default function MembersPage() {
  const { accessToken } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (!accessToken) return;
    try {
      const org = await api<Organisation>("/organisations/me", {
        token: accessToken,
      });
      setOrgId(org.id);
      const list = await api<Member[]>(`/organisations/${org.id}/members`, {
        token: accessToken,
      });
      setMembers(Array.isArray(list) ? list : []);
    } catch {
      setOrgId(null);
      setMembers([]);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void load();
  }, [accessToken]);

  async function onInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accessToken || !orgId) return;
    setError(null);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    try {
      await api(`/organisations/${orgId}/invites`, {
        method: "POST",
        token: accessToken,
        body: {
          email: String(form.get("email")),
          role: String(form.get("role")),
        },
      });
      setMessage("Invitation created.");
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invite failed");
    }
  }

  if (loaded && !orgId) {
    return (
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Members & roles
        </h1>
        <p className="text-sm text-[var(--fg-muted)]">
          Register an organisation before inviting members.
        </p>
        <Link href="/onboarding/organisation">
          <Button>Register organisation</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Members & roles
        </h1>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Manage organisation membership and invite collaborators.
        </p>
      </div>

      <form
        onSubmit={onInvite}
        className="grid max-w-2xl gap-3 border border-[var(--border)] bg-white p-4 sm:grid-cols-[1fr_160px_auto]"
      >
        <Input label="Invite email" name="email" type="email" required />
        <Select label="Role" name="role" defaultValue="MEMBER">
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
          <option value="VIEWER">Viewer</option>
        </Select>
        <div className="flex items-end">
          <Button type="submit">Invite</Button>
        </div>
      </form>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? (
        <p className="text-sm text-[var(--success)]">{message}</p>
      ) : null}

      <div className="overflow-x-auto border border-[var(--border)] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[#f7f9fb] text-xs uppercase tracking-[0.1em] text-[var(--fg-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Org role</th>
              <th className="px-4 py-3 font-medium">System roles</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {member.user.firstName} {member.user.lastName}
                  </p>
                  <p className="text-[var(--fg-muted)]">{member.user.email}</p>
                </td>
                <td className="px-4 py-3">{member.role}</td>
                <td className="px-4 py-3">
                  {member.user.roles?.map((r) => r.role).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">{formatDate(member.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
