"use client";

import React from "react";
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Maintenance Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track and manage fleet vehicle maintenance logs.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
          <Wrench className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Coming Soon</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          The Maintenance Logs module is currently under development. Real functionality will be added in a later update.
        </p>
      </div>
    </div>
  );
}
