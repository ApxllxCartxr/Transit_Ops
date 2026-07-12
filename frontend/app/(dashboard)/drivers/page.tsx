"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  AlertCircle, 
  Check, 
  Users, 
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { isActionAllowed } from "@/lib/rbac-guards";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";

interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  license_category: string;
  license_expiry: string; // YYYY-MM-DD
  contact_number: string;
  safety_score: number;
  status: "Available" | "OnTrip" | "OffDuty" | "Suspended";
}

interface PaginatedDrivers {
  items: Driver[];
  total: number;
  page: number;
  size: number;
}

export default function DriversPage() {
  const { data: session } = authClient.useSession();
  const { addToast } = useToast();
  const userRole = (session?.user as any)?.role || "SafetyOfficer";

  // Data states
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    license_number: "",
    license_category: "HMV",
    license_expiry: "",
    contact_number: "",
    safety_score: "100",
    status: "Available" as Driver["status"],
  });

  const fetchDrivers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("page", String(page));
      query.set("size", "8");
      if (search) query.set("search", search);
      if (statusFilter !== "all") query.set("status", statusFilter);

      const data = await apiClient.get<PaginatedDrivers>(`drivers?${query.toString()}`);
      setDrivers(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve drivers roster.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // License expiry helper calculations
  const getLicenseWarning = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        type: "expired",
        label: "Expired",
        colorClass: "bg-status-danger/10 border-status-danger/25 text-status-danger",
      };
    } else if (diffDays <= 30) {
      return {
        type: "expiring-soon",
        label: `Expires in ${diffDays}d`,
        colorClass: "bg-status-warning/10 border-status-warning/25 text-status-warning",
      };
    }
    return null;
  };

  const handleOpenCreate = () => {
    if (!isActionAllowed(userRole, "create", "drivers")) {
      addToast("Access Denied: You do not have permission to add drivers.", "error");
      return;
    }
    setEditingDriver(null);
    setFormError(null);
    setFormData({
      full_name: "",
      license_number: "",
      license_category: "HMV",
      license_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      contact_number: "",
      safety_score: "100",
      status: "Available",
    });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    if (!isActionAllowed(userRole, "edit", "drivers")) {
      addToast("Access Denied: You do not have permission to edit drivers.", "error");
      return;
    }
    setEditingDriver(driver);
    setFormError(null);
    setFormData({
      full_name: driver.full_name,
      license_number: driver.license_number,
      license_category: driver.license_category,
      license_expiry: driver.license_expiry,
      contact_number: driver.contact_number,
      safety_score: String(driver.safety_score),
      status: driver.status,
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

    // Score validation
    const score = Number(formData.safety_score);
    if (isNaN(score) || score < 0 || score > 100) {
      setFormError("Safety score must be a number between 0 and 100.");
      return;
    }

    try {
      const payload = {
        full_name: formData.full_name,
        license_number: formData.license_number.toUpperCase(),
        license_category: formData.license_category,
        license_expiry: formData.license_expiry,
        contact_number: formData.contact_number,
        safety_score: score,
        status: formData.status,
      };

      if (editingDriver) {
        await apiClient.patch(`drivers/${editingDriver.id}`, payload);
        addToast("Driver profile updated.", "success");
      } else {
        await apiClient.post("drivers", payload);
        addToast("Driver registered successfully.", "success");
      }

      setDrawerOpen(false);
      fetchDrivers();
    } catch (err: any) {
      setFormError(err.message || "Failed to save driver profile.");
    }
  };

  const handleDelete = async (driverId: string) => {
    if (!isActionAllowed(userRole, "delete", "drivers")) {
      addToast("Access Denied: You do not have permission to remove drivers.", "error");
      return;
    }

    const d = drivers.find(item => item.id === driverId);
    if (d && d.status === "OnTrip") {
      addToast("Cannot remove a driver currently executing a trip.", "error");
      return;
    }

    if (confirm("Are you sure you want to remove this driver from the roster? This cannot be undone.")) {
      try {
        await apiClient.delete(`drivers/${driverId}`);
        addToast("Driver removed from roster.", "success");
        fetchDrivers();
      } catch (err: any) {
        addToast(err.message || "Failed to remove driver.", "error");
      }
    }
  };

  const getStatusClass = (status: Driver["status"]) => {
    switch (status) {
      case "Available":
        return "bg-status-success/10 text-status-success border-status-success/20";
      case "OnTrip":
        return "bg-status-info/10 text-status-info border-status-info/20";
      case "OffDuty":
        return "bg-status-warning/10 text-status-warning border-status-warning/20";
      case "Suspended":
        return "bg-status-danger/10 text-status-danger border-status-danger/20";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-status-success";
    if (score >= 75) return "text-status-info";
    if (score >= 50) return "text-status-warning";
    return "text-status-danger";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Header controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Drivers Roster
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor driver compliance, licensing validity, and safety performance scores.
          </p>
        </div>
        {isActionAllowed(userRole, "create", "drivers") && (
          <button
            id="add-driver-btn"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Register Driver
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="search-driver-input"
              type="text"
              placeholder="Search driver name, license number, contact..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-950"
            />
          </div>

          <div>
            <select
              id="driver-status-filter"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-950"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="ontrip">On Trip</option>
              <option value="offduty">Off Duty</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* List error */}
      {error && (
        <div className="rounded-lg bg-status-danger/10 border border-status-danger/20 p-4 text-sm text-status-danger">
          {error}
        </div>
      )}

      {/* Roster list table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Driver Name</th>
                <th className="px-6 py-4">License Code</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">License Expiry</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Safety Score</th>
                <th className="px-6 py-4">Status</th>
                {isActionAllowed(userRole, "edit", "drivers") && (
                  <th className="px-6 py-4 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-28 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-12 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-28 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-10 dark:bg-slate-800" /></td>
                    <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded w-16 dark:bg-slate-800" /></td>
                    {isActionAllowed(userRole, "edit", "drivers") && (
                      <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded w-12 ml-auto dark:bg-slate-800" /></td>
                    )}
                  </tr>
                ))
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={isActionAllowed(userRole, "edit", "drivers") ? 8 : 7} className="px-6 py-12">
                    <EmptyState
                      icon={Users}
                      title="No drivers registered"
                      description={search || statusFilter !== "all" ? "Try adjusting your filters or search terms" : "Register your first driver to get started"}
                      action={!search && statusFilter === "all" && isActionAllowed(userRole, "create", "drivers") ? {
                        label: "Register Driver",
                        onClick: handleOpenCreate
                      } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                drivers.map((d) => {
                  const warning = getLicenseWarning(d.license_expiry);
                  return (
                    <tr 
                      key={d.id} 
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {d.full_name}
                      </td>
                      <td className="px-6 py-4 font-mono">{d.license_number}</td>
                      <td className="px-6 py-4">{d.license_category}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono">{d.license_expiry}</span>
                          {warning && (
                            <span className={`inline-flex items-center gap-1 self-start rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${warning.colorClass}`}>
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              {warning.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{d.contact_number}</td>
                      <td className="px-6 py-4 font-bold">
                        <span className={getScoreColor(d.safety_score)}>{d.safety_score}/100</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(d.status)}`}>
                          {d.status === "OnTrip" ? "On Trip" : d.status === "OffDuty" ? "Off Duty" : d.status}
                        </span>
                      </td>
                      {isActionAllowed(userRole, "edit", "drivers") && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              title="Edit Driver Details"
                              onClick={() => handleOpenEdit(d)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-350"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              title="Remove Driver"
                              onClick={() => handleDelete(d.id)}
                              className="rounded-lg p-1.5 text-status-danger hover:bg-status-danger/5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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

        {/* Pagination bar */}
        {total > 8 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-850/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing {Math.min(total, (page - 1) * 8 + 1)}-{Math.min(total, page * 8)} of {total} drivers
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
                    <Users className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {editingDriver ? "Edit Driver Details" : "Register Driver"}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleFormSubmit} className="flex-1 px-6 mt-6 space-y-5">
                  {formError && (
                    <div className="flex items-start gap-2.5 rounded-lg bg-status-danger/10 p-3.5 text-xs text-status-danger border border-status-danger/25">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      name="full_name"
                      required
                      placeholder="e.g. Rajesh Kumar"
                      value={formData.full_name}
                      onChange={handleFormChange}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      License Number
                    </label>
                    <input
                      name="license_number"
                      required
                      placeholder="e.g. DL-1420190087654"
                      value={formData.license_number}
                      onChange={handleFormChange}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        name="license_category"
                        value={formData.license_category}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                      >
                        <option value="HMV">HMV (Heavy Motor)</option>
                        <option value="LMV">LMV (Light Motor)</option>
                        <option value="Class A">Class A Commercial</option>
                        <option value="Class B">Class B Commercial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        License Expiry
                      </label>
                      <div className="relative">
                        <input
                          name="license_expiry"
                          type="date"
                          required
                          value={formData.license_expiry}
                          onChange={handleFormChange}
                          className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Contact Number
                      </label>
                      <input
                        name="contact_number"
                        required
                        placeholder="e.g. +91 98765 43210"
                        value={formData.contact_number}
                        onChange={handleFormChange}
                        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Safety Score (0-100)
                      </label>
                      <input
                        name="safety_score"
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={formData.safety_score}
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
                      onChange={handleFormChange}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
                    >
                      <option value="Available">Available</option>
                      <option value="OnTrip" disabled={!editingDriver}>On Trip</option>
                      <option value="OffDuty">Off Duty</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  {formData.license_expiry && (
                    (() => {
                      const warning = getLicenseWarning(formData.license_expiry);
                      if (warning?.type === "expired") {
                        return (
                          <div className="flex gap-2 items-start rounded-lg bg-status-danger/10 border border-status-danger/20 p-3.5 text-xs text-status-danger">
                            <Info className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                            <span>Warning: This license is expired. If saved, this driver will be excluded from new trip assignments.</span>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="flex-1 rounded-lg border border-slate-205 py-2.5 text-center text-sm font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors"
                    >
                      {editingDriver ? "Save Changes" : "Register Driver"}
                    </button>
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
