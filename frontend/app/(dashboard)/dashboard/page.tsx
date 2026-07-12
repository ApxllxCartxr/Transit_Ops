"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Activity,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Clock,
  UserCheck,
  TrendingUp,
  Filter
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
}

export default function DashboardPage() {
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

  // KPI card data config
  const kpiCards = kpis
    ? [
        {
          label: "ACTIVE VEHICLES",
          value: kpis.activeVehicles,
          sub: "Currently executing trips",
          icon: Activity,
          color: "var(--status-info-fg)",
          bg: "var(--status-info-bg)",
        },
        {
          label: "AVAILABLE",
          value: kpis.availableVehicles,
          sub: "Ready for assignment",
          icon: CheckCircle,
          color: "var(--status-success-fg)",
          bg: "var(--status-success-bg)",
        },
        {
          label: "IN SHOP",
          value: kpis.inShopVehicles,
          sub: "In maintenance or repair",
          icon: AlertTriangle,
          color: "var(--status-warning-fg)",
          bg: "var(--status-warning-bg)",
        },
        {
          label: "ACTIVE TRIPS",
          value: kpis.activeTrips,
          sub: "Dispatched trips on road",
          icon: Navigation,
          color: "var(--status-info-fg)",
          bg: "var(--status-info-bg)",
        },
        {
          label: "PENDING TRIPS",
          value: kpis.pendingTrips,
          sub: "Trips in Draft state",
          icon: Clock,
          color: "var(--status-warning-fg)",
          bg: "var(--status-warning-bg)",
        },
        {
          label: "DRIVERS ON-DUTY",
          value: kpis.onDutyDrivers,
          sub: "Available or executing trips",
          icon: UserCheck,
          color: "var(--status-success-fg)",
          bg: "var(--status-success-bg)",
        },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-text-primary">
            Fleet Operations Overview
          </h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Real-time tracking of active trips, drivers, and vehicle status.
          </p>
        </div>
        <button
          id="refresh-kpis-btn"
          onClick={fetchKpis}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-[10px] border border-border-default bg-surface-2 px-4 py-2 text-[13px] font-medium text-text-secondary hover:bg-surface-3 hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97] transition-all duration-[var(--dur-fast)]"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="rounded-[14px] border border-border-subtle bg-surface-2 p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-3.5 w-3.5 text-text-tertiary" strokeWidth={1.5} />
          <span className="text-overline text-text-tertiary">Filter Metrics</span>
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
              className="block w-full rounded-[10px] border border-border-default bg-surface-1 px-3 py-2 text-body-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-accent-soft transition-colors"
            >
              <option value="all">All Types</option>
              <option value="truck">Truck</option>
              <option value="van">Van</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-vehicle-status" className="block text-caption text-text-secondary mb-1.5">
              Vehicle Status
            </label>
            <select
              id="filter-vehicle-status"
              value={vehicleStatus}
              onChange={(e) => setVehicleStatus(e.target.value)}
              className="block w-full rounded-[10px] border border-border-default bg-surface-1 px-3 py-2 text-body-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-accent-soft transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="ontrip">On Trip</option>
              <option value="inshop">In Shop</option>
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
              className="block w-full rounded-[10px] border border-border-default bg-surface-1 px-3 py-2 text-body-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-accent-soft transition-colors"
            >
              <option value="all">All Regions</option>
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
          className="flex items-start gap-3 rounded-[10px] p-4 text-body-sm"
          style={{
            backgroundColor: "var(--status-failed-bg)",
            borderColor: "var(--status-failed-border)",
            color: "var(--status-failed-fg)",
            border: "1px solid var(--status-failed-border)",
          }}
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span><strong>Error:</strong> {error}</span>
        </div>
      )}

      {/* KPI Grid */}
      {isLoading && !kpis ? (
        <SkeletonKPI count={7} />
      ) : kpis ? (
        <div className="space-y-5">
          {/* Hero card + KPI grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Fleet Utilization Hero Card (DESIGN.md §7.2) */}
            <div
              className="relative overflow-hidden rounded-[14px] border border-border-subtle bg-surface-2 p-5 flex flex-col justify-between"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-overline text-text-tertiary">
                    FLEET UTILIZATION
                  </span>
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-[8px]"
                    style={{ backgroundColor: "var(--accent-primary-soft)", color: "var(--accent-primary)" }}
                  >
                    <TrendingUp className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-display-lg text-text-primary tabular-nums">
                    {kpis.fleetUtilization}
                  </span>
                  <span className="text-h2 text-text-tertiary">%</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${kpis.fleetUtilization}%`,
                      backgroundColor: "var(--accent-primary)",
                    }}
                  />
                </div>
                <span className="mt-2 block text-caption text-text-tertiary">
                  Vehicles On Trip / Total Non-Retired
                </span>
              </div>
            </div>

            {/* Secondary KPI grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:col-span-2">
              {kpiCards.map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-[14px] border border-border-subtle bg-surface-2 p-5 hover:border-border-default transition-colors duration-[var(--dur-fast)]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-overline text-text-tertiary">{kpi.label}</span>
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-[8px]"
                      style={{ backgroundColor: kpi.bg, color: kpi.color }}
                    >
                      <kpi.icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    </span>
                  </div>
                  <p className="mt-3 text-display-lg text-text-primary tabular-nums">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-caption text-text-tertiary">
                    {kpi.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="text-center py-12 rounded-[14px] border border-border-subtle bg-surface-2"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-body text-text-secondary">No dashboard metrics available.</p>
        </div>
      )}
    </div>
  );
}
