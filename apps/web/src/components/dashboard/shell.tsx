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
import { BRAND } from "@/lib/brand";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

/** Five things a buyer does. Everything else lives under "More". */
const BUYER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/requirements", label: "My requests", icon: Target },
  { href: "/dashboard/deals", label: "Deals", icon: Handshake },
  { href: "/dashboard/logistics", label: "Shipments", icon: Ship },
  { href: "/dashboard/finance", label: "Payments", icon: Wallet },
];

/** Five things a farm / exporter does. */
const SELLER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/demand", label: "Buyers for you", icon: Search },
  { href: "/dashboard/supply", label: "My produce", icon: Sprout },
  { href: "/dashboard/deals", label: "Deals", icon: Handshake },
  { href: "/dashboard/finance", label: "Payments", icon: Wallet },
];

const MORE: NavItem[] = [
  { href: "/products", label: "Browse products", icon: Compass },
  { href: "/dashboard/rfqs", label: "Quotes (RFQs)", icon: ClipboardList },
  { href: "/dashboard/contracts", label: "Contracts", icon: FileSignature },
  { href: "/dashboard/trade", label: "Trade records", icon: Package },
  { href: "/dashboard/compliance", label: "Export documents", icon: FileCheck2 },
  { href: "/dashboard/documents", label: "Files", icon: FileText },
  { href: "/dashboard/verification", label: "Verification", icon: BadgeCheck },
  { href: "/dashboard/trust", label: "Identity", icon: ShieldCheck },
  { href: "/dashboard/registry", label: "Directory", icon: BookOpen },
  { href: "/dashboard/bankability", label: "Credit score", icon: Shield },
  { href: "/dashboard/intelligence", label: "Market insights", icon: BarChart3 },
  { href: "/dashboard/analytics", label: "Analytics", icon: Activity },
  { href: "/dashboard/ai", label: "Assistant", icon: Bot },
  { href: "/dashboard/organisation", label: "Company", icon: Building2 },
  { href: "/dashboard/members", label: "Team", icon: Users },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/audit", label: "Audit log", icon: ScrollText },
  { href: "/dashboard/settings", label: "Account", icon: Settings },
];

const SELLER_ROLES = ["FARMER", "COOPERATIVE", "EXPORTER"];

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

  const isSeller = user.roles.some((r) => SELLER_ROLES.includes(r));
  const primary = isSeller ? SELLER_NAV : BUYER_NAV;
  const moreActive = MORE.some((i) => pathname.startsWith(i.href));

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
            {BRAND.name}
          </Link>
        </div>
        <NavGroup items={primary} pathname={pathname} />
        <details className="px-3 pb-4" open={moreActive}>
          <summary className="cursor-pointer list-none px-3 py-2 text-sm text-[var(--sidebar-muted)] hover:text-white">
            More
          </summary>
          <NavGroup items={MORE} pathname={pathname} />
        </details>
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
          <Link
            href={isSeller ? "/dashboard/supply" : "/dashboard/requirements/new"}
          >
            <Button size="sm">
              {isSeller ? "List produce" : "New request"}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
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
  label?: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="px-3 pb-4">
      {label ? (
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--sidebar-muted)]">
          {label}
        </p>
      ) : null}
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
