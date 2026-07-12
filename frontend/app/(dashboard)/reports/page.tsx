"use client";

import React from "react";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Analyze fuel efficiency, fleet utilization, and vehicle ROI reports.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Coming Soon</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          The Reports & Analytics module is currently under development. Real functionality will be added in a later update.
        </p>
      </div>
    </div>
  );
}
