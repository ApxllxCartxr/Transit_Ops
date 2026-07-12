import { NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const type = searchParams.get("type") || "all";
  const region = searchParams.get("region") || "all";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const size = parseInt(searchParams.get("size") || "20", 10);

  let vehicles = mockDb.getVehicles();

  // Search filter
  if (search) {
    const term = search.toLowerCase();
    vehicles = vehicles.filter(
      (v) =>
        v.registration_number.toLowerCase().includes(term) ||
        v.name.toLowerCase().includes(term) ||
        v.model.toLowerCase().includes(term)
    );
  }

  // Dropdown filters
  if (status !== "all") {
    vehicles = vehicles.filter((v) => v.status.toLowerCase() === status.toLowerCase());
  }
  if (type !== "all") {
    vehicles = vehicles.filter((v) => v.vehicle_type.toLowerCase() === type.toLowerCase());
  }
  if (region !== "all") {
    vehicles = vehicles.filter((v) => v.region.toLowerCase() === region.toLowerCase());
  }

  // Sort: Newest first
  vehicles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Pagination
  const total = vehicles.length;
  const start = (page - 1) * size;
  const paginatedVehicles = vehicles.slice(start, start + size);

  return NextResponse.json({
    items: paginatedVehicles,
    total,
    page,
    size,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Regex check on registration number
    const regRegex = /^[A-Z0-9- ]{5,15}$/i;
    if (!body.registration_number || !regRegex.test(body.registration_number)) {
      return NextResponse.json(
        { error: "Invalid registration number format. Must be 5-15 alphanumeric characters/hyphens." },
        { status: 400 }
      );
    }

    // Check unique constraint in mock DB
    const existing = mockDb.getVehicles().find(
      (v) => v.registration_number.toLowerCase() === body.registration_number.toLowerCase()
    );
    if (existing) {
      return NextResponse.json(
        { error: "A vehicle with this registration number already exists." },
        { status: 400 }
      );
    }

    if (!body.name || !body.model || !body.vehicle_type) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (body.max_load_kg <= 0 || body.odometer_km < 0 || body.acquisition_cost < 0) {
      return NextResponse.json({ error: "Numeric fields must satisfy constraints (load > 0, odometer >= 0, cost >= 0)." }, { status: 400 });
    }

    const created = mockDb.addVehicle({
      registration_number: body.registration_number.toUpperCase(),
      name: body.name,
      model: body.model,
      vehicle_type: body.vehicle_type,
      max_load_kg: Number(body.max_load_kg),
      odometer_km: Number(body.odometer_km),
      acquisition_cost: Number(body.acquisition_cost),
      status: body.status || "Available",
      region: body.region || "Unassigned",
      acquired_at: body.acquired_at || new Date().toISOString().split("T")[0],
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid payload" }, { status: 400 });
  }
}
