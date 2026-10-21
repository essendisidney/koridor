"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  Menu,
  X,
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
import { Logo } from "@/components/public-nav";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

/** Five things a buyer does. Everything else lives under "More". */
const BUYER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/requirements", label: "Requests", icon: Target },
  { href: "/dashboard/deals", label: "Deals", icon: Handshake },
  { href: "/dashboard/logistics", label: "Shipments", icon: Ship },
  { href: "/dashboard/finance", label: "Payments", icon: Wallet },
];

/** Five things a farm / exporter does. */
const SELLER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/demand", label: "Buyers", icon: Search },
  { href: "/dashboard/supply", label: "Produce", icon: Sprout },
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const isAdmin = Boolean(user?.roles.includes("SYSTEM_ADMIN"));
  const canReviewCompliance =
    isAdmin ||
    user?.permissions?.includes("compliance:review") ||
    user?.permissions?.includes("admin:all");

  useEffect(() => setSheetOpen(false), [pathname]);

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-[var(--fg-muted)]">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
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
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="relative hidden flex-col bg-[var(--sidebar)] lg:flex text-[var(--sidebar-fg)] lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top_left,rgba(180,138,62,0.18),transparent_70%)]"
        />
        <div className="relative flex h-16 items-center px-6">
          <Link href="/dashboard" aria-label="Workspace home">
            <Logo light />
          </Link>
        </div>
        <div className="relative">
          <NavGroup items={primary} pathname={pathname} />
        </div>
        <details className="px-3 pb-4" open={moreActive}>
          <summary className="cursor-pointer list-none px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--sidebar-muted)] hover:text-white">
            More
          </summary>
          <NavGroup items={MORE} pathname={pathname} />
        </details>
        {extras.length ? (
          <NavGroup label="Ops" items={extras} pathname={pathname} />
        ) : null}
        <div className="mt-auto border-t border-white/10 px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d4b06a] to-[#9c7430] text-xs font-semibold text-[#1a1407]">
              {(user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-[var(--sidebar-muted)]">{user.email}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full border-white/15 bg-white/5 text-white shadow-none hover:border-white/25 hover:bg-white/10"
            onClick={() => logout().then(() => router.push("/login"))}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--border)]/70 px-4 sm:px-6">
          <Link href="/dashboard" aria-label="Workspace home" className="lg:hidden">
            <Logo />
          </Link>
          <Link
            href={isSeller ? "/dashboard/supply" : "/dashboard/requirements/new"}
            className="hidden lg:block"
          >
            <Button size="sm">
              {isSeller ? "List produce" : "New request"}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={isSeller ? "/dashboard/supply" : "/dashboard/requirements/new"}
              className="lg:hidden"
            >
              <Button size="sm">{isSeller ? "List" : "Request"}</Button>
            </Link>
            <Link href="/dashboard/notifications" aria-label="Alerts">
              <Button variant="secondary" size="sm">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
              </Button>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:pb-10 lg:pt-10">
          {children}
        </main>
      </div>

      {/* Phone: bottom tab bar with the five main places, everything else in a sheet. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[var(--sidebar)] pb-[env(safe-area-inset-bottom)] text-[var(--sidebar-muted)] lg:hidden"
      >
        <ul className="grid grid-cols-6">
          {primary.slice(0, 5).map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium",
                    active ? "text-white" : "hover:text-white",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-[#d4b06a]")} />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className={cn(
                "flex w-full flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium hover:text-white",
                moreActive && "text-white",
              )}
            >
              <Menu className="h-5 w-5" />
              More
            </button>
          </li>
        </ul>
      </nav>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-[var(--sidebar)] pb-[env(safe-area-inset-bottom)] text-[var(--sidebar-fg)]">
            <div className="flex items-center justify-between px-6 pb-2 pt-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-[var(--sidebar-muted)]">{user.email}</p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setSheetOpen(false)}
                className="rounded-full p-2 text-[var(--sidebar-muted)] hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavGroup items={MORE} pathname={pathname} />
            {extras.length ? <NavGroup label="Ops" items={extras} pathname={pathname} /> : null}
            <div className="border-t border-white/10 px-4 py-4">
              <Button
                variant="secondary"
                size="sm"
                className="w-full border-white/15 bg-white/5 text-white shadow-none hover:bg-white/10"
                onClick={() => logout().then(() => router.push("/login"))}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      ) : null}
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
                "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                active
                  ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-[var(--gold)]"
                  : "text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-[#d4b06a]")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
