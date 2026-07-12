"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  Truck,
  LayoutDashboard,
  Car,
  Users,
  Navigation,
  Wrench,
  Receipt,
  BarChart3,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  User,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeAndMapRole } from "@/lib/auth-utils";

interface LayoutShellProps {
  children: React.ReactNode;
}

export default function LayoutShell({ children }: LayoutShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: sessionState, isPending } = authClient.useSession();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Initialize theme from data-theme attribute (set by blocking script in layout.tsx)
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setDarkMode(current !== "light");
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    const nextTheme = nextDark ? "dark" : "light";
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  if (isPending) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-0">
        <div className="flex flex-col items-center gap-4">
          {/* Content-shaped skeleton loader per DESIGN.md §10 */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[10px] animate-shimmer" />
            <div className="h-4 w-32 rounded animate-shimmer" />
          </div>
          <p className="text-body-sm text-text-secondary">Loading TransitOps…</p>
        </div>
      </div>
    );
  }

  const user = sessionState?.user;
  const rawRole = (user as any)?.roles || (user as any)?.role || "FleetManager";
  const role = normalizeAndMapRole(rawRole);

  // Navigation Links with RBAC checks
  const allNavigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["Admin", "FleetManager", "Dispatcher", "SafetyOfficer", "FinancialAnalyst"],
    },
    {
      name: "Vehicles",
      href: "/vehicles",
      icon: Car,
      roles: ["Admin", "FleetManager", "Dispatcher"],
    },
    {
      name: "Drivers",
      href: "/drivers",
      icon: Users,
      roles: ["Admin", "SafetyOfficer", "Dispatcher"],
    },
    {
      name: "Trips",
      href: "/trips",
      icon: Navigation,
      roles: ["Admin", "Dispatcher"],
    },
    {
      name: "Maintenance",
      href: "/maintenance",
      icon: Wrench,
      roles: ["Admin", "FleetManager"],
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: Receipt,
      roles: ["Admin", "FinancialAnalyst"],
    },
    {
      name: "Reports",
      href: "/reports",
      icon: BarChart3,
      roles: ["Admin", "FinancialAnalyst", "FleetManager"],
    },
    {
      name: "Members",
      href: "/members",
      icon: User,
      roles: ["Admin"],
    },
  ];

  const navigationItems = allNavigationItems.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0 text-text-primary">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (DESIGN.md §7.1) ────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-surface-1 border-r border-border-subtle transition-transform duration-[var(--dur-base)] lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header — 64px */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent text-white">
              <Truck className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-text-primary">
              TransitOps
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-[8px] p-1.5 text-text-tertiary hover:bg-surface-3 hover:text-text-primary transition-colors duration-[var(--dur-fast)] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-0.5">
          <div className="text-overline text-text-tertiary px-3 mb-3">
            Navigation
          </div>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-[8px] px-3 h-9 text-[14px] font-medium transition-colors duration-[var(--dur-fast)]",
                  isActive
                    ? "bg-surface-3 text-text-primary"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                )}
              >
                {/* Active indicator — 2px accent left bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-accent" />
                )}
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                {item.name}
              </a>
            );
          })}
        </nav>

        {/* User profile & controls footer */}
        <div className="border-t border-border-subtle p-3">
          {user && (
            <div className="mb-3 flex items-center gap-3 px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-text-secondary">
                <User className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="truncate text-[13px] font-semibold text-text-primary">
                  {user.name}
                </p>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-accent" strokeWidth={1.5} />
                  <span className="text-overline text-accent">
                    {role}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={toggleDarkMode}
              title="Toggle theme"
              className="flex-1 flex items-center justify-center rounded-[8px] border border-border-default py-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors duration-[var(--dur-fast)]"
            >
              {darkMode ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}
            </button>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="flex-1 flex items-center justify-center rounded-[8px] border border-[--status-failed-border] py-2 text-status-failed hover:bg-status-failed-bg transition-colors duration-[var(--dur-fast)]"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Container ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar — 64px (DESIGN.md §4.7) */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-surface-1 px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-[8px] p-1.5 text-text-tertiary hover:bg-surface-3 hover:text-text-primary transition-colors duration-[var(--dur-fast)] lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <h2 className="text-h3 text-text-primary">
              {pathname === "/dashboard"
                ? "Operations Dashboard"
                : allNavigationItems.find((item) => pathname.startsWith(item.href))?.name || "TransitOps"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-caption text-text-tertiary sm:inline-block tabular-nums">
              System Live · UTC {new Date().toISOString().split("T")[0]}
            </span>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-surface-0">
          {children}
        </main>
      </div>
    </div>
  );
}
