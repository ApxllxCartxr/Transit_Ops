"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Truck, Lock, Mail, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        setError(typeof authError === "string" ? authError : authError.message || "Invalid credentials");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoRole = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("TransitOps@2026!");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Truck className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            TransitOps Portal
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Smart Fleet Operations Management System
          </p>
        </div>

        {/* Card Frame */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/70 p-8 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-slate-950/50">
          <h2 className="sr-only">Sign In</h2>
          
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-status-danger/10 p-4 text-sm text-status-danger border border-status-danger/20">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <p id="error-message">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@transitops.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2 text-slate-900 placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-primary sm:text-sm"
                />
                <button
                  id="toggle-password"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Demo Roles Helper Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-sm dark:border-slate-800 dark:bg-slate-900/30">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 text-center">
            Demo Credentials & RBAC Profiles
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 text-center">
            Click a profile to automatically pre-fill login inputs. Use password <strong>TransitOps@2026!</strong>.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              id="demo-admin"
              type="button"
              onClick={() => fillDemoRole("admin@transitops.dev")}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary/55 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 transition-colors text-slate-700 dark:text-slate-350"
            >
              <span className="font-semibold">Admin</span>
              <span className="text-[10px] text-slate-450 dark:text-slate-500">Full System Access</span>
            </button>
            <button
              id="demo-fleet"
              type="button"
              onClick={() => fillDemoRole("fleet@transitops.dev")}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary/55 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 transition-colors text-slate-700 dark:text-slate-350"
            >
              <span className="font-semibold">Fleet Manager</span>
              <span className="text-[10px] text-slate-450 dark:text-slate-500">Vehicles & Maint.</span>
            </button>
            <button
              id="demo-dispatch"
              type="button"
              onClick={() => fillDemoRole("dispatch@transitops.dev")}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary/55 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 transition-colors text-slate-700 dark:text-slate-350"
            >
              <span className="font-semibold">Dispatcher</span>
              <span className="text-[10px] text-slate-450 dark:text-slate-500">Trips & Dispatch</span>
            </button>
            <button
              id="demo-safety"
              type="button"
              onClick={() => fillDemoRole("safety@transitops.dev")}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary/55 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 transition-colors text-slate-700 dark:text-slate-350"
            >
              <span className="font-semibold">Safety Officer</span>
              <span className="text-[10px] text-slate-450 dark:text-slate-500">Drivers & Compliance</span>
            </button>
            <button
              id="demo-finance"
              type="button"
              onClick={() => fillDemoRole("finance@transitops.dev")}
              className="col-span-2 flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary/55 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 transition-colors text-slate-700 dark:text-slate-350"
            >
              <span className="font-semibold">Financial Analyst</span>
              <span className="text-[10px] text-slate-450 dark:text-slate-500">Expenses, Fuel & ROI Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
