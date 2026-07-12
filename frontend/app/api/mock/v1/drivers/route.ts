import { NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const size = parseInt(searchParams.get("size") || "20", 10);

  let drivers = mockDb.getDrivers();

  // Search filter
  if (search) {
    const term = search.toLowerCase();
    drivers = drivers.filter(
      (d) =>
        d.full_name.toLowerCase().includes(term) ||
        d.license_number.toLowerCase().includes(term) ||
        d.contact_number.toLowerCase().includes(term)
    );
  }

  // Dropdown filter
  if (status !== "all") {
    drivers = drivers.filter((d) => d.status.toLowerCase() === status.toLowerCase());
  }

  // Sort: Newest first
  drivers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Pagination
  const total = drivers.length;
  const start = (page - 1) * size;
  const paginatedDrivers = drivers.slice(start, start + size);

  return NextResponse.json({
    items: paginatedDrivers,
    total,
    page,
    size,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.full_name || !body.license_number || !body.license_category || !body.license_expiry) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // License number unique check in mock DB
    const existing = mockDb.getDrivers().find(
      (d) => d.license_number.toLowerCase() === body.license_number.toLowerCase()
    );
    if (existing) {
      return NextResponse.json(
        { error: "A driver with this license number already exists." },
        { status: 400 }
      );
    }

    // Safety score constraint (0-100)
    const safetyScore = body.safety_score !== undefined ? Number(body.safety_score) : 100;
    if (safetyScore < 0 || safetyScore > 100) {
      return NextResponse.json({ error: "Safety score must be between 0 and 100." }, { status: 400 });
    }

    const created = mockDb.addDriver({
      full_name: body.full_name,
      license_number: body.license_number,
      license_category: body.license_category,
      license_expiry: body.license_expiry,
      contact_number: body.contact_number || "Unspecified",
      safety_score: safetyScore,
      status: body.status || "Available",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid payload" }, { status: 400 });
  }
}
