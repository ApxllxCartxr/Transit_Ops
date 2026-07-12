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

    const vehicle = mockDb.getVehicles().find((v) => v.id === id);
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
    }

    // Soft lock: Retired vehicles cannot be un-retired directly
    if (vehicle.status === "Retired" && body.status && body.status !== "Retired") {
      if (!body.reinstate) {
        return NextResponse.json(
          {
            error: "Retired vehicles are locked. Use the explicit 'Reinstate' action to restore them.",
            code: "VEHICLE_RETIRED_LOCK",
          },
          { status: 400 }
        );
      }
    }

    // Odometer must be monotonically non-decreasing
    if (body.odometer_km !== undefined) {
      const newOdometer = Number(body.odometer_km);
      if (newOdometer < vehicle.odometer_km) {
        return NextResponse.json(
          { error: `Odometer cannot decrease. Current value: ${vehicle.odometer_km} km.` },
          { status: 400 }
        );
      }
    }

    // Unique registration check if modified
    if (
      body.registration_number &&
      body.registration_number.toLowerCase() !== vehicle.registration_number.toLowerCase()
    ) {
      const regRegex = /^[A-Z0-9- ]{5,15}$/i;
      if (!regRegex.test(body.registration_number)) {
        return NextResponse.json(
          { error: "Invalid registration number format. Must be 5-15 alphanumeric characters." },
          { status: 400 }
        );
      }
      const existing = mockDb
        .getVehicles()
        .find(
          (v) =>
            v.id !== id &&
            v.registration_number.toLowerCase() === body.registration_number.toLowerCase()
        );
      if (existing) {
        return NextResponse.json(
          { error: "A vehicle with this registration number already exists." },
          { status: 400 }
        );
      }
    }

    // Remove client UI flag before updating
    const updateData = { ...body };
    delete updateData.reinstate;

    const updated = mockDb.updateVehicle(id, updateData);
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

  const vehicle = mockDb.getVehicles().find((v) => v.id === id);
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  }

  // Soft-delete = status to Retired
  mockDb.updateVehicle(id, { status: "Retired" });
  return NextResponse.json({ success: true, message: "Vehicle soft-deleted successfully." });
}
