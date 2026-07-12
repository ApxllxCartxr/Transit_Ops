"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Navigation,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Truck,
  User,
  LayoutGrid,
  List,
  ChevronRight,
  Play,
  Check,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { isActionAllowed } from "@/lib/rbac-guards";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { normalizeAndMapRole } from "@/lib/auth-utils";

interface Trip {
  id: string;
  vehicle_id: string;
  driver_id: string;
  status: "Draft" | "Dispatched" | "Completed" | "Cancelled";
  cancelled: bool | boolean;
  created_at?: string | null;
  updated_at?: string | null;
  vehicle_name?: string | null;
  registration_number?: string | null;
  driver_name?: string | null;
}

interface PaginatedTrips {
  items: Trip[];
  total: number;
  page: number;
  size: number;
}

interface OptionItem {
  id: string;
  label: string;
  status: string;
}

export default function TripsPage() {
  const { data: sessionState } = authClient.useSession();
  const rawUserRole = (sessionState?.user as any)?.roles || (sessionState?.user as any)?.role || "FleetManager";
  const currentUserRole = normalizeAndMapRole(rawUserRole);
  const canDispatch = isActionAllowed(currentUserRole, "update", "trips") || currentUserRole === "Admin" || currentUserRole === "Dispatcher";

  const { showToast } = useToast();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  // Create Drawer state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState<OptionItem[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<OptionItem[]>([]);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    driver_id: "",
    status: "Draft",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", size: "100" });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search.trim()) params.append("search", search.trim());

      const data: PaginatedTrips = await apiClient.get(`/trips?${params.toString()}`);
      setTrips(data.items || []);
    } catch (err: any) {
      showToast({
        title: "Error loading trips",
        description: err.message || "Failed to load dispatch workflow from server.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, showToast]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const loadDropdownOptions = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        apiClient.get(`/vehicles?size=100`),
        apiClient.get(`/drivers?size=100`),
      ]);
      const vOptions = (vRes.items || []).map((v: any) => ({
        id: v.id,
        label: `${v.registration_number} (${v.vehicle_name}) - ${v.status}`,
        status: v.status,
      }));
      const dOptions = (dRes.items || []).map((d: any) => ({
        id: d.id,
        label: `${d.full_name} (${d.license_category}) - ${d.status}`,
        status: d.status,
      }));
      setAvailableVehicles(vOptions);
      setAvailableDrivers(dOptions);
    } catch (err: any) {
      console.error("Failed to load dropdown items:", err);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.vehicle_id || !formData.driver_id) {
      setFormError("Please select both a vehicle and a driver.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/trips", formData);
      showToast({
        title: "Trip Created",
        description: `Trip initialized in ${formData.status} status.`,
        type: "success",
      });
      setIsAddOpen(false);
      setFormData({ vehicle_id: "", driver_id: "", status: "Draft" });
      fetchTrips();
    } catch (err: any) {
      setFormError(err.message || "Failed to create dispatch trip.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (tripId: string, action: "dispatch" | "complete" | "cancel") => {
    try {
      await apiClient.post(`/trips/${tripId}/${action}`);
      showToast({
        title: `Trip ${action.charAt(0).toUpperCase() + action.slice(1)}ed`,
        description: `Trip state and vehicle/driver synchronization completed.`,
        type: "success",
      });
      fetchTrips();
    } catch (err: any) {
      showToast({
        title: "Action Failed",
        description: err.message || `Could not ${action} trip.`,
        type: "error",
      });
    }
  };

  // Filtered list
  const filteredTrips = trips.filter((t) => {
    if (statusFilter !== "all" && t.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchV = (t.registration_number || "").toLowerCase().includes(q) || (t.vehicle_name || "").toLowerCase().includes(q);
      const matchD = (t.driver_name || "").toLowerCase().includes(q);
      return matchV || matchD;
    }
    return true;
  });

  const draftTrips = filteredTrips.filter((t) => t.status === "Draft");
  const dispatchedTrips = filteredTrips.filter((t) => t.status === "Dispatched");
  const completedTrips = filteredTrips.filter((t) => t.status === "Completed");
  const cancelledTrips = filteredTrips.filter((t) => t.status === "Cancelled");

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <h1 className="text-h1 font-bold text-text-primary tracking-tight">
            Dispatch Workflow & Trip Kanban
          </h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Real-time assignment and live lifecycle control connecting drivers and vehicles across regional depots.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTrips}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-border-default bg-surface-1 px-3 py-2 text-caption font-medium text-text-secondary hover:bg-surface-2 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          {canDispatch && (
            <button
              onClick={() => {
                setFormError(null);
                setFormData({ vehicle_id: "", driver_id: "", status: "Draft" });
                loadDropdownOptions();
                setIsAddOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-[8px] bg-accent px-4 py-2.5 text-body-sm font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-[0.98] transition-all"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              New Dispatch Trip
            </button>
          )}
        </div>
      </div>

      {/* View Switcher & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface-1 p-4 rounded-[12px] border border-border-subtle shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by vehicle registration, model, or driver name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[8px] border border-border-default bg-surface-0 pl-9 pr-4 py-2 text-body-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {["all", "Draft", "Dispatched", "Completed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-[6px] text-caption font-medium transition-all ${
                  statusFilter === st
                    ? "bg-text-primary text-surface-0"
                    : "bg-surface-2 text-text-secondary hover:text-text-primary"
                }`}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-[8px] border border-border-default bg-surface-2 p-1">
            <button
              onClick={() => setViewMode("kanban")}
              title="Kanban Board View"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-caption font-semibold transition-all ${
                viewMode === "kanban" ? "bg-surface-1 text-accent shadow-xs" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <LayoutGrid className="h-4 w-4" /> Board
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Table View"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-caption font-semibold transition-all ${
                viewMode === "table" ? "bg-surface-1 text-accent shadow-xs" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <List className="h-4 w-4" /> Table
            </button>
          </div>
        </div>
      </div>

      {/* Loading & Empty States */}
      {loading && trips.length === 0 ? (
        <div className="p-12 text-center text-text-secondary animate-pulse">Loading live dispatch workflow...</div>
      ) : filteredTrips.length === 0 ? (
        <div className="p-12 border border-border-subtle rounded-[12px] bg-surface-1">
          <EmptyState
            icon={Navigation}
            title="No dispatch trips found"
            description="No active or historical trips match your current search criteria or status filter."
            actionLabel={statusFilter !== "all" || search ? "Reset Filters" : undefined}
            onAction={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          />
        </div>
      ) : viewMode === "kanban" ? (
        /* ── Kanban Board View ────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {/* Column 1: Draft */}
          <div className="rounded-[12px] bg-surface-2/60 border border-border-subtle p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-status-warning" />
                <span className="text-body-sm font-bold text-text-primary">Draft</span>
              </div>
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-caption font-semibold text-text-secondary">
                {draftTrips.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[120px]">
              {draftTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="rounded-[10px] border border-border-subtle bg-surface-1 p-4 shadow-xs hover:border-border-default transition-all space-y-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-body-sm font-bold text-text-primary">{trip.registration_number}</p>
                      <p className="text-caption text-text-tertiary">{trip.vehicle_name}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-[4px] bg-status-warning-bg text-status-warning text-overline font-semibold">
                      Draft
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border-subtle text-caption text-text-secondary">
                    <User className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                    <span className="truncate font-medium">{trip.driver_name}</span>
                  </div>

                  {canDispatch && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleAction(trip.id, "dispatch")}
                        className="flex-1 flex items-center justify-center gap-1 rounded-[6px] bg-accent px-3 py-1.5 text-caption font-semibold text-white hover:bg-accent/90 transition-all shadow-2xs"
                      >
                        <Play className="h-3 w-3 fill-current" /> Dispatch
                      </button>
                      <button
                        onClick={() => handleAction(trip.id, "cancel")}
                        title="Cancel trip"
                        className="p-1.5 rounded-[6px] text-text-tertiary hover:bg-status-failed-bg hover:text-status-failed transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Dispatched */}
          <div className="rounded-[12px] bg-surface-2/60 border border-border-subtle p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-status-info animate-pulse" />
                <span className="text-body-sm font-bold text-text-primary">On Road (Dispatched)</span>
              </div>
              <span className="rounded-full bg-status-info-bg px-2 py-0.5 text-caption font-semibold text-status-info">
                {dispatchedTrips.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[120px]">
              {dispatchedTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="rounded-[10px] border border-status-info/30 bg-surface-1 p-4 shadow-xs hover:border-status-info transition-all space-y-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-body-sm font-bold text-text-primary">{trip.registration_number}</p>
                      <p className="text-caption text-text-tertiary">{trip.vehicle_name}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-[4px] bg-status-info-bg text-status-info text-overline font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-status-info animate-ping" /> Active
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border-subtle text-caption text-text-secondary">
                    <User className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                    <span className="truncate font-medium text-text-primary">{trip.driver_name}</span>
                  </div>

                  {canDispatch && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleAction(trip.id, "complete")}
                        className="flex-1 flex items-center justify-center gap-1 rounded-[6px] bg-status-success px-3 py-1.5 text-caption font-semibold text-white hover:bg-status-success/90 transition-all shadow-2xs"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" /> Complete
                      </button>
                      <button
                        onClick={() => handleAction(trip.id, "cancel")}
                        title="Emergency Abort / Cancel"
                        className="p-1.5 rounded-[6px] text-text-tertiary hover:bg-status-failed-bg hover:text-status-failed transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div className="rounded-[12px] bg-surface-2/60 border border-border-subtle p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-status-success" />
                <span className="text-body-sm font-bold text-text-primary">Completed</span>
              </div>
              <span className="rounded-full bg-status-success-bg px-2 py-0.5 text-caption font-semibold text-status-success">
                {completedTrips.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[120px]">
              {completedTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="rounded-[10px] border border-border-subtle bg-surface-1 p-4 shadow-xs opacity-80 hover:opacity-100 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-body-sm font-bold text-text-primary">{trip.registration_number}</p>
                      <p className="text-caption text-text-tertiary">{trip.vehicle_name}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-[4px] bg-status-success-bg text-status-success text-overline font-semibold">
                      Done
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border-subtle text-caption text-text-secondary">
                    <User className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                    <span className="truncate">{trip.driver_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 4: Cancelled */}
          <div className="rounded-[12px] bg-surface-2/60 border border-border-subtle p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-status-failed" />
                <span className="text-body-sm font-bold text-text-primary">Cancelled</span>
              </div>
              <span className="rounded-full bg-status-failed-bg px-2 py-0.5 text-caption font-semibold text-status-failed">
                {cancelledTrips.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[120px]">
              {cancelledTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="rounded-[10px] border border-border-subtle bg-surface-1 p-4 shadow-xs opacity-60 hover:opacity-90 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-body-sm font-bold text-text-primary line-through">{trip.registration_number}</p>
                      <p className="text-caption text-text-tertiary">{trip.vehicle_name}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-[4px] bg-status-failed-bg text-status-failed text-overline font-semibold">
                      Aborted
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border-subtle text-caption text-text-secondary">
                    <User className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                    <span className="truncate">{trip.driver_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Table View ───────────────────────────────────────────────────── */
        <div className="rounded-[12px] border border-border-subtle bg-surface-1 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-2/60 text-overline text-text-tertiary uppercase tracking-wider">
                  <th className="py-3.5 px-5">Trip Ref</th>
                  <th className="py-3.5 px-5">Assigned Vehicle</th>
                  <th className="py-3.5 px-5">Assigned Driver</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Created At</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-body-sm">
                {filteredTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-surface-2/40 transition-colors group">
                    <td className="py-4 px-5 font-mono text-caption text-text-tertiary">
                      {trip.id.slice(0, 8)}...
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 font-semibold text-text-primary">
                        <Truck className="h-4 w-4 text-accent" />
                        {trip.registration_number} <span className="text-caption font-normal text-text-tertiary">({trip.vehicle_name})</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 font-medium text-text-primary">
                        <User className="h-4 w-4 text-text-tertiary" />
                        {trip.driver_name}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium ${
                          trip.status === "Dispatched"
                            ? "bg-status-info-bg text-status-info"
                            : trip.status === "Completed"
                            ? "bg-status-success-bg text-status-success"
                            : trip.status === "Draft"
                            ? "bg-status-warning-bg text-status-warning"
                            : "bg-status-failed-bg text-status-failed"
                        }`}
                      >
                        {trip.status === "Dispatched" && <Navigation className="h-3 w-3 animate-spin" />}
                        {trip.status === "Completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {trip.status === "Draft" && <Clock className="h-3.5 w-3.5" />}
                        {trip.status === "Cancelled" && <XCircle className="h-3.5 w-3.5" />}
                        {trip.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-text-secondary text-caption">
                      {trip.created_at ? new Date(trip.created_at).toLocaleString() : "Recent"}
                    </td>
                    <td className="py-4 px-5 text-right">
                      {canDispatch && (
                        <div className="flex items-center justify-end gap-2">
                          {trip.status === "Draft" && (
                            <button
                              onClick={() => handleAction(trip.id, "dispatch")}
                              className="rounded-[6px] bg-accent px-3 py-1 text-caption font-semibold text-white hover:bg-accent/90 transition-colors"
                            >
                              Dispatch
                            </button>
                          )}
                          {trip.status === "Dispatched" && (
                            <button
                              onClick={() => handleAction(trip.id, "complete")}
                              className="rounded-[6px] bg-status-success px-3 py-1 text-caption font-semibold text-white hover:bg-status-success/90 transition-colors"
                            >
                              Complete
                            </button>
                          )}
                          {(trip.status === "Draft" || trip.status === "Dispatched") && (
                            <button
                              onClick={() => handleAction(trip.id, "cancel")}
                              className="p-1 rounded-[6px] text-text-tertiary hover:bg-status-failed-bg hover:text-status-failed transition-colors"
                              title="Cancel Trip"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Trip Drawer ────────────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="flex h-full w-full max-w-lg flex-col bg-surface-1 border-l border-border-default shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <div>
                <h3 className="text-h3 font-bold text-text-primary">Initialize New Dispatch Trip</h3>
                <p className="text-caption text-text-secondary mt-0.5">Pair a fleet vehicle with an on-duty driver.</p>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="rounded-[6px] p-1 text-text-tertiary hover:bg-surface-3 hover:text-text-primary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="mt-6 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                {formError && (
                  <div className="rounded-[8px] bg-status-failed-bg border border-status-failed/30 p-3 text-caption text-status-failed flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-caption font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    Assign Fleet Vehicle *
                  </label>
                  <select
                    required
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full rounded-[8px] border border-border-default bg-surface-0 px-3.5 py-2.5 text-body-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
                  >
                    <option value="">Select a vehicle...</option>
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-caption font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    Assign Driver *
                  </label>
                  <select
                    required
                    value={formData.driver_id}
                    onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                    className="w-full rounded-[8px] border border-border-default bg-surface-0 px-3.5 py-2.5 text-body-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
                  >
                    <option value="">Select a driver...</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-caption font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Initial Dispatch State *
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: "Draft" })}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-[8px] border py-3 px-4 text-body-sm font-medium transition-all ${
                        formData.status === "Draft"
                          ? "border-status-warning bg-status-warning-bg text-status-warning shadow-xs"
                          : "border-border-default bg-surface-0 text-text-secondary"
                      }`}
                    >
                      <Clock className="h-4 w-4" /> Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: "Dispatched" })}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-[8px] border py-3 px-4 text-body-sm font-medium transition-all ${
                        formData.status === "Dispatched"
                          ? "border-status-info bg-status-info-bg text-status-info shadow-xs"
                          : "border-border-default bg-surface-0 text-text-secondary"
                      }`}
                    >
                      <Navigation className="h-4 w-4" /> Dispatch Immediately
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-[8px] border border-border-default px-4 py-2 text-body-sm font-medium text-text-secondary hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-[8px] bg-accent px-5 py-2 text-body-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Processing..." : "Create Dispatch Trip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
