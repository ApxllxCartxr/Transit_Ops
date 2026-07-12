"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Download, Filter, Loader2, BarChart3 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { ReportsSummary } from "@/types/api";

const REPORT_METRICS = [
  {
    key: "fleet_utilization",
    label: "Fleet Utilization",
    description: "Share of non-retired vehicles currently active.",
  },
  {
    key: "fuel_efficiency",
    label: "Fuel Efficiency",
    description: "Average revenue per vehicle, in mpg.",
  },
  {
    key: "vehicle_roi",
    label: "Vehicle ROI",
    description: "Revenue-to-acquisition cost ratio.",
  },
];

function parseMetricValue(value: string): number | null {
  if (!value || value === "N/A") return null;
  const numeric = Number(value.replace(/[,%\sa-zA-Z]+/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

export default function ReportsPage() {
  const { addToast } = useToast();
  const [report, setReport] = useState<ReportsSummary | null>(null);
  const [acquisitionCost, setAcquisitionCost] = useState("50000");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("acquisition_cost", acquisitionCost);
      const data = await apiClient.get<ReportsSummary>(`reports?${params.toString()}`);
      setReport(data);
      addToast("Reports data loaded successfully", "success");
    } catch (err: any) {
      const message = err?.message || "Unable to load reports.";
      setError(message);
      addToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [acquisitionCost, addToast]);

  const downloadCsv = useCallback(() => {
    setIsExporting(true);
    const params = new URLSearchParams();
    params.set("acquisition_cost", acquisitionCost);
    const url = `/api/v1/exports/csv?${params.toString()}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "trips.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsExporting(false), 500);
  }, [acquisitionCost]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const chartData = useMemo(() => {
    if (!report) return [];
    return REPORT_METRICS.map((metric) => ({
      metric: metric.label,
      value: parseMetricValue(String(report[metric.key as keyof ReportsSummary])) ?? 0,
      raw: report[metric.key as keyof ReportsSummary],
    }));
  }, [report]);

  const tableRows = useMemo(() => {
    if (!report) return [];
    return REPORT_METRICS.map((metric) => ({
      label: metric.label,
      value: report[metric.key as keyof ReportsSummary],
      description: metric.description,
    }));
  }, [report]);

  const exportCsv = () => {
    if (!report) {
      addToast("No report data available to export.", "warning");
      return;
    }

    const rows = [
      ["Metric", "Value", "Description"],
      ...tableRows.map((row) => [row.label, row.value, row.description]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reports-summary.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const showEmptyReport = !isLoading && !error && !report;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Analyze real report metrics from the backend, with charting and export.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={isExporting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Downloading..." : "Export CSV"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Filter Panel
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              Acquisition cost scenario
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Set the acquisition cost value used to calculate Vehicle ROI in the report.
            </p>
          </div>
          <div className="grid w-full max-w-sm gap-4 sm:grid-cols-2 lg:max-w-none lg:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Acquisition Cost
              </label>
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <span className="text-slate-500 dark:text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={acquisitionCost}
                  onChange={(event) => setAcquisitionCost(event.target.value)}
                  className="w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={fetchReport}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Filter className="mr-2 h-4 w-4" />
              Run Report
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Summary Chart</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Visualize live report metrics from the backend.</p>
            </div>
            {isLoading && (
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading
              </div>
            )}
          </div>
          <div className="mt-6 h-[320px]">
            {error ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                {error}
              </div>
            ) : isLoading ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
                <div className="space-y-3 w-full max-w-xl">
                  <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              </div>
            ) : showEmptyReport ? (
              <EmptyState
                icon={BarChart3}
                title="No report data available"
                description="Run the report again or adjust the acquisition cost to generate metrics."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any, name: any, props: any) => {
                      const row = chartData.find((item) => item.metric === props.payload?.[0]?.payload.metric);
                      return [row?.raw ?? value, "Value"];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="value" name="Metric Value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Report Table</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Detailed backend values for each report metric.</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            {isLoading ? (
              <div className="bg-slate-50 p-6 dark:bg-slate-950">
                <SkeletonTable rows={4} columns={3} />
              </div>
            ) : showEmptyReport ? (
              <div className="p-6">
                <EmptyState
                  icon={BarChart3}
                  title="No report data available"
                  description="Run the report again or adjust the acquisition cost to generate metrics."
                />
              </div>
            ) : (
              <table className="min-w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Metric</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {tableRows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">{row.label}</td>
                      <td className="px-4 py-3">{row.value}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
