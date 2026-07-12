import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "line" | "circle" | "card";
}

export function Skeleton({
  className,
  variant = "line",
  ...props
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-slate-200 dark:bg-slate-800 rounded";

  const variantClasses = {
    line: "h-4 w-full",
    circle: "h-10 w-10 rounded-full",
    card: "h-32 w-full rounded-lg",
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    />
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 5 }: SkeletonTableProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-3 items-center">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              variant="line"
              className={colIdx === 0 ? "h-12 w-12 flex-shrink-0" : "h-4 flex-1"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonKPIProps {
  count?: number;
}

export function SkeletonKPI({ count = 4 }: SkeletonKPIProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton variant="card" className="h-10" />
        </div>
      ))}
    </div>
  );
}
