"use client";

import React from "react";
import { Navigation } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function TripsPage() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-h1 text-text-primary">Trips Dispatch</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Manage and dispatch active transport trips.
        </p>
      </div>
      <EmptyState
        icon={Navigation}
        title="Coming Soon"
        description="The Trips Dispatch module is currently under development. Real functionality will be added in a later update."
      />
    </div>
  );
}
