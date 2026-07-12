"use client";

import React from "react";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function ExpensesPage() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-h1 text-text-primary">Fuel & Expenses</h1>
        <p className="text-body-sm text-text-secondary mt-1">
          Track and monitor fuel consumption and operational expenses.
        </p>
      </div>
      <EmptyState
        icon={Receipt}
        title="Coming Soon"
        description="The Fuel & Expenses module is currently under development. Real functionality will be added in a later update."
      />
    </div>
  );
}
