"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  RefreshCcw, 
  X, 
  AlertCircle, 
  Check, 
  Car, 
  ShieldAlert, 
  Info,
  ChevronLeft,
  ChevronRight,
  Undo2
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { isActionAllowed } from "@/lib/rbac-guards";
import { useToast } from "@/components/ui/toast";
import { SkeletonTable } from "@/components/ui/skeleton";
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

export default function VehiclesPage() {
  const { data: session } = authClient.useSession();
  const { addToast } = useToast();
  const userRole = (session?.user as any)?.role || "FleetManager";

  // Data state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");

  // Form / Drawer state
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

  // Action overrides
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

    // Odometer monotonicity validation
    if (editingVehicle) {
      const originalOdo = Number(editingVehicle.odometer_km);
      const newOdo = Number(formData.odometer_km);
      if (newOdo < originalOdo) {
        setFormError(`Odometer reading cannot decrease. Current odometer is ${originalOdo} km.`);
        return;
      }

      // Check soft lock on retired
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
        if (showReinstatePrompt) {
          payload.reinstate = true;
        }
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
    
    // Check if on trip
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

  // H12: Handle vehicle reinstatement (requires backend H11)
  const handleReinstate = async (vehicleId: string) => {
    if (!isActionAllowed(userRole, "edit", "vehicles")) {
      addToast("Access Denied: You do not have permission to reinstate vehicles.", "error");
      return;
    }

    if (confirm("Are you sure you want to reinstate this vehicle?")) {
      try {
        // Call the reinstate endpoint (H11)
        await apiClient.post(`vehicles/${vehicleId}/reinstate`, {});
        addToast("Vehicle has been reinstated successfully!", "success");
        fetchVehicles();
      } catch (err: any) {
        addToast(err.message || "Failed to reinstate vehicle.", "error");
      }
    }
  };

  const getStatusClass = (status: Vehicle["status"]) => {
    switch (status) {
      case "Available":
        return "bg-status-success/10 text-status-success border-status-success/20";
      case "OnTrip":
        return "bg-status-info/10 text-status-info border-status-info/20";
      case "InShop":
        return "bg-status-warning/10 text-status-warning border-status-warning/20";
      case "Retired":
        return "bg-status-danger/10 text-status-danger border-status-danger/20";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Header controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Vehicles Registry
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Register and manage fleet trucks, trailers, and vans.
          </p>
        </div>
        {isActionAllowed(userRole, "create", "vehicles") && (
          <button
            id="add-vehicle-btn"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>
        )}
      </div>

      {/* Search and filter panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="search-vehicle-input"
              type="text"
              placeholder="Search registration, model..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-950"
            />
          </div>

          <div>
            <select
              id="vehicle-type-filter"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-950"
            >
              <option value="all">All Types</option>
              <option value="truck">Truck</option>
              <option value="van">Van</option>
            </select>
          </div>

          <div>
            <select
              id="vehicle-status-filter"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-950"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="ontrip">On Trip</option>
              <option value="inshop">In Shop</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div>
            <select
              id="vehicle-region-filter"
              value={regionFilter}
              onChange={(e) => { setRegionFilter(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-950"
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

      {/* Main List Table */}
      {error && (
        <div className="rounded-lg bg-status-danger/10 border border-status-danger/20 p-4 text-sm text-status-danger">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Reg Number</th>
                <th className="px-6 py-4">Vehicle Details</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Max Load</th>
                <th className="px-6 py-4">Odometer</th>
                <th className="px-6 py-4">Region</th>
                <th className="px-6 py-4">Status</th>
                {isActionAllowed(userRole, "edit", "vehicles") && (
                  <th className="px-6 py-4 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-36 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded w-20 dark:bg-slate-800" /></td>
                    {isActionAllowed(userRole, "edit", "vehicles") && (
                      <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded w-12 ml-auto dark:bg-slate-800" /></td>
                    )}
                  </tr>
                ))
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={isActionAllowed(userRole, "edit", "vehicles") ? 8 : 7} className="px-6 py-12">
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
                vehicles.map((v) => (
                  <tr 
                    key={v.id} 
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                      {v.registration_number}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-50">{v.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-450">{v.model}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize">{v.vehicle_type}</td>
                    <td className="px-6 py-4">{v.max_load_kg.toLocaleString()} kg</td>
                    <td className="px-6 py-4 font-mono">{v.odometer_km.toLocaleString()} km</td>
                    <td className="px-6 py-4">{v.region}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(v.status)}`}>
                        {v.status === "OnTrip" ? "On Trip" : v.status === "InShop" ? "In Shop" : v.status}
                      </span>
                    </td>
                    {isActionAllowed(userRole, "edit", "vehicles") && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            title="Edit Vehicle"
                            onClick={() => handleOpenEdit(v)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-350"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {v.status === "Retired" ? (
                            <button
                              title="Reinstate Vehicle"
                              onClick={() => handleReinstate(v.id)}
                              className="rounded-lg p-1.5 text-status-success hover:bg-status-success/5 dark:hover:bg-status-success/10"
                            >
                              <Undo2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              title="Retire Asset"
                              onClick={() => handleRetire(v.id)}
                              className="rounded-lg p-1.5 text-status-danger hover:bg-status-danger/5 dark:hover:bg-status-danger/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {total > 8 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-850/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing {Math.min(total, (page - 1) * 8 + 1)}-{Math.min(total, page * 8)} of {total} assets
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1 || isLoading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page * 8 >= total || isLoading}
                onClick={() => setPage(p => p + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Drawer Panel */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-md transform bg-white shadow-2xl transition-transform duration-300 dark:bg-slate-900">
              
              <div className="flex h-full flex-col overflow-y-scroll border-l border-slate-200 dark:border-slate-800 py-6">
                
                {/* Drawer Header */}
                <div className="px-6 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {editingVehicle ? "Modify Asset Details" : "Register New Asset"}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Drawer Body Form */}
                <form onSubmit={handleFormSubmit} className="flex-1 px-6 mt-6 space-y-5">
                  {formError && (
                    <div className="flex items-start gap-2.5 rounded-lg bg-status-danger/10 p-3.5 text-xs text-status-danger border border-status-danger/25">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {showReinstatePrompt && (
                    <div className="flex items-start gap-3 rounded-lg bg-status-warning/10 p-4 border border-status-warning/20 text-status-warning">
                      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-2">
                        <p className="font-semibold">Reinstatement Security Check</p>
                        <p>You are about to un-retire a locked asset. This changes status to Available and re-opens allocation permissions.</p>
                        <button
                          type="submit"
                          className="rounded bg-status-warning px-3 py-1 font-semibold text-white hover:bg-status-warning/90 transition-colors"
                        >
                          Confirm Reinstate
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Registration Number
                    </label>
                    <input
                      name="registration_number"
                      required
                      placeholder="e.g. MH-12-PQ-9081"
                      disabled={editingVehicle !== null}
                      value={formData.registration_number}
                      onChange={handleFormChange}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60 focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Format: 5-15 alphanumeric characters. Locked once registered.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Brand Name
                      </label>
                      <input
                        name="name"
                        required
                        placeholder="e.g. Mercedes Benz"
                        value={formData.name}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Model Code
                      </label>
                      <input
                        name="model"
                        required
                        placeholder="e.g. Actros 2645"
                        value={formData.model}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Vehicle Type
                      </label>
                      <select
                        name="vehicle_type"
                        value={formData.vehicle_type}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                      >
                        <option value="Truck">Truck</option>
                        <option value="Van">Van</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Depot Region
                      </label>
                      <input
                        name="region"
                        required
                        placeholder="e.g. West"
                        value={formData.region}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Max Load Cap (kg)
                      </label>
                      <input
                        name="max_load_kg"
                        type="number"
                        min="1"
                        required
                        value={formData.max_load_kg}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Odometer (km)
                      </label>
                      <input
                        name="odometer_km"
                        type="number"
                        min="0"
                        step="0.1"
                        required
                        value={formData.odometer_km}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Acquisition Cost ($)
                      </label>
                      <input
                        name="acquisition_cost"
                        type="number"
                        min="0"
                        required
                        value={formData.acquisition_cost}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Acquisition Date
                      </label>
                      <input
                        name="acquired_at"
                        type="date"
                        required
                        value={formData.acquired_at}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      disabled={editingVehicle?.status === "Retired" && !showReinstatePrompt}
                      onChange={handleFormChange}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                    >
                      <option value="Available">Available</option>
                      <option value="OnTrip" disabled={!editingVehicle}>On Trip</option>
                      <option value="InShop">In Shop</option>
                      <option value="Retired">Retired</option>
                    </select>
                    {editingVehicle?.status === "Retired" && !showReinstatePrompt && (
                      <div className="flex gap-1.5 items-center mt-1 text-[11px] text-status-danger font-medium">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>Retired vehicles are locked. Toggle 'Reinstate' above.</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="flex-1 rounded-lg border border-slate-205 py-2.5 text-center text-sm font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    {!showReinstatePrompt && (
                      <button
                        type="submit"
                        className="flex-1 rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors"
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
