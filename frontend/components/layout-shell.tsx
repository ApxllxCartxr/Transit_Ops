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
  Loader2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutShellProps {
  children: React.ReactNode;
}

export default function LayoutShell({ children }: LayoutShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: sessionState, isPending } = authClient.useSession();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize Dark Mode
  useEffect(() => {
    const isDark =
      localStorage.getItem("darkMode") === "true" ||
      (!localStorage.getItem("darkMode") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    localStorage.setItem("darkMode", String(nextDark));
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  if (isPending) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading TransitOps...</p>
        </div>
      </div>
    );
  }

  const user = sessionState?.user;
  const role = (user as any)?.role || "FleetManager";

  // Navigation Links definition with RBAC checks
  const allNavigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["Admin", "FleetManager", "Dispatcher", "SafetyOfficer", "FinancialAnalyst"],
    },
    {
      name: "Vehicles Registry",
      href: "/vehicles",
      icon: Car,
      roles: ["Admin", "FleetManager", "Dispatcher"], // Dispatchers have read access
    },
    {
      name: "Driver Roster",
      href: "/drivers",
      icon: Users,
      roles: ["Admin", "SafetyOfficer", "Dispatcher"], // Dispatchers have read access
    },
    {
      name: "Trips Dispatch",
      href: "/trips",
      icon: Navigation,
      roles: ["Admin", "Dispatcher"],
    },
    {
      name: "Maintenance Logs",
      href: "/maintenance",
      icon: Wrench,
      roles: ["Admin", "FleetManager"],
    },
    {
      name: "Fuel & Expenses",
      href: "/expenses",
      icon: Receipt,
      roles: ["Admin", "FinancialAnalyst"],
    },
    {
      name: "Reports & Analytics",
      href: "/reports",
      icon: BarChart3,
      roles: ["Admin", "FinancialAnalyst", "FleetManager"],
    },
  ];

  // Filter items visible to current user's role
  const navigationItems = allNavigationItems.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand logo header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <Truck className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              TransitOps
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                    : "text-slate-650 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
              </a>
            );
          })}
        </nav>

        {/* User profile & controls footer */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          {user && (
            <div className="mb-4 flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                <User className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {user.name}
                </p>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-primary" />
                  <span className="text-[11px] font-medium text-primary uppercase tracking-wider">
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
              className="flex-1 flex items-center justify-center rounded-lg border border-slate-200 py-2 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="flex-1 flex items-center justify-center rounded-lg border border-status-danger/20 py-2 text-status-danger hover:bg-status-danger/5 dark:border-status-danger/10"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Top bar header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {pathname === "/dashboard"
                ? "Operations Dashboard"
                : allNavigationItems.find((item) => pathname.startsWith(item.href))?.name || "TransitOps"}
            </h2>
          </div>

          {/* Top Bar Right Area */}
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline-block">
              System Live &bull; UTC {new Date().toISOString().split("T")[0]}
            </span>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
