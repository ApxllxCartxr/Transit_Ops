import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[14px] border border-border-subtle bg-surface-2 p-12 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-accent-soft text-accent mb-4">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h3 className="text-h3 text-text-primary">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-body-sm text-text-secondary max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 rounded-[10px] bg-accent px-4 py-2 text-[14px] font-medium text-white hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-[0.97] transition-all duration-[140ms]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
