"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = Math.random().toString(36).substr(2, 9);
      const toast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev, toast]);

      if (duration) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const styles: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: {
      bg: "var(--status-success-bg)",
      border: "var(--status-success-border)",
      text: "var(--status-success-fg)",
    },
    error: {
      bg: "var(--status-failed-bg)",
      border: "var(--status-failed-border)",
      text: "var(--status-failed-fg)",
    },
    warning: {
      bg: "var(--status-warning-bg)",
      border: "var(--status-warning-border)",
      text: "var(--status-warning-fg)",
    },
    info: {
      bg: "var(--status-info-bg)",
      border: "var(--status-info-border)",
      text: "var(--status-info-fg)",
    },
  };

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
  }[toast.type];

  const s = styles[toast.type];

  return (
    <div
      className="flex items-start gap-3 rounded-[10px] border p-4 backdrop-blur-sm"
      style={{
        backgroundColor: s.bg,
        borderColor: s.border,
        color: s.text,
        boxShadow: "var(--shadow-popover)",
      }}
      role="alert"
      aria-live="polite"
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="flex-1 text-[13px] font-medium">{toast.message}</p>
      <button
        onClick={onClose}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity duration-[80ms]"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
