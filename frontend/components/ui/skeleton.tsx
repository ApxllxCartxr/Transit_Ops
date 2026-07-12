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
  const variantClasses = {
    line: "h-4 w-full rounded-[6px]",
    circle: "h-10 w-10 rounded-full",
    card: "h-32 w-full rounded-[14px]",
  };

  return (
    <div
      className={cn("animate-shimmer", variantClasses[variant], className)}
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
              className={colIdx === 0 ? "h-10 w-10 flex-shrink-0 rounded-full" : "h-4 flex-1"}
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
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-[14px] border border-border-subtle bg-surface-2 p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <Skeleton className="h-3 w-28 mb-4" />
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
