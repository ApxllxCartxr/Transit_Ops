"use client";

import React from "react";
import { Wrench } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function MaintenancePage() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-h1 text-text-primary">Maintenance Logs</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Track and manage fleet vehicle maintenance logs.
        </p>
      </div>
      <EmptyState
        icon={Wrench}
        title="Coming Soon"
        description="The Maintenance Logs module is currently under development. Real functionality will be added in a later update."
      />
    </div>
  );
}
