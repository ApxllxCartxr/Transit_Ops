"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Activity,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Clock,
  UserCheck,
  TrendingUp,
  Filter,
  DollarSign,
  Fuel,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { SkeletonKPI } from "@/components/ui/skeleton";

interface DashboardKpis {
  activeVehicles: number;
  availableVehicles: number;
  inShopVehicles: number;
  retiredVehicles: number;
  activeTrips: number;
  pendingTrips: number;
  onDutyDrivers: number;
  fleetUtilization: number;
  totalVehicles: number;
  totalDrivers: number;
  operationalCost?: number;
  totalRevenue?: number;
  fuelLiters?: number;
  vehicleROI?: string | number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [vehicleType, setVehicleType] = useState("all");
  const [vehicleStatus, setVehicleStatus] = useState("all");
  const [region, setRegion] = useState("all");

  const fetchKpis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (vehicleType !== "all") query.set("type", vehicleType);
      if (vehicleStatus !== "all") query.set("status", vehicleStatus);
      if (region !== "all") query.set("region", region);

      const data = await apiClient.get<DashboardKpis>(`dashboard/kpis?${query.toString()}`);
      setKpis(data);
      addToast("Dashboard data refreshed successfully", "success");
    } catch (err: any) {
      const errorMsg = err.message || "Failed to fetch dashboard KPIs.";
      setError(errorMsg);
      addToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  }, [vehicleType, vehicleStatus, region, addToast]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  // KPI card data config with clickable routes
  const kpiCards = kpis
    ? [
        {
          label: "ACTIVE VEHICLES",
          value: kpis.activeVehicles,
          sub: "Currently executing trips",
          icon: Activity,
          color: "var(--status-info-fg)",
          bg: "var(--status-info-bg)",
          href: "/vehicles?status=OnTrip",
        },
        {
          label: "AVAILABLE",
          value: kpis.availableVehicles,
          sub: "Ready for assignment",
          icon: CheckCircle,
          color: "var(--status-success-fg)",
          bg: "var(--status-success-bg)",
          href: "/vehicles?status=Available",
        },
        {
          label: "IN SHOP",
          value: kpis.inShopVehicles,
          sub: "In maintenance or repair",
          icon: AlertTriangle,
          color: "var(--status-warning-fg)",
          bg: "var(--status-warning-bg)",
          href: "/vehicles?status=InShop",
        },
        {
          label: "ACTIVE TRIPS",
          value: kpis.activeTrips,
          sub: "Dispatched trips on road",
          icon: Navigation,
          color: "var(--status-info-fg)",
          bg: "var(--status-info-bg)",
          href: "/trips",
        },
        {
          label: "PENDING TRIPS",
          value: kpis.pendingTrips,
          sub: "Trips in Draft state",
          icon: Clock,
          color: "var(--status-warning-fg)",
          bg: "var(--status-warning-bg)",
          href: "/trips",
        },
        {
          label: "DRIVERS ON-DUTY",
          value: kpis.onDutyDrivers,
          sub: "Available or executing trips",
          icon: UserCheck,
          color: "var(--status-success-fg)",
          bg: "var(--status-success-bg)",
          href: "/drivers",
        },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-text-primary font-bold tracking-tight">
            Fleet Operations Overview
          </h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Real-time telemetry and financial tracking across all active vehicles, trips, and drivers.
          </p>
        </div>
        <button
          id="refresh-kpis-btn"
          onClick={fetchKpis}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-[10px] border border-border-default bg-surface-2 px-4 py-2.5 text-body-sm font-semibold text-text-secondary hover:bg-surface-3 hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97] shadow-xs transition-all duration-[var(--dur-fast)]"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          Refresh Live Data
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="rounded-[14px] border border-border-subtle bg-surface-1 p-4 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-accent" strokeWidth={1.8} />
          <span className="text-caption font-semibold uppercase tracking-wider text-text-secondary">Real-Time Data Filters</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="filter-vehicle-type" className="block text-caption text-text-secondary mb-1.5">
              Vehicle Type
            </label>
            <select
              id="filter-vehicle-type"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="block w-full rounded-[10px] border border-border-default bg-surface-0 px-3 py-2 text-body-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            >
              <option value="all">All Vehicle Types</option>
              <option value="truck">Heavy Truck</option>
              <option value="van">Delivery Van</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-vehicle-status" className="block text-caption text-text-secondary mb-1.5">
              Operational Status
            </label>
            <select
              id="filter-vehicle-status"
              value={vehicleStatus}
              onChange={(e) => setVehicleStatus(e.target.value)}
              className="block w-full rounded-[10px] border border-border-default bg-surface-0 px-3 py-2 text-body-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            >
              <option value="all">All Operational Statuses</option>
              <option value="available">Available</option>
              <option value="ontrip">On Trip</option>
              <option value="inshop">In Shop / Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-region" className="block text-caption text-text-secondary mb-1.5">
              Depot Region
            </label>
            <select
              id="filter-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="block w-full rounded-[10px] border border-border-default bg-surface-0 px-3 py-2 text-body-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            >
              <option value="all">All Regional Depots</option>
              <option value="west">West</option>
              <option value="south">South</option>
              <option value="north">North</option>
              <option value="east">East</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          className="flex items-start gap-3 rounded-[10px] p-4 text-body-sm border border-status-failed/30 bg-status-failed-bg text-status-failed"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span><strong>Error loading real-time aggregations:</strong> {error}</span>
        </div>
      )}

      {/* KPI Grid */}
      {isLoading && !kpis ? (
        <SkeletonKPI count={7} />
      ) : kpis ? (
        <div className="space-y-6">
          {/* Hero card + KPI grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Fleet Utilization Hero Card */}
            <div
              onClick={() => router.push("/vehicles")}
              className="relative overflow-hidden rounded-[14px] border border-border-subtle bg-surface-1 p-6 flex flex-col justify-between shadow-sm hover:border-accent cursor-pointer group transition-all duration-[var(--dur-fast)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-caption font-semibold uppercase tracking-wider text-text-secondary">
                    FLEET UTILIZATION
                  </span>
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent/10 text-accent group-hover:scale-110 transition-transform"
                  >
                    <TrendingUp className="h-5 w-5" strokeWidth={2} />
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-[42px] font-extrabold text-text-primary tabular-nums tracking-tight">
                    {kpis.fleetUtilization}
                  </span>
                  <span className="text-h1 font-bold text-accent">%</span>
                </div>
              </div>
              <div className="mt-6">
                <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-700"
                    style={{ width: `${kpis.fleetUtilization}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-caption text-text-tertiary">
                  <span>Vehicles On Trip ({kpis.activeVehicles})</span>
                  <span>Active Fleet ({kpis.totalVehicles - kpis.retiredVehicles})</span>
                </div>
              </div>
            </div>

            {/* Secondary KPI grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:col-span-2">
              {kpiCards.map((kpi) => (
                <div
                  key={kpi.label}
                  onClick={() => router.push(kpi.href)}
                  className="rounded-[14px] border border-border-subtle bg-surface-1 p-5 hover:border-border-default hover:shadow-md cursor-pointer group transition-all duration-[var(--dur-fast)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-overline font-semibold text-text-tertiary group-hover:text-text-secondary transition-colors">{kpi.label}</span>
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-[8px] transition-transform group-hover:scale-105"
                        style={{ backgroundColor: kpi.bg, color: kpi.color }}
                      >
                        <kpi.icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                    </div>
                    <p className="mt-3 text-[28px] font-bold text-text-primary tabular-nums tracking-tight">
                      {kpi.value}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-border-subtle">
                    <span className="text-caption text-text-tertiary">{kpi.sub}</span>
                    <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial & Operational Telemetry Banner */}
          <div className="rounded-[14px] border border-border-subtle bg-surface-1 p-6 shadow-sm">
            <h3 className="text-h3 font-bold text-text-primary mb-1">
              Financial & Operational Telemetry
            </h3>
            <p className="text-caption text-text-secondary mb-5">
              Live aggregate financial cost and fuel consumption metrics derived directly from PostgreSQL maintenance and fuel logs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div onClick={() => router.push("/expenses")} className="rounded-[10px] border border-border-subtle bg-surface-2 p-4 cursor-pointer hover:border-border-default transition-all">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-caption font-semibold uppercase tracking-wider">Operational Cost</span>
                  <DollarSign className="h-4 w-4 text-status-failed" />
                </div>
                <p className="text-h2 font-bold text-text-primary mt-1 tabular-nums">
                  ${(kpis.operationalCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-caption text-text-tertiary mt-1">Maintenance & Fuel logs total</p>
              </div>

              <div onClick={() => router.push("/expenses")} className="rounded-[10px] border border-border-subtle bg-surface-2 p-4 cursor-pointer hover:border-border-default transition-all">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-caption font-semibold uppercase tracking-wider">Total Revenue</span>
                  <DollarSign className="h-4 w-4 text-status-success" />
                </div>
                <p className="text-h2 font-bold text-text-primary mt-1 tabular-nums">
                  ${(kpis.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-caption text-text-tertiary mt-1">Completed trip revenue</p>
              </div>

              <div onClick={() => router.push("/expenses")} className="rounded-[10px] border border-border-subtle bg-surface-2 p-4 cursor-pointer hover:border-border-default transition-all">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-caption font-semibold uppercase tracking-wider">Total Fuel Volume</span>
                  <Fuel className="h-4 w-4 text-status-warning" />
                </div>
                <p className="text-h2 font-bold text-text-primary mt-1 tabular-nums">
                  {(kpis.fuelLiters ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
                </p>
                <p className="text-caption text-text-tertiary mt-1">Cumulative liters dispensed</p>
              </div>

              <div className="rounded-[10px] border border-border-subtle bg-surface-2 p-4">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-caption font-semibold uppercase tracking-wider">Fleet ROI Multiplier</span>
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
                <p className="text-h2 font-bold text-text-primary mt-1 tabular-nums">
                  {kpis.vehicleROI ?? "N/A"}{typeof kpis.vehicleROI === "number" || (typeof kpis.vehicleROI === "string" && kpis.vehicleROI !== "N/A") ? "x" : ""}
                </p>
                <p className="text-caption text-text-tertiary mt-1">Revenue vs Cost efficiency</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="text-center py-12 rounded-[14px] border border-border-subtle bg-surface-1 shadow-sm"
        >
          <p className="text-body text-text-secondary">No real-time dashboard metrics available in PostgreSQL.</p>
        </div>
      )}
    </div>
  );
}
