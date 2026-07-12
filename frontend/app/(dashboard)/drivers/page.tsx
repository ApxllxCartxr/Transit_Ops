"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  AlertCircle,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Activity,
  Clock,
  ShieldOff,
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
  license_expiry: string;
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

// Status config per DESIGN.md §7.3
const STATUS_CONFIG: Record<Driver["status"], { icon: typeof CheckCircle2; label: string; token: string }> = {
  Available: { icon: CheckCircle2, label: "Available", token: "success" },
  OnTrip:    { icon: Activity,     label: "On Trip",   token: "info" },
  OffDuty:   { icon: Clock,        label: "Off Duty",  token: "warning" },
  Suspended: { icon: ShieldOff,    label: "Suspended", token: "failed" },
};

export default function DriversPage() {
  const { data: session } = authClient.useSession();
  const { addToast } = useToast();
  const userRole = (session?.user as any)?.role || "SafetyOfficer";

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const getLicenseWarning = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { type: "expired", label: "Expired", token: "failed" };
    } else if (diffDays <= 30) {
      return { type: "expiring-soon", label: `Expires in ${diffDays}d`, token: "warning" };
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return "var(--status-success-fg)";
    if (score >= 75) return "var(--status-info-fg)";
    if (score >= 50) return "var(--status-warning-fg)";
    return "var(--status-failed-fg)";
  };

  // Shared input classes
  const inputCls = "block w-full rounded-[10px] border border-border-default bg-surface-1 px-3 py-2 text-body-sm text-text-primary placeholder:text-text-disabled focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-accent-soft transition-colors disabled:opacity-50";
  const labelCls = "block text-overline text-text-tertiary mb-1.5";

  return (
    <div className="space-y-5 max-w-7xl mx-auto relative">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-text-primary">Drivers Roster</h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Monitor driver compliance, licensing validity, and safety performance scores.
          </p>
        </div>
        {isActionAllowed(userRole, "create", "drivers") && (
          <button
            id="add-driver-btn"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-[14px] font-medium text-white hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-[0.97] transition-all duration-[var(--dur-fast)]"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Register Driver
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div
        className="rounded-[14px] border border-border-subtle bg-surface-2 p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-text-disabled" strokeWidth={1.5} />
            </div>
            <input
              id="search-driver-input"
              type="text"
              placeholder="Search driver name, license number, contact..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={`${inputCls} pl-9`}
            />
          </div>
          <select
            id="driver-status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className={inputCls}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="ontrip">On Trip</option>
            <option value="offduty">Off Duty</option>
            <option value="suspended">Suspended</option>
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

      {/* Data Table */}
      <div
        className="overflow-hidden rounded-[14px] border border-border-subtle bg-surface-2"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-1">
                <th className="px-4 first:pl-5 py-3 text-overline text-text-tertiary font-medium">Driver Name</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">License Code</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">Category</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">License Expiry</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">Contact</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">Safety Score</th>
                <th className="px-4 py-3 text-overline text-text-tertiary font-medium">Status</th>
                {isActionAllowed(userRole, "edit", "drivers") && (
                  <th className="px-4 pr-5 py-3 text-overline text-text-tertiary font-medium text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 first:pl-5 py-3.5"><div className="h-4 w-28 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-24 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-12 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-24 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-28 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-10 rounded animate-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-20 rounded-full animate-shimmer" /></td>
                    {isActionAllowed(userRole, "edit", "drivers") && (
                      <td className="px-4 py-3.5"><div className="h-5 w-14 rounded animate-shimmer ml-auto" /></td>
                    )}
                  </tr>
                ))
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={isActionAllowed(userRole, "edit", "drivers") ? 8 : 7} className="px-4 py-8">
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
                  const sc = STATUS_CONFIG[d.status];
                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-surface-3 transition-colors duration-[100ms]"
                      style={{ height: "52px" }}
                    >
                      <td className="px-4 first:pl-5 py-3 text-body-sm font-semibold text-text-primary">{d.full_name}</td>
                      <td className="px-4 py-3 text-mono-data text-text-secondary">{d.license_number}</td>
                      <td className="px-4 py-3 text-body-sm text-text-secondary">{d.license_category}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-mono-data text-text-secondary">{d.license_expiry}</span>
                          {warning && (
                            <span
                              className="inline-flex items-center gap-1 self-start rounded-[4px] border px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{
                                color: `var(--status-${warning.token}-fg)`,
                                backgroundColor: `var(--status-${warning.token}-bg)`,
                                borderColor: `var(--status-${warning.token}-border)`,
                              }}
                            >
                              <AlertTriangle className="h-3 w-3 shrink-0" strokeWidth={2} />
                              {warning.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-text-secondary">{d.contact_number}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex h-9 w-9 items-center justify-center shrink-0">
                            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                              <circle
                                cx="18"
                                cy="18"
                                r="14"
                                fill="transparent"
                                stroke="var(--surface-3)"
                                strokeWidth="3.5"
                              />
                              <circle
                                cx="18"
                                cy="18"
                                r="14"
                                fill="transparent"
                                stroke={getScoreColor(d.safety_score)}
                                strokeWidth="3.5"
                                strokeDasharray={88}
                                strokeDashoffset={88 - (88 * d.safety_score) / 100}
                                strokeLinecap="round"
                                className="transition-all duration-700 ease-out"
                              />
                            </svg>
                            <span className="absolute text-[11px] font-bold tabular-nums text-text-primary">
                              {d.safety_score}
                            </span>
                          </div>
                          <span className="text-caption font-semibold" style={{ color: getScoreColor(d.safety_score) }}>
                            {d.safety_score >= 90 ? "Excellent" : d.safety_score >= 75 ? "Good" : d.safety_score >= 50 ? "Caution" : "Critical"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
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
                      {isActionAllowed(userRole, "edit", "drivers") && (
                        <td className="px-4 pr-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              title="Edit Driver Details"
                              onClick={() => handleOpenEdit(d)}
                              className="rounded-[6px] p-1.5 text-text-tertiary hover:bg-surface-3 hover:text-text-primary transition-colors duration-[80ms]"
                            >
                              <Edit className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                            <button
                              title="Remove Driver"
                              onClick={() => handleDelete(d.id)}
                              className="rounded-[6px] p-1.5 hover:bg-status-failed-bg transition-colors duration-[80ms]"
                              style={{ color: "var(--status-failed-fg)" }}
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
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

        {/* Pagination */}
        {total > 8 && (
          <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3">
            <span className="text-caption text-text-tertiary tabular-nums">
              Showing {Math.min(total, (page - 1) * 8 + 1)}–{Math.min(total, page * 8)} of {total} drivers
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

      {/* Drawer */}
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
                {/* Header */}
                <div className="px-5 flex items-center justify-between border-b border-border-subtle pb-4">
                  <div className="flex items-center gap-2.5">
                    <Users className="h-5 w-5 text-accent" strokeWidth={1.5} />
                    <h2 className="text-h3 text-text-primary">
                      {editingDriver ? "Edit Driver Details" : "Register Driver"}
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

                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input name="full_name" required placeholder="e.g. Rajesh Kumar" value={formData.full_name} onChange={handleFormChange} className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>License Number</label>
                    <input name="license_number" required placeholder="e.g. DL-1420190087654" value={formData.license_number} onChange={handleFormChange} className={inputCls} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Category</label>
                      <select name="license_category" value={formData.license_category} onChange={handleFormChange} className={inputCls}>
                        <option value="HMV">HMV (Heavy Motor)</option>
                        <option value="LMV">LMV (Light Motor)</option>
                        <option value="Class A">Class A Commercial</option>
                        <option value="Class B">Class B Commercial</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>License Expiry</label>
                      <input name="license_expiry" type="date" required value={formData.license_expiry} onChange={handleFormChange} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Contact Number</label>
                      <input name="contact_number" required placeholder="e.g. +91 98765 43210" value={formData.contact_number} onChange={handleFormChange} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Safety Score (0-100)</label>
                      <input name="safety_score" type="number" min="0" max="100" required value={formData.safety_score} onChange={handleFormChange} className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Status</label>
                    <select name="status" value={formData.status} onChange={handleFormChange} className={inputCls}>
                      <option value="Available">Available</option>
                      <option value="OnTrip" disabled={!editingDriver}>On Trip</option>
                      <option value="OffDuty">Off Duty</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  {formData.license_expiry && (() => {
                    const warning = getLicenseWarning(formData.license_expiry);
                    if (warning?.type === "expired") {
                      return (
                        <div
                          className="flex gap-2 items-start rounded-[10px] border p-3 text-caption"
                          style={{
                            backgroundColor: "var(--status-failed-bg)",
                            borderColor: "var(--status-failed-border)",
                            color: "var(--status-failed-fg)",
                          }}
                        >
                          <Info className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                          <span>Warning: This license is expired. If saved, this driver will be excluded from new trip assignments.</span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="pt-4 border-t border-border-subtle flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="flex-1 rounded-[10px] border border-border-default py-2.5 text-center text-body-sm font-medium text-text-secondary hover:bg-surface-3 hover:text-text-primary active:scale-[0.97] transition-all duration-[var(--dur-fast)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-[10px] bg-accent py-2.5 text-center text-body-sm font-medium text-white hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-[0.97] transition-all duration-[var(--dur-fast)]"
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
