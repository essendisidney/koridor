"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Building2,
  ClipboardList,
  Compass,
  FileCheck2,
  FileSignature,
  FileText,
  Handshake,
  LayoutDashboard,
  LogOut,
  Package,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Sprout,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { postAuthPath } from "@/lib/journey";

const PRIMARY = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/discover", label: "Discover", icon: Compass },
];

const BUY = [
  { href: "/dashboard/requirements", label: "Requirements", icon: Target },
  { href: "/dashboard/rfqs", label: "RFQs", icon: ClipboardList },
];

const SUPPLY = [
  { href: "/dashboard/supply", label: "My Supply", icon: Sprout },
  { href: "/dashboard/demand", label: "Buyer Demand", icon: Search },
];

const DEALS = [
  { href: "/dashboard/deals", label: "Deal Rooms", icon: Handshake },
  { href: "/dashboard/contracts", label: "Contracts", icon: FileSignature },
];

const TRADE = [
  { href: "/dashboard/trade", label: "Passports", icon: Package },
  { href: "/dashboard/logistics", label: "Logistics", icon: Ship },
  { href: "/dashboard/compliance", label: "Compliance", icon: FileCheck2 },
];

const CAPITAL = [{ href: "/dashboard/finance", label: "Capital", icon: Wallet }];

const INTELLIGENCE = [
  { href: "/dashboard/intelligence", label: "Intelligence", icon: BarChart3 },
  { href: "/dashboard/analytics", label: "Analytics", icon: Activity },
];

const SETUP = [
  { href: "/dashboard/verification", label: "Verification", icon: BadgeCheck },
  { href: "/dashboard/trust", label: "Identity", icon: ShieldCheck },
  { href: "/dashboard/registry", label: "Registry", icon: BookOpen },
  { href: "/dashboard/organisation", label: "Organisation", icon: Building2 },
  { href: "/dashboard/settings", label: "Account", icon: Settings },
];

const MORE = [
  { href: "/dashboard/bankability", label: "Bankability", icon: Shield },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/ai", label: "AI", icon: Bot },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/audit", label: "Audit", icon: ScrollText },
];

const ADMIN_NAV = {
  href: "/dashboard/admin",
  label: "Control Tower",
  icon: ShieldAlert,
};

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
    if (loading) return;
    if (!accessToken) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
      return;
    }
    if (user && !user.organisationId) {
      router.replace(postAuthPath(user));
    }
  }, [loading, accessToken, user, pathname, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--fg-muted)]">
        Loading workspace…
      </div>
    );
  }

  const extras = [
    ...(isAdmin ? [KYB_NAV, ADMIN_NAV] : []),
    ...(canReviewCompliance ? [COMPLIANCE_APPROVALS_NAV] : []),
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-[var(--sidebar)] text-[var(--sidebar-fg)]">
        <div className="flex h-16 items-center px-6">
          <Link
            href="/dashboard"
            className="font-[family-name:var(--font-display)] text-xl font-semibold"
          >
            Koridor
          </Link>
        </div>
        <NavGroup label="Home" items={PRIMARY} pathname={pathname} />
        <NavGroup label="Buy" items={BUY} pathname={pathname} />
        <NavGroup label="Supply" items={SUPPLY} pathname={pathname} />
        <NavGroup label="Deals" items={DEALS} pathname={pathname} />
        <NavGroup label="Trade" items={TRADE} pathname={pathname} />
        <NavGroup label="Capital" items={CAPITAL} pathname={pathname} />
        <NavGroup label="Intelligence" items={INTELLIGENCE} pathname={pathname} />
        <NavGroup label="Account" items={SETUP} pathname={pathname} />
        <NavGroup label="More" items={MORE} pathname={pathname} />
        {extras.length ? (
          <NavGroup label="Ops" items={extras} pathname={pathname} />
        ) : null}
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
              Kenya → world
            </p>
            <p className="text-sm font-medium text-[var(--fg)]">
              Demand · Match · Deal · Execute
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/cropchain"
              className="hidden text-sm font-medium text-[var(--fg-muted)] sm:inline"
            >
              CropChain
            </Link>
            <Link href="/dashboard/notifications">
              <Button variant="secondary" size="sm">
                <Bell className="h-4 w-4" />
                Alerts
              </Button>
            </Link>
          </div>
        </header>
        <main className="px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: { href: string; label: string; icon: typeof LayoutDashboard }[];
  pathname: string;
}) {
  return (
    <div className="px-3 pb-4">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--sidebar-muted)]">
        {label}
      </p>
      <nav className="space-y-0.5">
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
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
    </div>
  );
}
