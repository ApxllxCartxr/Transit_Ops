import { NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || "all";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const size = parseInt(searchParams.get("size") || "50", 10);

  let trips = mockDb.getTrips();

  if (status !== "all") {
    trips = trips.filter(
      (t) => t.status.toLowerCase() === status.toLowerCase()
    );
  }

  // Sort: newest first
  trips = [...trips].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const total = trips.length;
  const start = (page - 1) * size;
  const items = trips.slice(start, start + size);

  return NextResponse.json({ items, total, page, size });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.vehicle_id || !body.driver_id) {
      return NextResponse.json(
        { error: "vehicle_id and driver_id are required." },
        { status: 400 }
      );
    }

    const vehicles = mockDb.getVehicles();
    const drivers = mockDb.getDrivers();

    const vehicle = vehicles.find((v) => v.id === body.vehicle_id);
    const driver = drivers.find((d) => d.id === body.driver_id);

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }
    if (!driver) {
      return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }
    if (vehicle.status !== "Available") {
      return NextResponse.json(
        {
          error: `Vehicle '${vehicle.registration_number}' is not available (current status: ${vehicle.status}).`,
        },
        { status: 422 }
      );
    }
    if (driver.status !== "Available") {
      return NextResponse.json(
        {
          error: `Driver '${driver.full_name}' is not available (current status: ${driver.status}).`,
        },
        { status: 422 }
      );
    }

    const created = mockDb.addTrip({
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      status: "Draft",
      cancelled: false,
      vehicle_registration: vehicle.registration_number,
      vehicle_name: vehicle.name,
      driver_name: driver.full_name,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
