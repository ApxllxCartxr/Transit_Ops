export interface Vehicle {
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

export interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  license_category: string;
  license_expiry: string; // YYYY-MM-DD
  contact_number: string;
  safety_score: number;
  status: "Available" | "OnTrip" | "OffDuty" | "Suspended";
}

export interface DashboardKpis {
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

export type TripStatus = "Draft" | "Dispatched" | "Completed" | "Cancelled";

export interface Trip {
  id: string;
  vehicle_id: string;
  driver_id: string;
  status: TripStatus;
  cancelled: boolean;
  created_at: string;
  updated_at: string;
  // Enriched fields populated by the list endpoint (joined from vehicles/drivers)
  vehicle_registration?: string;
  vehicle_name?: string;
  driver_name?: string;
}

export interface PaginatedTrips {
  items: Trip[];
  total: number;
  page: number;
  size: number;
}

export interface CostDetails {
  vehicle_id: string;
  fuel_cost: number;
  maintenance_cost: number;
  expense_cost: number;
  operational_cost: number;
  total_cost: number;
  start_date?: string | null;
  end_date?: string | null;
  fuel_entries: Array<{
    id: string;
    liters: number;
    cost_per_liter: number;
    total_cost: number;
    logged_at: string;
  }>;
  expenses: Array<{
    id: string;
    category: string;
    description?: string;
    amount: number;
    incurred_at: string;
  }>;
}

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  vehicle_registration_number?: string;
  vehicle_name?: string;
  status: "Open" | "Closed";
  vehicle_status: "Available" | "OnTrip" | "InShop" | "Retired";
  opened_at: string;
  closed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PaginatedMaintenance {
  items: MaintenanceLog[];
  total: number;
  page: number;
  size: number;
}
