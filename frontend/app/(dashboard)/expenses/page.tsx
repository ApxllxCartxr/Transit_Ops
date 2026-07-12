"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Receipt, Fuel, DollarSign, Loader2, Filter } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import type { CostDetails, Vehicle } from "@/types/api";

const TAB_OPTIONS = [
  { id: "fuel", label: "Fuel" },
  { id: "expenses", label: "Expenses" },
];

export default function ExpensesPage() {
  const { data: session } = authClient.useSession();
  const { addToast } = useToast();
  const userRole = (session?.user as any)?.role || "FinancialAnalyst";

  const [activeTab, setActiveTab] = useState("fuel");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [costDetails, setCostDetails] = useState<CostDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    setIsVehiclesLoading(true);
    try {
      const data = await apiClient.get<{ items: Vehicle[] }>("vehicles?size=200");
      setVehicles(data.items);
      if (!selectedVehicle && data.items.length > 0) {
        setSelectedVehicle(data.items[0].id);
      }
    } catch (err: any) {
      addToast(err.message || "Unable to load vehicles.", "error");
    } finally {
      setIsVehiclesLoading(false);
    }
  }, [addToast, selectedVehicle]);

  const fetchCostDetails = useCallback(async () => {
    if (!selectedVehicle) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      query.set("start_date", startDate);
      query.set("end_date", endDate);

      const data = await apiClient.get<CostDetails>(
        `costs/${selectedVehicle}?${query.toString()}`
      );
      setCostDetails(data);
    } catch (err: any) {
      setError(err.message || "Unable to load cost details.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedVehicle, startDate, endDate]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    fetchCostDetails();
  }, [fetchCostDetails]);

  const footerItems = useMemo(() => {
    return [
      {
        label: "Operational Cost",
        value: costDetails ? costDetails.operational_cost : 0,
        description: "Fuel + maintenance cost, per SRS §9.2 FR-FUEL-03.",
      },
      {
        label: "Total Cost",
        value: costDetails ? costDetails.total_cost : 0,
        description: "Includes incidentals and other expenses, per FR-FUEL-03a.",
      },
    ];
  }, [costDetails]);

  const activeFuelEntries = costDetails?.fuel_entries ?? [];
  const activeExpenseEntries = costDetails?.expenses ?? [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Fuel & Expenses
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Vehicle</label>
                <select
                  value={selectedVehicle}
                  onChange={(event) => setSelectedVehicle(event.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {isVehiclesLoading ? (
                    <option>Loading...</option>
                  ) : (
                    vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} ({v.name})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={fetchCostDetails}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              <Filter className="mr-2 h-4 w-4" />
              Apply dates
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <Fuel className="h-4 w-4" />
              Fuel and incidentals are loaded from the vehicle cost endpoint.
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-primary text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4 min-h-[260px]">
              {isLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
                  <SkeletonTable rows={5} columns={4} />
                </div>
              ) : error ? (
                <EmptyState
                  icon={Receipt}
                  title="Unable to load cost data"
                  description={error}
                />
              ) : !costDetails ? (
                <EmptyState
                  icon={Receipt}
                  title="No cost data available"
                  description="Select a vehicle and date range to see fuel and expense totals."
                />
              ) : activeTab === "fuel" ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Fuel Cost</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        ${costDetails.fuel_cost.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Maintenance Cost</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        ${costDetails.maintenance_cost.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Operational Cost</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        ${costDetails.operational_cost.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Fuel entries</h3>
                    {activeFuelEntries.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No fuel transactions found in this range.</p>
                    ) : (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-950">
                            <tr>
                              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Date</th>
                              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Liters</th>
                              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Unit Cost</th>
                              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                            {activeFuelEntries.map((entry) => (
                              <tr key={entry.id}>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{new Date(entry.logged_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{entry.liters.toFixed(2)}</td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">${entry.cost_per_liter.toFixed(2)}</td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">${entry.total_cost.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Expense Cost</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        ${costDetails.expense_cost.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Operational Cost</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        ${costDetails.operational_cost.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Cost</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        ${costDetails.total_cost.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Expense records</h3>
                    {activeExpenseEntries.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No expenses found in this range.</p>
                    ) : (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-950">
                            <tr>
                              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Date</th>
                              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Category</th>
                              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Description</th>
                              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                            {activeExpenseEntries.map((entry) => (
                              <tr key={entry.id}>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{new Date(entry.incurred_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{entry.category}</td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{entry.description || "—"}</td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">${entry.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Cost summary</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Distinct totals for operational and total cost.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            {footerItems.map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                  ${item.value.toFixed(2)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            This dashboard uses BE2's cost endpoint and keeps operational and total costs separate per FR-FUEL-03 / FR-FUEL-03a.
          </div>
        </aside>
      </div>
    </div>
  );
}
