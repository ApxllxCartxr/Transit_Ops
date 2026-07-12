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
