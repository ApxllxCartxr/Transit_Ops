"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  User,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { isActionAllowed } from "@/lib/rbac-guards";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { normalizeAndMapRole, UserRole } from "@/lib/auth-utils";

interface Member {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: string[];
  last_login_at?: string | null;
  created_at?: string | null;
}

interface PaginatedMembers {
  items: Member[];
  total: number;
  page: number;
  size: number;
}

const AVAILABLE_ROLES: { label: string; value: string; desc: string; color: string }[] = [
  { label: "Admin", value: "Admin", desc: "Full access across all system modules & settings.", color: "bg-status-failed-bg text-status-failed border-status-failed/20" },
  { label: "Fleet Manager", value: "Fleet Manager", desc: "Manages vehicle registry, lifecycle, and maintenance.", color: "bg-status-info-bg text-status-info border-status-info/20" },
  { label: "Dispatcher", value: "Dispatcher", desc: "Creates and dispatches trips, assigns drivers and vehicles.", color: "bg-status-warning-bg text-status-warning border-status-warning/20" },
  { label: "Safety Officer", value: "Safety Officer", desc: "Manages driver profiles, licenses, and safety scores.", color: "bg-status-success-bg text-status-success border-status-success/20" },
  { label: "Financial Analyst", value: "Financial Analyst", desc: "Tracks fuel logs, maintenance costs, and financial analytics.", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
];

export default function MembersPage() {
  const { data: sessionState } = authClient.useSession();
  const rawUserRole = (sessionState?.user as any)?.roles || (sessionState?.user as any)?.role || "FleetManager";
  const currentUserRole = normalizeAndMapRole(rawUserRole);
  const canManageMembers = isActionAllowed(currentUserRole, "create", "members");

  const { addToast } = useToast();
  const showToast = useCallback(({ title, description, type }: { title?: string; description: string; type: any }) => {
    addToast(description || title || "", type);
  }, [addToast]);

  const [members, setMembers] = useState<Member[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Drawer & Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    roles: ["Fleet Manager"],
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString(),
      });
      if (search.trim()) params.append("search", search.trim());

      const data: PaginatedMembers = await apiClient.get(`/users?${params.toString()}`);
      setMembers(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      showToast({
        title: "Error fetching members",
        description: err.message || "Could not load team members from server.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, showToast]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Handle Create Member
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.email || !formData.full_name || !formData.password) {
      setFormError("Email, Full Name, and Password are required.");
      return;
    }
    if (formData.roles.length === 0) {
      setFormError("At least one role must be assigned.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/users", formData);
      showToast({
        title: "Member Created",
        description: `${formData.full_name} has been added to the platform.`,
        type: "success",
      });
      setIsAddOpen(false);
      setFormData({ email: "", full_name: "", password: "", roles: ["Fleet Manager"], is_active: true });
      fetchMembers();
    } catch (err: any) {
      setFormError(err.message || "Failed to create user account.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Member
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setFormError(null);
    if (formData.roles.length === 0) {
      setFormError("At least one role must be assigned.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.patch(`/users/${selectedMember.id}`, {
        full_name: formData.full_name,
        is_active: formData.is_active,
        roles: formData.roles,
      });
      showToast({
        title: "Member Updated",
        description: `Changes for ${formData.full_name} have been saved.`,
        type: "success",
      });
      setIsEditOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (err: any) {
      setFormError(err.message || "Failed to update member.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Member
  const handleDelete = async () => {
    if (!selectedMember) return;
    setSubmitting(true);
    try {
      await apiClient.delete(`/users/${selectedMember.id}`);
      showToast({
        title: "Member Removed",
        description: `${selectedMember.full_name} has been removed from TransitOps.`,
        type: "success",
      });
      setIsDeleteConfirmOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (err: any) {
      showToast({
        title: "Deletion Failed",
        description: err.message || "Could not delete user account.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRoleSelection = (roleValue: string) => {
    setFormData((prev) => {
      const exists = prev.roles.includes(roleValue);
      if (exists) {
        if (prev.roles.length === 1) return prev; // Keep at least one
        return { ...prev, roles: prev.roles.filter((r) => r !== roleValue) };
      } else {
        return { ...prev, roles: [...prev.roles, roleValue] };
      }
    });
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    if (roleFilter === "all") return true;
    return m.roles.some((r) => r.toLowerCase() === roleFilter.toLowerCase());
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  // Statistics
  const activeCount = members.filter((m) => m.is_active).length;
  const adminCount = members.filter((m) => m.roles.includes("Admin")).length;

  if (currentUserRole !== "Admin") {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center">
        <AlertCircle className="h-12 w-12 text-status-failed mb-4 animate-pulse" />
        <h2 className="text-h2 text-text-primary mb-2">Access Restricted</h2>
        <p className="text-body text-text-secondary max-w-md">
          Platform Member Management is restricted strictly to System Administrators (`Admin`). Please contact your admin if you require elevated privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header Banner & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <h1 className="text-h1 font-bold text-text-primary tracking-tight">
            Team Members & RBAC Control
          </h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Manage system accounts, assign role permissions, and audit user logins across the TransitOps ecosystem.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ email: "", full_name: "", password: "", roles: ["Fleet Manager"], is_active: true });
            setFormError(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-[8px] bg-accent px-4 py-2.5 text-body-sm font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-[0.98] transition-all duration-[var(--dur-fast)]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Invite Member
        </button>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[12px] border border-border-subtle bg-surface-1 p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-caption font-medium text-text-tertiary">Total Members</p>
            <p className="text-h2 font-bold text-text-primary mt-0.5">{totalCount}</p>
          </div>
        </div>
        <div className="rounded-[12px] border border-border-subtle bg-surface-1 p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-status-success-bg text-status-success">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-caption font-medium text-text-tertiary">Active Accounts</p>
            <p className="text-h2 font-bold text-text-primary mt-0.5">{activeCount}</p>
          </div>
        </div>
        <div className="rounded-[12px] border border-border-subtle bg-surface-1 p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-status-failed-bg text-status-failed">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-caption font-medium text-text-tertiary">Administrators</p>
            <p className="text-h2 font-bold text-text-primary mt-0.5">{adminCount}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface-1 p-4 rounded-[12px] border border-border-subtle shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[8px] border border-border-default bg-surface-0 pl-9 pr-4 py-2 text-body-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setRoleFilter("all")}
            className={`px-3 py-1.5 rounded-[6px] text-caption font-medium transition-all ${
              roleFilter === "all"
                ? "bg-text-primary text-surface-0"
                : "bg-surface-2 text-text-secondary hover:text-text-primary"
            }`}
          >
            All Roles
          </button>
          {AVAILABLE_ROLES.map((role) => (
            <button
              key={role.value}
              onClick={() => setRoleFilter(role.value)}
              className={`px-3 py-1.5 rounded-[6px] text-caption font-medium transition-all whitespace-nowrap ${
                roleFilter === role.value
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-text-secondary hover:text-text-primary"
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-[12px] border border-border-subtle bg-surface-1 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-secondary animate-pulse">Loading platform members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={UserX}
              title="No members found"
              description="No team members match your current search query or role filter."
              action={
                roleFilter !== "all" || search
                  ? {
                      label: "Reset Filters",
                      onClick: () => {
                        setSearch("");
                        setRoleFilter("all");
                      },
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-2/60 text-overline text-text-tertiary uppercase tracking-wider">
                  <th className="py-3.5 px-5">Member</th>
                  <th className="py-3.5 px-5">Assigned Roles</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Last Login</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-body-sm">
                {filteredMembers.map((member) => {
                  const initials = member.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={member.id} className="hover:bg-surface-2/40 transition-colors group">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-3 font-semibold text-text-primary border border-border-default">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary group-hover:text-accent transition-colors">
                              {member.full_name}
                            </p>
                            <p className="text-caption text-text-tertiary">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1.5">
                          {member.roles.map((r) => {
                            const found = AVAILABLE_ROLES.find((ar) => ar.value.toLowerCase() === r.toLowerCase());
                            return (
                              <span
                                key={r}
                                className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-overline font-medium border ${
                                  found ? found.color : "bg-surface-3 text-text-secondary border-border-default"
                                }`}
                              >
                                {r}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium ${
                            member.is_active
                              ? "bg-status-success-bg text-status-success"
                              : "bg-status-failed-bg text-status-failed"
                          }`}
                        >
                          {member.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {member.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-text-secondary">
                        <div className="flex items-center gap-1.5 tabular-nums">
                          <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                          {member.last_login_at
                            ? new Date(member.last_login_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                            : "Never logged in"}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setFormData({
                                email: member.email,
                                full_name: member.full_name,
                                password: "",
                                roles: member.roles.length > 0 ? member.roles : ["Fleet Manager"],
                                is_active: Boolean(member.is_active),
                              });
                              setFormError(null);
                              setIsEditOpen(true);
                            }}
                            title="Edit roles and status"
                            className="p-1.5 rounded-[6px] text-text-secondary hover:bg-surface-3 hover:text-text-primary transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setIsDeleteConfirmOpen(true);
                            }}
                            title="Remove member"
                            className="p-1.5 rounded-[6px] text-text-secondary hover:bg-status-failed-bg hover:text-status-failed transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between border-t border-border-subtle bg-surface-1 px-5 py-3">
            <p className="text-caption text-text-secondary">
              Showing <span className="font-semibold text-text-primary">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-text-primary">{Math.min(page * pageSize, totalCount)}</span> of{" "}
              <span className="font-semibold text-text-primary">{totalCount}</span> members
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-[6px] border border-border-default px-3 py-1.5 text-caption font-medium text-text-secondary disabled:opacity-40 hover:bg-surface-2 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded-[6px] border border-border-default px-3 py-1.5 text-caption font-medium text-text-secondary disabled:opacity-40 hover:bg-surface-2 transition-colors"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Member Drawer ──────────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="flex h-full w-full max-w-lg flex-col bg-surface-1 border-l border-border-default shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <div>
                <h3 className="text-h3 font-bold text-text-primary">Invite Team Member</h3>
                <p className="text-caption text-text-secondary mt-0.5">Create a login credential and assign role scopes.</p>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="rounded-[6px] p-1 text-text-tertiary hover:bg-surface-3 hover:text-text-primary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-6 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                {formError && (
                  <div className="rounded-[8px] bg-status-failed-bg border border-status-failed/30 p-3 text-caption text-status-failed flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-caption font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. jdoe@transitops.fleet"
                    className="w-full rounded-[8px] border border-border-default bg-surface-0 px-3.5 py-2.5 text-body-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-caption font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    className="w-full rounded-[8px] border border-border-default bg-surface-0 px-3.5 py-2.5 text-body-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-caption font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-[8px] border border-border-default bg-surface-0 px-3.5 py-2.5 text-body-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-caption font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Assign Role Permissions *
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {AVAILABLE_ROLES.map((r) => {
                      const isSelected = formData.roles.includes(r.value);
                      return (
                        <div
                          key={r.value}
                          onClick={() => toggleRoleSelection(r.value)}
                          className={`cursor-pointer rounded-[8px] border p-3.5 transition-all flex items-start gap-3 ${
                            isSelected
                              ? "border-accent bg-accent/10 shadow-xs"
                              : "border-border-subtle bg-surface-0 hover:bg-surface-2"
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              isSelected ? "bg-accent border-accent text-white" : "border-border-default bg-surface-1"
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                          <div>
                            <p className={`text-body-sm font-semibold ${isSelected ? "text-accent" : "text-text-primary"}`}>
                              {r.label}
                            </p>
                            <p className="text-caption text-text-secondary mt-0.5">{r.desc}</p>
                          </div>
                        </div>
                      );
                    })}
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
                  {submitting ? "Inviting..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Member & Roles Modal ──────────────────────────────────────── */}
      {isEditOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="flex h-full w-full max-w-lg flex-col bg-surface-1 border-l border-border-default shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <div>
                <h3 className="text-h3 font-bold text-text-primary">Edit Account Permissions</h3>
                <p className="text-caption text-text-secondary mt-0.5">{selectedMember.email}</p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="rounded-[6px] p-1 text-text-tertiary hover:bg-surface-3 hover:text-text-primary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="mt-6 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                {formError && (
                  <div className="rounded-[8px] bg-status-failed-bg border border-status-failed/30 p-3 text-caption text-status-failed flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-caption font-semibold text-text-secondary uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full rounded-[8px] border border-border-default bg-surface-0 px-3.5 py-2.5 text-body-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-caption font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Account Status
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: true })}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-[8px] border py-2.5 px-4 text-body-sm font-medium transition-all ${
                        formData.is_active
                          ? "border-status-success bg-status-success-bg text-status-success"
                          : "border-border-default bg-surface-0 text-text-secondary"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: false })}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-[8px] border py-2.5 px-4 text-body-sm font-medium transition-all ${
                        !formData.is_active
                          ? "border-status-failed bg-status-failed-bg text-status-failed"
                          : "border-border-default bg-surface-0 text-text-secondary"
                      }`}
                    >
                      <XCircle className="h-4 w-4" /> Deactivated
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-caption font-semibold text-text-secondary uppercase tracking-wider mb-2">
                    Modify Assigned Roles *
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {AVAILABLE_ROLES.map((r) => {
                      const isSelected = formData.roles.includes(r.value);
                      return (
                        <div
                          key={r.value}
                          onClick={() => toggleRoleSelection(r.value)}
                          className={`cursor-pointer rounded-[8px] border p-3.5 transition-all flex items-start gap-3 ${
                            isSelected
                              ? "border-accent bg-accent/10 shadow-xs"
                              : "border-border-subtle bg-surface-0 hover:bg-surface-2"
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              isSelected ? "bg-accent border-accent text-white" : "border-border-default bg-surface-1"
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                          <div>
                            <p className={`text-body-sm font-semibold ${isSelected ? "text-accent" : "text-text-primary"}`}>
                              {r.label}
                            </p>
                            <p className="text-caption text-text-secondary mt-0.5">{r.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-[8px] border border-border-default px-4 py-2 text-body-sm font-medium text-text-secondary hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-[8px] bg-accent px-5 py-2 text-body-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {isDeleteConfirmOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in p-4">
          <div className="w-full max-w-md rounded-[12px] bg-surface-1 border border-border-default shadow-2xl p-6">
            <div className="flex items-center gap-3 text-status-failed mb-3">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-h3 font-bold text-text-primary">Confirm Removal</h3>
            </div>
            <p className="text-body-sm text-text-secondary">
              Are you sure you want to remove <span className="font-semibold text-text-primary">{selectedMember.full_name}</span> ({selectedMember.email}) from TransitOps? They will immediately lose login privileges.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="rounded-[8px] border border-border-default px-4 py-2 text-body-sm font-medium text-text-secondary hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="rounded-[8px] bg-status-failed px-4 py-2 text-body-sm font-semibold text-white hover:bg-status-failed/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Removing..." : "Remove Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
