import { NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const typeFilter = searchParams.get("type");
  const statusFilter = searchParams.get("status");
  const regionFilter = searchParams.get("region");

  let vehicles = mockDb.getVehicles();
  let drivers = mockDb.getDrivers();
  let trips = mockDb.getTrips();

  // Apply filters
  if (typeFilter && typeFilter !== "all") {
    vehicles = vehicles.filter(v => v.vehicle_type.toLowerCase() === typeFilter.toLowerCase());
  }
  if (statusFilter && statusFilter !== "all") {
    vehicles = vehicles.filter(v => v.status.toLowerCase() === statusFilter.toLowerCase());
    // Also filter drivers for consistency if status matches driver status enums
    const lowerStatus = statusFilter.toLowerCase();
    if (["available", "ontrip", "offduty", "suspended"].includes(lowerStatus)) {
      drivers = drivers.filter(d => d.status.toLowerCase() === lowerStatus);
    }
  }
  if (regionFilter && regionFilter !== "all") {
    vehicles = vehicles.filter(v => v.region.toLowerCase() === regionFilter.toLowerCase());
  }

  // Calculate KPIs
  const activeVehicles = vehicles.filter(v => v.status === "OnTrip").length;
  const availableVehicles = vehicles.filter(v => v.status === "Available").length;
  const inShopVehicles = vehicles.filter(v => v.status === "InShop").length;
  const retiredVehicles = vehicles.filter(v => v.status === "Retired").length;

  const activeTrips = trips.filter(t => t.status === "Dispatched").length;
  const pendingTrips = trips.filter(t => t.status === "Draft").length;

  // On-duty Drivers = Available + OnTrip
  const onDutyDrivers = drivers.filter(d => d.status === "Available" || d.status === "OnTrip").length;

  // Fleet Utilization = (Vehicles On Trip / Total Non-Retired Vehicles) * 100
  const totalNonRetired = vehicles.filter(v => v.status !== "Retired").length;
  const fleetUtilization = totalNonRetired > 0 
    ? Math.round((activeVehicles / totalNonRetired) * 100) 
    : 0;

  return NextResponse.json({
    activeVehicles,
    availableVehicles,
    inShopVehicles,
    retiredVehicles,
    activeTrips,
    pendingTrips,
    onDutyDrivers,
    fleetUtilization,
    totalVehicles: vehicles.length,
    totalDrivers: drivers.length,
  });
}
