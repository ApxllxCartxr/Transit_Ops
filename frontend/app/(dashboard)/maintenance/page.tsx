"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Wrench, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Vehicle } from "@/types/api";
import type { MaintenanceLog, PaginatedMaintenance } from "@/types/api";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Open", label: "Open" },
  { value: "Closed", label: "Closed" },
];

export default function MaintenancePage() {
  const { data: session } = authClient.useSession();
  const { addToast } = useToast();
  const userRole = (session?.user as any)?.role || "FleetManager";

  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchMaintenance = useCallback(async () => {
    setIsLoading(true);
    setFormError(null);

    try {
      const query = new URLSearchParams();
      query.set("page", String(page));
      query.set("size", "20");
      if (filterStatus !== "all") {
        query.set("status", filterStatus);
      }

      const data = await apiClient.get<PaginatedMaintenance>(
        `maintenance?${query.toString()}`
      );
      setMaintenanceLogs(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setFormError(err.message || "Unable to load maintenance logs.");
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, page]);

  const fetchVehicles = useCallback(async () => {
    setIsVehiclesLoading(true);
    try {
      const data = await apiClient.get<{ items: Vehicle[] }>("vehicles?size=200");
      setVehicles(data.items);
    } catch (err: any) {
      addToast(err.message || "Unable to load vehicle list.", "error");
    } finally {
      setIsVehiclesLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMaintenance();
  }, [fetchMaintenance]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleOpenMaintenance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!selectedVehicleId) {
      setFormError("Please select a vehicle to place into maintenance.");
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post("maintenance/open", {
        vehicle_id: selectedVehicleId,
      });
      addToast("Maintenance opened successfully.", "success");
      setSelectedVehicleId("");
      fetchMaintenance();
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.message || "Failed to open maintenance.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseMaintenance = async (maintenanceId: string) => {
    setFormError(null);
    setIsSaving(true);

    try {
      await apiClient.post(`maintenance/${maintenanceId}/close`, {});
      addToast("Maintenance closed.", "success");
      fetchMaintenance();
      fetchVehicles();
    } catch (err: any) {
      addToast(err.message || "Failed to close maintenance.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const openableVehicles = vehicles.filter((vehicle) => vehicle.status !== "OnTrip");

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Maintenance Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track and manage vehicle maintenance events and lifecycle status.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Active maintenance roster
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                View open and recently closed maintenance records.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              <CheckCircle className="h-4 w-4 text-status-success" />
              {total} records
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span>Status:</span>
              <select
                value={filterStatus}
                onChange={(event) => {
                  setFilterStatus(event.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
              <SkeletonTable rows={5} columns={6} />
            </div>
          ) : maintenanceLogs.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No maintenance logs yet"
              description="Open maintenance for a vehicle to begin tracking service events."
              action={{
                label: "Choose a vehicle",
                onClick: () => {
                  const select = document.getElementById("vehicle-select");
                  select?.scrollIntoView({ behavior: "smooth", block: "center" });
                },
              }}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 text-left dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Vehicle</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Vehicle State</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Opened</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Closed</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-300 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {maintenanceLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">
                        <div className="font-medium">
                          {log.vehicle_registration_number || log.vehicle_id}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {log.vehicle_name || "Unknown vehicle"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            log.status === "Open"
                              ? "bg-status-warning/10 text-status-warning"
                              : "bg-status-success/10 text-status-success"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {log.vehicle_status}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {new Date(log.opened_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {log.closed_at ? new Date(log.closed_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-4 text-right text-sm">
                        {log.status === "Open" ? (
                          <button
                            type="button"
                            onClick={() => handleCloseMaintenance(log.id)}
                            disabled={isSaving}
                            className="inline-flex items-center rounded-lg bg-status-success px-3 py-2 text-sm font-semibold text-white transition hover:bg-status-success/90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Close
                          </button>
                        ) : (
                          <span className="text-sm text-slate-500 dark:text-slate-400">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Open new maintenance</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Choose a vehicle and start a maintenance record.
              </p>
            </div>
          </div>

          <form onSubmit={handleOpenMaintenance} className="space-y-4">
            <div>
              <label htmlFor="vehicle-select" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Vehicle
              </label>
              <select
                id="vehicle-select"
                value={selectedVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                disabled={isVehiclesLoading}
              >
                <option value="">Select a vehicle...</option>
                {openableVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration_number} — {vehicle.name} ({vehicle.status})
                  </option>
                ))}
              </select>
            </div>

            {formError ? (
              <div className="rounded-md border border-status-danger/20 bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
                {formError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSaving || isVehiclesLoading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? "Processing..." : "Open Maintenance"}
            </button>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <strong>Note:</strong> Maintenance operations are protected by backend RBAC for Admin and Fleet Manager roles.
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
