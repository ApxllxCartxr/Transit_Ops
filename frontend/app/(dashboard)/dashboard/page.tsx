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
  Loader2, 
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header / Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Fleet Operations Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time tracking of active trips, drivers, and vehicle status.
          </p>
        </div>
        <div>
          <button
            id="refresh-kpis-btn"
            onClick={fetchKpis}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-850 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Filter Bar Component */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          Filter Fleet Metrics
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="filter-vehicle-type" className="block text-xs font-medium text-slate-500 dark:text-slate-450 mb-1">
              Vehicle Type
            </label>
            <select
              id="filter-vehicle-type"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-slate-55 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="all">All Types</option>
              <option value="truck">Truck</option>
              <option value="van">Van</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-vehicle-status" className="block text-xs font-medium text-slate-500 dark:text-slate-450 mb-1">
              Vehicle Status
            </label>
            <select
              id="filter-vehicle-status"
              value={vehicleStatus}
              onChange={(e) => setVehicleStatus(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-slate-55 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="ontrip">On Trip</option>
              <option value="inshop">In Shop</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-region" className="block text-xs font-medium text-slate-500 dark:text-slate-450 mb-1">
              Depot Region
            </label>
            <select
              id="filter-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-slate-55 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
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

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-status-danger/10 border border-status-danger/20 p-4 text-sm text-status-danger">
          <strong>Error Loading Metrics:</strong> {error}
        </div>
      )}

      {/* KPI Grid */}
      {isLoading && !kpis ? (
        <SkeletonKPI />
      ) : kpis ? (
        <div className="space-y-6">
          {/* Main Hero utilization KPI & secondary KPIs */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Fleet Utilization Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Fleet Utilization
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {kpis.fleetUtilization}%
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-slate-100 rounded-full h-2 dark:bg-slate-800">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${kpis.fleetUtilization}%` }}
                  />
                </div>
                <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
                  Formula: (Vehicles On Trip / Total Non-Retired)
                </span>
              </div>
            </div>

            {/* Grid for other 6 KPIs */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:col-span-2">
              
              {/* Active Vehicles (OnTrip -> Blue) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Vehicles</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-info/10 text-status-info">
                    <Activity className="h-4.5 w-4.5" />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{kpis.activeVehicles}</p>
                <p className="text-xs text-slate-500 mt-1 dark:text-slate-405">Currently executing trips</p>
              </div>

              {/* Available Vehicles (Available -> Green) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Available Vehicles</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-success/10 text-status-success">
                    <CheckCircle className="h-4.5 w-4.5" />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{kpis.availableVehicles}</p>
                <p className="text-xs text-slate-500 mt-1 dark:text-slate-405">Ready for assignment</p>
              </div>

              {/* In Shop Vehicles (InShop -> Amber) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">In-Shop Vehicles</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{kpis.inShopVehicles}</p>
                <p className="text-xs text-slate-500 mt-1 dark:text-slate-405">In maintenance or repair</p>
              </div>

              {/* Active Trips (Dispatched -> Blue) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Trips</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-info/10 text-status-info">
                    <Navigation className="h-4.5 w-4.5" />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{kpis.activeTrips}</p>
                <p className="text-xs text-slate-500 mt-1 dark:text-slate-405">Dispatched trips on road</p>
              </div>

              {/* Pending Trips (Draft -> Amber) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Trips</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning">
                    <Clock className="h-4.5 w-4.5" />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{kpis.pendingTrips}</p>
                <p className="text-xs text-slate-500 mt-1 dark:text-slate-405">Trips in Draft state</p>
              </div>

              {/* On-duty Drivers (Available/OnTrip -> Green) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Drivers On-Duty</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-success/10 text-status-success">
                    <UserCheck className="h-4.5 w-4.5" />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{kpis.onDutyDrivers}</p>
                <p className="text-xs text-slate-500 mt-1 dark:text-slate-405">Available or executing trips</p>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">No dashboard metrics available.</p>
        </div>
      )}
    </div>
  );
}
