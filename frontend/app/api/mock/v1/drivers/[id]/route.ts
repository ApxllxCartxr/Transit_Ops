import { NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();

    const driver = mockDb.getDrivers().find((d) => d.id === id);
    if (!driver) {
      return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }

    // Check unique license number if changing
    if (
      body.license_number &&
      body.license_number.toLowerCase() !== driver.license_number.toLowerCase()
    ) {
      const existing = mockDb
        .getDrivers()
        .find(
          (d) =>
            d.id !== id &&
            d.license_number.toLowerCase() === body.license_number.toLowerCase()
        );
      if (existing) {
        return NextResponse.json(
          { error: "A driver with this license number already exists." },
          { status: 400 }
        );
      }
    }

    // Safety score constraint (0-100)
    if (body.safety_score !== undefined) {
      const score = Number(body.safety_score);
      if (score < 0 || score > 100) {
        return NextResponse.json({ error: "Safety score must be between 0 and 100." }, { status: 400 });
      }
    }

    const updated = mockDb.updateDriver(id, body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid payload" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const driver = mockDb.getDrivers().find((d) => d.id === id);
  if (!driver) {
    return NextResponse.json({ error: "Driver not found." }, { status: 404 });
  }

  mockDb.deleteDriver(id);
  return NextResponse.json({ success: true, message: "Driver deleted successfully." });
}
