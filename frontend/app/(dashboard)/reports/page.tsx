"use client";

import React from "react";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function ReportsPage() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-h1 text-text-primary">Reports & Analytics</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Analyze fuel efficiency, fleet utilization, and vehicle ROI reports.
        </p>
      </div>
      <EmptyState
        icon={BarChart3}
        title="Coming Soon"
        description="The Reports & Analytics module is currently under development. Real functionality will be added in a later update."
      />
    </div>
  );
}
