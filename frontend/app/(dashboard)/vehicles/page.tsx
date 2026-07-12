"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  AlertCircle,
  Car,
  ShieldAlert,
  Info,
  ChevronLeft,
  ChevronRight,
  Undo2,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { isActionAllowed } from "@/lib/rbac-guards";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";

interface Vehicle {
  id: string;
  registration_number: string;
  name: string;
  model: string;
  vehicle_type: string;
  max_load_kg: number;
  odometer_km: number;
  acquisition_cost: number;
  acquired_at: string;
  status: "Available" | "OnTrip" | "InShop" | "Retired";
  region: string;
}

interface PaginatedVehicles {
  items: Vehicle[];
  total: number;
  page: number;
  size: number;
}

// Status pill config (DESIGN.md §7.3)
const STATUS_CONFIG: Record<Vehicle["status"], { icon: typeof CheckCircle2; label: string; token: string }> = {
  Available: { icon: CheckCircle2, label: "Available", token: "success" },
  OnTrip:    { icon: Activity,     label: "On Trip",   token: "info" },
  InShop:    { icon: AlertTriangle,label: "In Shop",   token: "warning" },
  Retired:   { icon: Clock,        label: "Retired",   token: "muted" },
};

export default function VehiclesPage() {
  const { data: session } = authClient.useSession();
  const { addToast } = useToast();
  const userRole = (session?.user as any)?.role || "FleetManager";

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    registration_number: "",
    name: "",
    model: "",
    vehicle_type: "Truck",
    max_load_kg: "",
    odometer_km: "",
    acquisition_cost: "",
    acquired_at: "",
    status: "Available" as Vehicle["status"],
    region: "",
  });

  const [showReinstatePrompt, setShowReinstatePrompt] = useState(false);

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("page", String(page));
      query.set("size", "8");
      if (search) query.set("search", search);
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (typeFilter !== "all") query.set("type", typeFilter);
      if (regionFilter !== "all") query.set("region", regionFilter);

      const data = await apiClient.get<PaginatedVehicles>(`vehicles?${query.toString()}`);
      setVehicles(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Failed to fetch vehicle list.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, regionFilter]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleOpenCreate = () => {
    if (!isActionAllowed(userRole, "create", "vehicles")) {
      addToast("Access Denied: You do not have permission to add vehicles.", "error");
      return;
    }
    setEditingVehicle(null);
    setFormError(null);
    setShowReinstatePrompt(false);
    setFormData({
      registration_number: "",
      name: "",
      model: "",
      vehicle_type: "Truck",
      max_load_kg: "15000",
      odometer_km: "0",
      acquisition_cost: "50000",
      acquired_at: new Date().toISOString().split("T")[0],
      status: "Available",
      region: "West",
    });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    if (!isActionAllowed(userRole, "edit", "vehicles")) {
      addToast("Access Denied: You do not have permission to edit vehicles.", "error");
      return;
    }
    setEditingVehicle(vehicle);
    setFormError(null);
    setShowReinstatePrompt(false);
    setFormData({
      registration_number: vehicle.registration_number,
      name: vehicle.name,
      model: vehicle.model,
      vehicle_type: vehicle.vehicle_type,
      max_load_kg: String(vehicle.max_load_kg),
      odometer_km: String(vehicle.odometer_km),
      acquisition_cost: String(vehicle.acquisition_cost),
      acquired_at: vehicle.acquired_at,
      status: vehicle.status,
      region: vehicle.region,
    });
    setDrawerOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (editingVehicle) {
      const originalOdo = Number(editingVehicle.odometer_km);
      const newOdo = Number(formData.odometer_km);
      if (newOdo < originalOdo) {
        setFormError(`Odometer reading cannot decrease. Current odometer is ${originalOdo} km.`);
        return;
      }
      if (editingVehicle.status === "Retired" && formData.status !== "Retired" && !showReinstatePrompt) {
        setShowReinstatePrompt(true);
        return;
      }
    }

    try {
      const payload: any = {
        registration_number: formData.registration_number,
        name: formData.name,
        model: formData.model,
        vehicle_type: formData.vehicle_type,
        max_load_kg: Number(formData.max_load_kg),
        odometer_km: Number(formData.odometer_km),
        acquisition_cost: Number(formData.acquisition_cost),
        status: formData.status,
        region: formData.region,
        acquired_at: formData.acquired_at,
      };

      if (editingVehicle) {
        if (showReinstatePrompt) payload.reinstate = true;
        await apiClient.patch(`vehicles/${editingVehicle.id}`, payload);
        addToast("Vehicle updated successfully!", "success");
      } else {
        await apiClient.post("vehicles", payload);
        addToast("Vehicle added to registry!", "success");
      }

      setDrawerOpen(false);
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.message || "An error occurred while saving the vehicle.");
    }
  };

  const handleRetire = async (vehicleId: string) => {
    if (!isActionAllowed(userRole, "delete", "vehicles")) {
      addToast("Access Denied: You do not have permission to retire vehicles.", "error");
      return;
    }
    const v = vehicles.find(item => item.id === vehicleId);
    if (v && v.status === "OnTrip") {
      addToast("Cannot retire a vehicle while it is currently executing a trip.", "error");
      return;
    }
    if (confirm("Are you sure you want to retire this vehicle? This will place a soft-lock on this asset.")) {
      try {
        await apiClient.delete(`vehicles/${vehicleId}`);
        addToast("Vehicle has been retired.", "success");
        fetchVehicles();
      } catch (err: any) {
        addToast(err.message || "Failed to retire vehicle.", "error");
      }
    }
  };

  const handleReinstate = async (vehicleId: string) => {
    if (!isActionAllowed(userRole, "edit", "vehicles")) {
      addToast("Access Denied: You do not have permission to reinstate vehicles.", "error");
      return;
    }
    if (confirm("Are you sure you want to reinstate this vehicle?")) {
      try {
        await apiClient.post(`vehicles/${vehicleId}/reinstate`, {});
        addToast("Vehicle has been reinstated successfully!", "success");
        fetchVehicles();
      } catch (err: any) {
        addToast(err.message || "Failed to reinstate vehicle.", "error");
      }
    }
  };

  // Shared input classes
  const inputCls = "block w-full rounded-[10px] border border-border-default bg-surface-1 px-3 py-2 text-body-sm text-text-primary placeholder:text-text-disabled focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-accent-soft transition-colors disabled:opacity-50";
  const labelCls = "block text-overline text-text-tertiary mb-1.5";

  return (
    <div className="space-y-5 max-w-7xl mx-auto relative">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-text-primary">Vehicles Registry</h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Register and manage fleet trucks, trailers, and vans.
          </p>
        </div>
        {isActionAllowed(userRole, "create", "vehicles") && (
          <button
            id="add-vehicle-btn"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-[14px] font-medium text-white hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-[0.97] transition-all duration-[var(--dur-fast)]"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add Vehicle
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div
        className="rounded-[14px] border border-border-subtle bg-surface-2 p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-text-disabled" strokeWidth={1.5} />
            </div>
            <input
              id="search-vehicle-input"
              type="text"
              placeholder="Search registration, model..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`${inputCls} pl-9`}
            />
          </div>
          <select
            id="vehicle-type-filter"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className={inputCls}
          >
            <option value="all">All Types</option>
            <option value="truck">Truck</option>
            <option value="van">Van</option>
          </select>
          <select
            id="vehicle-status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className={inputCls}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="ontrip">On Trip</option>
            <option value="inshop">In Shop</option>
            <option value="retired">Retired</option>
          </select>
          <select
            id="vehicle-region-filter"
            value={regionFilter}
            onChange={(e) => { setRegionFilter(e.target.value); setPage(1); }}
            className={inputCls}
          >
            <option value="all">All Regions</option>
            <option value="west">West</option>
            <option value="south">South</option>
            <option value="north">North</option>
            <option value="east">East</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-3 rounded-[10px] border p-4 text-body-sm"
          style={{
            backgroundColor: "var(--status-failed-bg)",
            borderColor: "var(--status-failed-border)",
            color: "var(--status-failed-fg)",
          }}
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table (DESIGN.md §7.4) */}
      <div
        className="overflow-hidden rounded-[14px] border border-border-subtle bg-surface-2"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-1">
                <th className="px-4 first:pl-5 py-3 text-overline text-text-tertiary font-medium">Reg Number</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">Vehicle Details</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">Type</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">Max Load</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">Odometer</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">Region</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">Status</th>
                {isActionAllowed(userRole, "edit", "vehicles") && (
                  <th className="px-4 pr-5 py-3 text-overline text-text-tertiary font-medium text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 first:pl-5 py-3.5"><div className="h-4 w-24 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-36 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-16 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-20 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-20 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-16 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-20 rounded-full animate-shimmer" /></td>
                    {isActionAllowed(userRole, "edit", "vehicles") && (
                      <td className="px-4 py-3.5"><div className="h-5 w-14 rounded animate-shimmer ml-auto" /></td>
                    )}
                  </tr>
                ))
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={isActionAllowed(userRole, "edit", "vehicles") ? 8 : 7} className="px-4 py-8">
                    <EmptyState
                      icon={Car}
                      title="No vehicles found"
                      description={search || statusFilter !== "all" || typeFilter !== "all" ? "Try adjusting your filters or search terms" : "Create your first vehicle to get started"}
                      action={!search && statusFilter === "all" && typeFilter === "all" && isActionAllowed(userRole, "create", "vehicles") ? {
                        label: "Add Vehicle",
                        onClick: handleOpenCreate
                      } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => {
                  const sc = STATUS_CONFIG[v.status];
                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-surface-3 transition-colors duration-[100ms]"
                      style={{ height: "52px" }}
                    >
                      <td className="px-4 first:pl-5 py-3 text-mono-data text-text-primary font-semibold">
                        {v.registration_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-body-sm font-medium text-text-primary">{v.name}</div>
                        <div className="text-caption text-text-tertiary">{v.model}</div>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-text-secondary capitalize">{v.vehicle_type}</td>
                      <td className="px-4 py-3 text-body-sm text-text-secondary tabular-nums">{v.max_load_kg.toLocaleString()} kg</td>
                      <td className="px-4 py-3 text-mono-data text-text-secondary">{v.odometer_km.toLocaleString()} km</td>
                      <td className="px-4 py-3 text-body-sm text-text-secondary">{v.region}</td>
                      <td className="px-4 py-3">
                        {/* Status Pill (DESIGN.md §7.3) */}
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border"
                          style={{
                            color: `var(--status-${sc.token}-fg)`,
                            backgroundColor: `var(--status-${sc.token}-bg)`,
                            borderColor: `var(--status-${sc.token}-border)`,
                          }}
                        >
                          <sc.icon className="h-3.5 w-3.5" strokeWidth={2} />
                          {sc.label}
                        </span>
                      </td>
                      {isActionAllowed(userRole, "edit", "vehicles") && (
                        <td className="px-4 pr-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              title="Edit Vehicle"
                              onClick={() => handleOpenEdit(v)}
                              className="rounded-[6px] p-1.5 text-text-tertiary hover:bg-surface-3 hover:text-text-primary transition-colors duration-[80ms]"
                            >
                              <Edit className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                            {v.status === "Retired" ? (
                              <button
                                title="Reinstate Vehicle"
                                onClick={() => handleReinstate(v.id)}
                                className="rounded-[6px] p-1.5 hover:bg-status-success-bg transition-colors duration-[80ms]"
                                style={{ color: "var(--status-success-fg)" }}
                              >
                                <Undo2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            ) : (
                              <button
                                title="Retire Asset"
                                onClick={() => handleRetire(v.id)}
                                className="rounded-[6px] p-1.5 hover:bg-status-failed-bg transition-colors duration-[80ms]"
                                style={{ color: "var(--status-failed-fg)" }}
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 8 && (
          <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3">
            <span className="text-caption text-text-tertiary tabular-nums">
              Showing {Math.min(total, (page - 1) * 8 + 1)}–{Math.min(total, page * 8)} of {total} assets
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page === 1 || isLoading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border-default bg-surface-1 text-text-secondary hover:bg-surface-3 hover:text-text-primary disabled:opacity-40 transition-colors duration-[80ms]"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button
                disabled={page * 8 >= total || isLoading}
                onClick={() => setPage(p => p + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-border-default bg-surface-1 text-text-secondary hover:bg-surface-3 hover:text-text-primary disabled:opacity-40 transition-colors duration-[80ms]"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Drawer (DESIGN.md Elevation Level 3) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[12px] transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div
              className="pointer-events-auto w-screen max-w-md bg-surface-2 border-l border-border-subtle"
              style={{ boxShadow: "var(--shadow-modal)" }}
            >
              <div className="flex h-full flex-col overflow-y-auto py-5">
                {/* Drawer header */}
                <div className="px-5 flex items-center justify-between border-b border-border-subtle pb-4">
                  <div className="flex items-center gap-2.5">
                    <Car className="h-5 w-5 text-accent" strokeWidth={1.5} />
                    <h2 className="text-h3 text-text-primary">
                      {editingVehicle ? "Modify Asset Details" : "Register New Asset"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-[6px] p-1.5 text-text-tertiary hover:bg-surface-3 hover:text-text-primary transition-colors duration-[80ms]"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleFormSubmit} className="flex-1 px-5 mt-5 space-y-4">
                  {formError && (
                    <div
                      className="flex items-start gap-2.5 rounded-[10px] border p-3 text-caption"
                      style={{
                        backgroundColor: "var(--status-failed-bg)",
                        borderColor: "var(--status-failed-border)",
                        color: "var(--status-failed-fg)",
                      }}
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span>{formError}</span>
                    </div>
                  )}

                  {showReinstatePrompt && (
                    <div
                      className="flex items-start gap-3 rounded-[10px] border p-4"
                      style={{
                        backgroundColor: "var(--status-warning-bg)",
                        borderColor: "var(--status-warning-border)",
                        color: "var(--status-warning-fg)",
                      }}
                    >
                      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div className="text-caption space-y-2">
                        <p className="font-semibold">Reinstatement Security Check</p>
                        <p>You are about to un-retire a locked asset. This changes status to Available and re-opens allocation permissions.</p>
                        <button
                          type="submit"
                          className="rounded-[6px] px-3 py-1 font-medium text-white transition-colors"
                          style={{ backgroundColor: "var(--status-warning-fg)" }}
                        >
                          Confirm Reinstate
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Registration Number</label>
                    <input
                      name="registration_number"
                      required
                      placeholder="e.g. MH-12-PQ-9081"
                      disabled={editingVehicle !== null}
                      value={formData.registration_number}
                      onChange={handleFormChange}
                      className={inputCls}
                    />
                    <p className="text-[10px] text-text-disabled mt-1">Format: 5-15 alphanumeric characters. Locked once registered.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Brand Name</label>
                      <input name="name" required placeholder="e.g. Mercedes Benz" value={formData.name} onChange={handleFormChange} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Model Code</label>
                      <input name="model" required placeholder="e.g. Actros 2645" value={formData.model} onChange={handleFormChange} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Vehicle Type</label>
                      <select name="vehicle_type" value={formData.vehicle_type} onChange={handleFormChange} className={inputCls}>
                        <option value="Truck">Truck</option>
                        <option value="Van">Van</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Depot Region</label>
                      <input name="region" required placeholder="e.g. West" value={formData.region} onChange={handleFormChange} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Max Load (kg)</label>
                      <input name="max_load_kg" type="number" min="1" required value={formData.max_load_kg} onChange={handleFormChange} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Odometer (km)</label>
                      <input name="odometer_km" type="number" min="0" step="0.1" required value={formData.odometer_km} onChange={handleFormChange} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Acquisition Cost ($)</label>
                      <input name="acquisition_cost" type="number" min="0" required value={formData.acquisition_cost} onChange={handleFormChange} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Acquisition Date</label>
                      <input name="acquired_at" type="date" required value={formData.acquired_at} onChange={handleFormChange} className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      disabled={editingVehicle?.status === "Retired" && !showReinstatePrompt}
                      onChange={handleFormChange}
                      className={inputCls}
                    >
                      <option value="Available">Available</option>
                      <option value="OnTrip" disabled={!editingVehicle}>On Trip</option>
                      <option value="InShop">In Shop</option>
                      <option value="Retired">Retired</option>
                    </select>
                    {editingVehicle?.status === "Retired" && !showReinstatePrompt && (
                      <div className="flex gap-1.5 items-center mt-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} style={{ color: "var(--status-failed-fg)" }} />
                        <span className="text-[11px] font-medium" style={{ color: "var(--status-failed-fg)" }}>
                          Retired vehicles are locked. Toggle Reinstate above.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border-subtle flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="flex-1 rounded-[10px] border border-border-default py-2.5 text-center text-body-sm font-medium text-text-secondary hover:bg-surface-3 hover:text-text-primary active:scale-[0.97] transition-all duration-[var(--dur-fast)]"
                    >
                      Cancel
                    </button>
                    {!showReinstatePrompt && (
                      <button
                        type="submit"
                        className="flex-1 rounded-[10px] bg-accent py-2.5 text-center text-body-sm font-medium text-white hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-[0.97] transition-all duration-[var(--dur-fast)]"
                      >
                        {editingVehicle ? "Save Changes" : "Register Asset"}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
