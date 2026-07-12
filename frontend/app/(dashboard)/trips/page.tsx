"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Navigation,
  RefreshCcw,
  Plus,
  LayoutGrid,
  List,
  AlertCircle,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  Truck,
  Users,
  MapPin,
  Package,
  ClipboardList,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { isActionAllowed } from "@/lib/rbac-guards";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import type { Trip, TripStatus, PaginatedTrips } from "@/types/api";

// ---------------------------------------------------------------------------
// Local Types
// ---------------------------------------------------------------------------

interface Vehicle {
  id: string;
  registration_number: string;
  name: string;
  status: string;
}

interface Driver {
  id: string;
  full_name: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ViewMode = "kanban" | "table";

const COLUMNS: { status: TripStatus; label: string; icon: React.ElementType }[] = [
  { status: "Draft", label: "Draft", icon: FileText },
  { status: "Dispatched", label: "Dispatched", icon: Truck },
  { status: "Completed", label: "Completed", icon: CheckCircle2 },
  { status: "Cancelled", label: "Cancelled", icon: Ban },
];

function statusBadge(status: TripStatus): string {
  switch (status) {
    case "Draft":
      return "bg-status-warning/10 text-status-warning border-status-warning/20";
    case "Dispatched":
      return "bg-status-info/10 text-status-info border-status-info/20";
    case "Completed":
      return "bg-status-success/10 text-status-success border-status-success/20";
    case "Cancelled":
      return "bg-status-danger/10 text-status-danger border-status-danger/20";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400";
  }
}

function columnHeaderColor(status: TripStatus): string {
  switch (status) {
    case "Draft":
      return "border-t-status-warning";
    case "Dispatched":
      return "border-t-status-info";
    case "Completed":
      return "border-t-status-success";
    case "Cancelled":
      return "border-t-status-danger";
    default:
      return "border-t-slate-400";
  }
}

function columnIconColor(status: TripStatus): string {
  switch (status) {
    case "Draft":
      return "text-status-warning bg-status-warning/10";
    case "Dispatched":
      return "text-status-info bg-status-info/10";
    case "Completed":
      return "text-status-success bg-status-success/10";
    case "Cancelled":
      return "text-status-danger bg-status-danger/10";
    default:
      return "text-slate-500 bg-slate-100";
  }
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function shortId(id: string): string {
  return id.length > 8 ? `#${id.slice(0, 8).toUpperCase()}` : `#${id.toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Trip Card (Kanban)
// ---------------------------------------------------------------------------

interface TripCardProps {
  trip: Trip;
  userRole: string;
  onAction: (trip: Trip, action: "dispatch" | "complete" | "cancel" | "delete") => void;
  actionLoading: string | null;
}

function TripCard({ trip, userRole, onAction, actionLoading }: TripCardProps) {
  const isBusy = actionLoading === trip.id;
  const canEdit = isActionAllowed(userRole, "edit", "trips");
  const canDelete = isActionAllowed(userRole, "delete", "trips");

  return (
    <div
      className={`group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 ${
        isBusy ? "opacity-70 pointer-events-none" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
          {shortId(trip.id)}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadge(
            trip.status
          )}`}
        >
          {trip.status}
        </span>
      </div>

      {/* Vehicle */}
      <div className="flex items-center gap-2 mb-1.5">
        <Truck className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
          {trip.vehicle_registration ?? trip.vehicle_id.slice(0, 8)}
          {trip.vehicle_name && (
            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400 font-normal">
              · {trip.vehicle_name}
            </span>
          )}
        </span>
      </div>

      {/* Driver */}
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
          {trip.driver_name ?? trip.driver_id.slice(0, 8)}
        </span>
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mb-3">
        <Clock className="h-3 w-3 shrink-0" />
        <span>{formatRelativeDate(trip.created_at)}</span>
      </div>

      {/* Actions */}
      {(canEdit || canDelete) && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
          {isBusy ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing…
            </div>
          ) : (
            <>
              {canEdit && trip.status === "Draft" && (
                <ActionButton
                  label="Dispatch"
                  color="info"
                  onClick={() => onAction(trip, "dispatch")}
                />
              )}
              {canEdit && trip.status === "Dispatched" && (
                <ActionButton
                  label="Complete"
                  color="success"
                  onClick={() => onAction(trip, "complete")}
                />
              )}
              {canEdit &&
                trip.status !== "Completed" &&
                trip.status !== "Cancelled" && (
                  <ActionButton
                    label="Cancel"
                    color="danger"
                    onClick={() => onAction(trip, "cancel")}
                  />
                )}
              {canDelete && (
                <ActionButton
                  label="Delete"
                  color="muted"
                  onClick={() => onAction(trip, "delete")}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  color: "info" | "success" | "danger" | "muted";
  onClick: () => void;
}

function ActionButton({ label, color, onClick }: ActionButtonProps) {
  const colorClass: Record<string, string> = {
    info: "text-status-info hover:bg-status-info/10 border-status-info/20",
    success:
      "text-status-success hover:bg-status-success/10 border-status-success/20",
    danger:
      "text-status-danger hover:bg-status-danger/10 border-status-danger/20",
    muted:
      "text-slate-500 hover:bg-slate-100 border-slate-200 dark:hover:bg-slate-700 dark:border-slate-700",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${colorClass[color]}`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Create Trip Drawer
// ---------------------------------------------------------------------------

interface CreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  vehicles: Vehicle[];
  drivers: Driver[];
}

type TripStep = "Route" | "Cargo" | "Vehicle" | "Driver" | "Review";

const TRIP_STEPS: { title: TripStep; description: string; icon: React.ElementType }[] = [
  {
    title: "Route",
    description: "Set pickup and delivery locations and dates.",
    icon: MapPin,
  },
  {
    title: "Cargo",
    description: "Describe the load for this trip.",
    icon: FileText,
  },
  {
    title: "Vehicle",
    description: "Choose an available vehicle.",
    icon: Truck,
  },
  {
    title: "Driver",
    description: "Assign an available driver.",
    icon: Users,
  },
  {
    title: "Review",
    description: "Confirm details before creating.",
    icon: CheckCircle2,
  },
];

interface TripFormData {
  origin: string;
  destination: string;
  departure_date: string;
  arrival_date: string;
  cargo_type: string;
  cargo_weight_kg: string;
  cargo_description: string;
  vehicle_id: string;
  driver_id: string;
}

function CreateTripDrawer({
  open,
  onClose,
  onCreated,
  vehicles,
  drivers,
}: CreateDrawerProps) {
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<TripFormData>({
    origin: "",
    destination: "",
    departure_date: "",
    arrival_date: "",
    cargo_type: "General Freight",
    cargo_weight_kg: "",
    cargo_description: "",
    vehicle_id: "",
    driver_id: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const availableVehicles = vehicles.filter((v) => v.status === "Available");
  const availableDrivers = drivers.filter((d) => d.status === "Available");

  const reset = useCallback(() => {
    setStep(0);
    setFormData({
      origin: "",
      destination: "",
      departure_date: "",
      arrival_date: "",
      cargo_type: "General Freight",
      cargo_weight_kg: "",
      cargo_description: "",
      vehicle_id: "",
      driver_id: "",
    });
    setError(null);
    setSaving(false);
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const updateField = (field: keyof TripFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const hasValidRoute =
    formData.origin.trim() !== "" &&
    formData.destination.trim() !== "" &&
    formData.departure_date !== "" &&
    formData.arrival_date !== "";

  const hasValidCargo =
    formData.cargo_type.trim() !== "" &&
    Number(formData.cargo_weight_kg) > 0;

  const hasValidVehicle = formData.vehicle_id !== "";
  const hasValidDriver = formData.driver_id !== "";

  const stepValidationError = () => {
    if (step === 0) {
      if (!hasValidRoute) return "Please complete the route details.";
      if (new Date(formData.arrival_date) < new Date(formData.departure_date)) {
        return "Arrival date must be after departure date.";
      }
      return null;
    }
    if (step === 1) {
      if (!hasValidCargo) return "Please provide cargo type and weight.";
      return null;
    }
    if (step === 2) {
      if (!hasValidVehicle) return "Choose an available vehicle to continue.";
      return null;
    }
    if (step === 3) {
      if (!hasValidDriver) return "Choose an available driver to continue.";
      return null;
    }
    return null;
  };

  const handleContinue = () => {
    const validationError = stepValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((prev) => Math.min(prev + 1, TRIP_STEPS.length - 1));
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < TRIP_STEPS.length - 1) {
      handleContinue();
      return;
    }

    if (!hasValidVehicle || !hasValidDriver) {
      setError("Please select both a vehicle and a driver before creating the trip.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiClient.post("trips/", {
        vehicle_id: formData.vehicle_id,
        driver_id: formData.driver_id,
      });
      addToast("Trip created successfully!", "success");
      onCreated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create trip.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Pickup Location
              </label>
              <input
                type="text"
                value={formData.origin}
                onChange={(e) => updateField("origin", e.target.value)}
                placeholder="Main warehouse, Terminal A"
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Delivery Location
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => updateField("destination", e.target.value)}
                placeholder="Customer depot, Site B"
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Departure Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.departure_date}
                  onChange={(e) => updateField("departure_date", e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Expected Arrival
                </label>
                <input
                  type="datetime-local"
                  value={formData.arrival_date}
                  onChange={(e) => updateField("arrival_date", e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Cargo Type
              </label>
              <input
                type="text"
                value={formData.cargo_type}
                onChange={(e) => updateField("cargo_type", e.target.value)}
                placeholder="General freight, Refrigerated, Hazardous"
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.cargo_weight_kg}
                  onChange={(e) => updateField("cargo_weight_kg", e.target.value)}
                  placeholder="1200"
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Cargo Notes
                </label>
                <input
                  type="text"
                  value={formData.cargo_description}
                  onChange={(e) => updateField("cargo_description", e.target.value)}
                  placeholder="Palletized goods, fragile items"
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Vehicle
              </label>
              <select
                id="create-trip-vehicle"
                value={formData.vehicle_id}
                onChange={(e) => updateField("vehicle_id", e.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Select an available vehicle…</option>
                {availableVehicles.length === 0 && (
                  <option disabled>No available vehicles</option>
                )}
                {availableVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration_number} · {vehicle.name}
                  </option>
                ))}
              </select>
              {availableVehicles.length === 0 && (
                <p className="mt-1 text-[11px] text-status-warning">
                  All vehicles are currently unavailable.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Vehicle guidance</p>
              <p className="mt-1 text-xs">Choose a vehicle large enough for the cargo and currently available for dispatch.</p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Driver
              </label>
              <select
                id="create-trip-driver"
                value={formData.driver_id}
                onChange={(e) => updateField("driver_id", e.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Select an available driver…</option>
                {availableDrivers.length === 0 && (
                  <option disabled>No available drivers</option>
                )}
                {availableDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name}
                  </option>
                ))}
              </select>
              {availableDrivers.length === 0 && (
                <p className="mt-1 text-[11px] text-status-warning">
                  All drivers are currently unavailable.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Driver guidance</p>
              <p className="mt-1 text-xs">Assign a driver who is currently available and ready for the trip.</p>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Route summary
              </p>
              <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                <strong>From:</strong> {formData.origin || "—"}
              </p>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                <strong>To:</strong> {formData.destination || "—"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formData.departure_date && formData.arrival_date
                  ? `${new Date(formData.departure_date).toLocaleString()} → ${new Date(formData.arrival_date).toLocaleString()}`
                  : "Schedule not set."}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cargo summary
              </p>
              <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                {formData.cargo_type || "Cargo type not set."}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formData.cargo_weight_kg ? `${formData.cargo_weight_kg} kg` : "Weight not set."}
              </p>
              {formData.cargo_description && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {formData.cargo_description}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Assignment summary
              </p>
              <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                <strong>Vehicle:</strong>{" "}
                {availableVehicles.find((v) => v.id === formData.vehicle_id)
                  ? `${availableVehicles.find((v) => v.id === formData.vehicle_id)?.registration_number} · ${availableVehicles.find((v) => v.id === formData.vehicle_id)?.name}`
                  : "Not selected."}
              </p>
              <p className="text-sm text-slate-900 dark:text-slate-100">
                <strong>Driver:</strong>{" "}
                {availableDrivers.find((d) => d.id === formData.driver_id)
                  ? availableDrivers.find((d) => d.id === formData.driver_id)?.full_name
                  : "Not selected."}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Route and cargo details are collected locally and will be included in the trip record when backend metadata support is available.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="pointer-events-auto w-screen max-w-md bg-white shadow-2xl dark:bg-slate-900">
          <div className="flex h-full flex-col overflow-y-auto border-l border-slate-200 dark:border-slate-800 py-6">
            <div className="px-6 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Create New Trip
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Step {step + 1} of {TRIP_STEPS.length}: {TRIP_STEPS[step].title}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-3 gap-2">
                {TRIP_STEPS.map((stepItem, index) => {
                  const Icon = stepItem.icon;
                  const isActive = index === step;
                  const isComplete = index < step;
                  return (
                    <button
                      key={stepItem.title}
                      type="button"
                      onClick={() => {
                        if (index <= step) {
                          setStep(index);
                          setError(null);
                        }
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : isComplete
                          ? "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          : "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{stepItem.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-5">
              {error && (
                <div className="flex items-start gap-2.5 rounded-lg bg-status-danger/10 p-3.5 text-xs text-status-danger border border-status-danger/25">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {renderStepContent()}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={step === 0}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {step === TRIP_STEPS.length - 1 ? "Create Trip" : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban View
// ---------------------------------------------------------------------------

interface KanbanViewProps {
  trips: Trip[];
  userRole: string;
  onAction: (trip: Trip, action: "dispatch" | "complete" | "cancel" | "delete") => void;
  actionLoading: string | null;
}

function KanbanView({ trips, userRole, onAction, actionLoading }: KanbanViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map(({ status, label, icon: Icon }) => {
        const columnTrips = trips.filter((t) => t.status === status);
        return (
          <div key={status} className="flex flex-col gap-3">
            {/* Column header */}
            <div
              className={`rounded-xl border-t-4 border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${columnHeaderColor(
                status
              )}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`rounded-md p-1 ${columnIconColor(status)}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {label}
                  </span>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {columnTrips.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 min-h-[80px]">
              {columnTrips.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                  No {label.toLowerCase()} trips
                </div>
              ) : (
                columnTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    userRole={userRole}
                    onAction={onAction}
                    actionLoading={actionLoading}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table View
// ---------------------------------------------------------------------------

interface TableViewProps {
  trips: Trip[];
  userRole: string;
  onAction: (trip: Trip, action: "dispatch" | "complete" | "cancel" | "delete") => void;
  actionLoading: string | null;
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  isLoading: boolean;
}

function TableView({
  trips,
  userRole,
  onAction,
  actionLoading,
  page,
  total,
  pageSize,
  onPageChange,
  isLoading,
}: TableViewProps) {
  const canEdit = isActionAllowed(userRole, "edit", "trips");
  const canDelete = isActionAllowed(userRole, "delete", "trips");
  const showActions = canEdit || canDelete;

  const skeletonRows = Array.from({ length: 5 });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
            <tr>
              <th className="px-5 py-4">Trip ID</th>
              <th className="px-5 py-4">Vehicle</th>
              <th className="px-5 py-4">Driver</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Created</th>
              <th className="px-5 py-4">Last Updated</th>
              {showActions && <th className="px-5 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {isLoading ? (
              skeletonRows.map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: showActions ? 7 : 6 }).map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div
                        className={`h-4 rounded bg-slate-200 dark:bg-slate-700 ${
                          j === 0 ? "w-24" : j === 3 ? "w-20" : "w-32"
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : trips.length === 0 ? (
              <tr>
                <td
                  colSpan={showActions ? 7 : 6}
                  className="px-6 py-12"
                >
                  <EmptyState
                    icon={Navigation}
                    title="No trips found"
                    description="Adjust your filters or create a new trip to get started."
                  />
                </td>
              </tr>
            ) : (
              trips.map((trip) => {
                const isBusy = actionLoading === trip.id;
                return (
                  <tr
                    key={trip.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                      {shortId(trip.id)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-50">
                        {trip.vehicle_registration ?? trip.vehicle_id.slice(0, 8)}
                      </div>
                      {trip.vehicle_name && (
                        <div className="text-xs text-slate-500">
                          {trip.vehicle_name}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                      {trip.driver_name ?? trip.driver_id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge(
                          trip.status
                        )}`}
                      >
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {new Date(trip.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {formatRelativeDate(trip.updated_at)}
                    </td>
                    {showActions && (
                      <td className="px-5 py-4 text-right">
                        {isBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400 ml-auto" />
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {canEdit && trip.status === "Draft" && (
                              <ActionButton
                                label="Dispatch"
                                color="info"
                                onClick={() => onAction(trip, "dispatch")}
                              />
                            )}
                            {canEdit && trip.status === "Dispatched" && (
                              <ActionButton
                                label="Complete"
                                color="success"
                                onClick={() => onAction(trip, "complete")}
                              />
                            )}
                            {canEdit &&
                              trip.status !== "Completed" &&
                              trip.status !== "Cancelled" && (
                                <ActionButton
                                  label="Cancel"
                                  color="danger"
                                  onClick={() => onAction(trip, "cancel")}
                                />
                              )}
                            {canDelete && (
                              <ActionButton
                                label="Delete"
                                color="muted"
                                onClick={() => onAction(trip, "delete")}
                              />
                            )}
                          </div>
                        )}
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
      {total > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-850/50">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing{" "}
            {Math.min(total, (page - 1) * pageSize + 1)}–
            {Math.min(total, page * pageSize)} of {total} trips
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page * pageSize >= total || isLoading}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Root
// ---------------------------------------------------------------------------

export default function TripsPage() {
  const { data: session } = authClient.useSession();
  const { addToast } = useToast();
  const userRole = (session?.user as Record<string, unknown>)?.role as string ?? "Dispatcher";

  // Data state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Auxiliary data for the create drawer
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set("page", String(page));
      query.set("size", String(PAGE_SIZE));
      if (statusFilter !== "all") query.set("status", statusFilter);

      const data = await apiClient.get<PaginatedTrips>(
        `trips/?${query.toString()}`
      );
      setTrips(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load trips.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  const fetchAuxData = useCallback(async () => {
    try {
      const [vData, dData] = await Promise.all([
        apiClient.get<{ items: Vehicle[] }>("vehicles?size=200"),
        apiClient.get<{ items: Driver[] }>("drivers?size=200"),
      ]);
      setVehicles(vData.items);
      setDrivers(dData.items);
    } catch {
      // auxiliary data; silent fail — selectors will just be empty
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    fetchAuxData();
  }, [fetchAuxData]);

  // -------------------------------------------------------------------------
  // Trip actions
  // -------------------------------------------------------------------------

  const handleAction = async (
    trip: Trip,
    action: "dispatch" | "complete" | "cancel" | "delete"
  ) => {
    if (action === "delete") {
      if (!isActionAllowed(userRole, "delete", "trips")) {
        addToast("Access denied: You cannot delete trips.", "error");
        return;
      }
      if (!confirm(`Delete trip ${shortId(trip.id)}? This cannot be undone.`)) {
        return;
      }
      setActionLoading(trip.id);
      try {
        await apiClient.delete(`trips/${trip.id}`);
        addToast("Trip deleted.", "success");
        fetchTrips();
      } catch (err: unknown) {
        addToast(
          err instanceof Error ? err.message : "Failed to delete trip.",
          "error"
        );
      } finally {
        setActionLoading(null);
      }
      return;
    }

    if (!isActionAllowed(userRole, "edit", "trips")) {
      addToast("Access denied: You cannot modify trips.", "error");
      return;
    }

    setActionLoading(trip.id);
    try {
      await apiClient.post(`trips/${trip.id}/${action}`, {});
      const labels: Record<string, string> = {
        dispatch: "Trip dispatched successfully!",
        complete: "Trip marked as completed!",
        cancel: "Trip cancelled.",
      };
      addToast(labels[action], action === "cancel" ? "warning" : "success");
      fetchTrips();
    } catch (err: unknown) {
      addToast(
        err instanceof Error ? err.message : `Failed to ${action} trip.`,
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------------------------
  // Derived stats (client-side — no extra fetch)
  // -------------------------------------------------------------------------

  const statCounts = COLUMNS.reduce<Record<TripStatus, number>>(
    (acc, col) => {
      acc[col.status] = trips.filter((t) => t.status === col.status).length;
      return acc;
    },
    { Draft: 0, Dispatched: 0, Completed: 0, Cancelled: 0 }
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ---- Page Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Trips Dispatch
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage and dispatch active transport trips across the fleet.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="refresh-trips-btn"
            onClick={() => fetchTrips()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {isActionAllowed(userRole, "create", "trips") && (
            <button
              id="create-trip-btn"
              onClick={() => {
                fetchAuxData();
                setDrawerOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Trip
            </button>
          )}
        </div>
      </div>

      {/* ---- Summary KPI Strip ---- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COLUMNS.map(({ status, label, icon: Icon }) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(statusFilter === status ? "all" : status);
              setPage(1);
            }}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
              statusFilter === status
                ? `${statusBadge(status)} shadow-sm`
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            }`}
          >
            <span
              className={`rounded-lg p-2 ${
                statusFilter === status
                  ? "bg-white/30"
                  : columnIconColor(status)
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-lg font-bold leading-none">{statCounts[status]}</p>
              <p className="text-xs font-medium opacity-70 mt-0.5">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ---- Filter + View Toggle Bar ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Filter:
          </span>
          {(["all", ...COLUMNS.map((c) => c.status)] as (TripStatus | "all")[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            )
          )}
        </div>

        {/* View toggle */}
        <div
          className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-850"
          role="group"
          aria-label="View toggle"
        >
          <button
            id="view-kanban-btn"
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              viewMode === "kanban"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </button>
          <button
            id="view-table-btn"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Table
          </button>
        </div>
      </div>

      {/* ---- Error Banner ---- */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-status-danger/10 border border-status-danger/20 p-4 text-sm text-status-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Failed to load trips</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
          <button
            onClick={() => fetchTrips()}
            className="text-xs font-semibold underline hover:no-underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ---- Main Content: Kanban or Table ---- */}
      {viewMode === "kanban" ? (
        isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map(({ status }) => (
              <div key={status} className="flex flex-col gap-3">
                <div className="h-14 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : !error && trips.length === 0 ? (
          <EmptyState
            icon={Navigation}
            title="No trips found"
            description={
              statusFilter !== "all"
                ? `No ${statusFilter.toLowerCase()} trips. Try 'All' to see everything.`
                : "Create your first trip to get started."
            }
            action={
              isActionAllowed(userRole, "create", "trips") && statusFilter === "all"
                ? { label: "New Trip", onClick: () => setDrawerOpen(true) }
                : undefined
            }
          />
        ) : (
          <KanbanView
            trips={trips}
            userRole={userRole}
            onAction={handleAction}
            actionLoading={actionLoading}
          />
        )
      ) : (
        <TableView
          trips={trips}
          userRole={userRole}
          onAction={handleAction}
          actionLoading={actionLoading}
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      )}

      {/* ---- Create Trip Drawer ---- */}
      <CreateTripDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={fetchTrips}
        vehicles={vehicles}
        drivers={drivers}
      />
    </div>
  );
}
