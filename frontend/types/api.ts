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
