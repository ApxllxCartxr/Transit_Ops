"use client";

import React from "react";
import { authClient } from "@/lib/auth-client";
import { ToastProvider } from "@/components/ui/toast";

interface Props {
  children: React.ReactNode;
}

export default function SessionProvider({ children }: Props) {
  // useSession provides `data` and `isPending` and subscribes to session changes
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-0">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[10px] animate-shimmer" />
            <div className="space-y-2">
              <div className="h-3 w-28 rounded animate-shimmer" />
              <div className="h-2 w-20 rounded animate-shimmer" />
            </div>
          </div>
          <p className="text-body-sm text-text-secondary">Loading session…</p>
        </div>
      </div>
    );
  }

  // Render children regardless of whether session exists; components will react accordingly.
  return <ToastProvider>{children}</ToastProvider>;
}
