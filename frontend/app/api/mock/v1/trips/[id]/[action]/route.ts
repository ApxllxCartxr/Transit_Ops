import { NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/mock-store";

interface RouteContext {
  params: Promise<{ id: string; action: string }>;
}

// POST /api/v1/trips/:id/dispatch
// POST /api/v1/trips/:id/complete
// POST /api/v1/trips/:id/cancel
export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id, action } = await context.params;

    const trips = mockDb.getTrips();
    const trip = trips.find((t) => t.id === id);

    if (!trip) {
      return NextResponse.json({ error: "Trip not found." }, { status: 404 });
    }

    let nextStatus: "Draft" | "Dispatched" | "Completed" | "Cancelled";

    switch (action) {
      case "dispatch":
        if (trip.status !== "Draft") {
          return NextResponse.json(
            { error: "Only Draft trips can be dispatched." },
            { status: 422 }
          );
        }
        nextStatus = "Dispatched";
        break;
      case "complete":
        if (trip.status !== "Dispatched") {
          return NextResponse.json(
            { error: "Only Dispatched trips can be completed." },
            { status: 422 }
          );
        }
        nextStatus = "Completed";
        break;
      case "cancel":
        if (trip.status === "Completed" || trip.status === "Cancelled") {
          return NextResponse.json(
            { error: "Completed or Cancelled trips cannot be cancelled." },
            { status: 422 }
          );
        }
        nextStatus = "Cancelled";
        break;
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const updated = mockDb.updateTripStatus(id, nextStatus);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
