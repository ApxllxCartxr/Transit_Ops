"use client";

import React from "react";
import { authClient } from "@/lib/auth-client";
import { ToastProvider } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function SessionProvider({ children }: Props) {
  // useSession provides `data` and `isPending` and subscribes to session changes
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading session...</p>
        </div>
      </div>
    );
  }

  // Render children regardless of whether session exists; components will react accordingly.
  return <ToastProvider>{children}</ToastProvider>;
}
