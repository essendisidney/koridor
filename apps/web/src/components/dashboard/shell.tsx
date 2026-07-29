"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Activity,
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  FileCheck2,
  FileSignature,
  FileText,
  Handshake,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Ship,
  Users,
  Wallet,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/trade", label: "Trade", icon: Handshake },
  { href: "/dashboard/rfqs", label: "RFQs", icon: ClipboardList },
  { href: "/dashboard/contracts", label: "Contracts", icon: FileSignature },
  { href: "/dashboard/finance", label: "Finance", icon: Wallet },
  { href: "/dashboard/logistics", label: "Logistics", icon: Ship },
  { href: "/dashboard/compliance", label: "Compliance", icon: FileCheck2 },
  { href: "/dashboard/trust", label: "Trust", icon: ShieldCheck },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/verification", label: "Verification", icon: BadgeCheck },
  { href: "/dashboard/registry", label: "Registry", icon: BookOpen },
  { href: "/dashboard/organisation", label: "Organisation", icon: Building2 },
  { href: "/dashboard/members", label: "Members & roles", icon: Users },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/audit", label: "Audit logs", icon: ScrollText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const KYB_NAV = {
  href: "/dashboard/reviews",
  label: "KYB reviews",
  icon: Shield,
};

const COMPLIANCE_APPROVALS_NAV = {
  href: "/dashboard/compliance/approvals",
  label: "Compliance approvals",
  icon: FileCheck2,
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, accessToken } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = Boolean(user?.roles.includes("SYSTEM_ADMIN"));
  const canReviewCompliance =
    isAdmin ||
    user?.permissions?.includes("compliance:review") ||
    user?.permissions?.includes("admin:all");

  useEffect(() => {
    if (!loading && !accessToken) {
      router.replace("/login");
    }
  }, [loading, accessToken, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--fg-muted)]">
        Loading workspace…
      </div>
    );
  }

  const items = [
    ...NAV,
    ...(isAdmin ? [KYB_NAV] : []),
    ...(canReviewCompliance ? [COMPLIANCE_APPROVALS_NAV] : []),
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="bg-[var(--sidebar)] text-[var(--sidebar-fg)]">
        <div className="flex h-16 items-center px-6">
          <Link
            href="/dashboard"
            className="font-[family-name:var(--font-display)] text-xl font-semibold"
          >
            Koridor
          </Link>
        </div>
        <nav className="space-y-1 px-3 pb-6">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-white/10 text-white"
                    : "text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 px-4 py-4">
          <div className="mb-3 flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 text-[var(--sidebar-muted)]" />
            <div>
              <p className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-[var(--sidebar-muted)]">{user.email}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10"
            onClick={() => logout().then(() => router.push("/login"))}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-white/80 px-6 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              Workspace
            </p>
            <p className="text-sm font-medium text-[var(--fg)]">
              {user.roles.join(" · ") || "Member"}
            </p>
          </div>
          <Link href="/dashboard/notifications">
            <Button variant="secondary" size="sm">
              <Bell className="h-4 w-4" />
              Alerts
            </Button>
          </Link>
        </header>
        <main className="px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
