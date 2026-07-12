"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";
import { Truck, Lock, Mail, Eye, EyeOff, Loader2, ShieldAlert, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useToast();
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
        const errorMsg = typeof authError === "string" ? authError : authError.message || "Invalid credentials";
        setError(errorMsg);
        addToast(errorMsg, "error");
      } else {
        addToast("Signed in successfully!", "success");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      const errorMsg = "An unexpected error occurred. Please try again.";
      setError(errorMsg);
      addToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoRole = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("TransitOps@2026!");
  };

  const inputCls = "block w-full rounded-[10px] border border-border-default bg-surface-1 px-3 py-2.5 text-body text-text-primary placeholder:text-text-disabled focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-accent-soft transition-colors";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent text-white" style={{ boxShadow: "var(--glow-accent)" }}>
            <Truck className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <h1 className="mt-6 text-display-lg text-text-primary">
            TransitOps Portal
          </h1>
          <p className="mt-2 text-body-sm text-text-secondary">
            Smart Fleet Operations Management System
          </p>
        </div>

        {/* Card Frame */}
        <div
          className="relative overflow-hidden rounded-[20px] border border-border-subtle bg-surface-2 p-8"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="sr-only">Sign In</h2>

          {error && (
            <div
              className="mb-6 flex items-start gap-3 rounded-[10px] border p-4 text-body-sm"
              style={{
                backgroundColor: "var(--status-failed-bg)",
                borderColor: "var(--status-failed-border)",
                color: "var(--status-failed-fg)",
              }}
            >
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={1.5} />
              <p id="error-message">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email-input" className="block text-caption font-medium text-text-secondary mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-text-disabled" strokeWidth={1.5} />
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
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password-input" className="block text-caption font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-text-disabled" strokeWidth={1.5} />
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
                  className={`${inputCls} pl-10 pr-10`}
                />
                <button
                  id="toggle-password"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-disabled hover:text-text-secondary transition-colors duration-[80ms]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center items-center rounded-[10px] bg-accent px-4 py-2.5 text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-2 disabled:opacity-50 active:scale-[0.97] transition-all duration-[var(--dur-fast)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Demo Roles */}
        <div
          className="rounded-[14px] border border-border-subtle bg-surface-2 p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h3 className="text-body-sm font-semibold text-text-primary mb-1 text-center">
            Demo Credentials & RBAC Profiles
          </h3>
          <p className="text-caption text-text-tertiary mb-4 text-center">
            Click a profile to pre-fill. Password: <strong className="text-text-secondary">TransitOps@2026!</strong>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "demo-admin", email: "admin@transitops.dev", label: "Admin", desc: "Full System Access" },
              { id: "demo-fleet", email: "fleet@transitops.dev", label: "Fleet Manager", desc: "Vehicles & Maint." },
              { id: "demo-dispatch", email: "dispatch@transitops.dev", label: "Dispatcher", desc: "Trips & Dispatch" },
              { id: "demo-safety", email: "safety@transitops.dev", label: "Safety Officer", desc: "Drivers & Compliance" },
            ].map((role) => (
              <button
                key={role.id}
                id={role.id}
                type="button"
                onClick={() => fillDemoRole(role.email)}
                className="flex flex-col items-center justify-center p-2.5 rounded-[10px] border border-border-default bg-surface-1 hover:bg-surface-3 hover:border-accent/30 transition-colors duration-[var(--dur-fast)] text-text-secondary"
              >
                <span className="text-[13px] font-semibold text-text-primary">{role.label}</span>
                <span className="text-[10px] text-text-tertiary">{role.desc}</span>
              </button>
            ))}
            <button
              id="demo-finance"
              type="button"
              onClick={() => fillDemoRole("finance@transitops.dev")}
              className="col-span-2 flex flex-col items-center justify-center p-2.5 rounded-[10px] border border-border-default bg-surface-1 hover:bg-surface-3 hover:border-accent/30 transition-colors duration-[var(--dur-fast)] text-text-secondary"
            >
              <span className="text-[13px] font-semibold text-text-primary">Financial Analyst</span>
              <span className="text-[10px] text-text-tertiary">Expenses, Fuel & ROI Reports</span>
            </button>
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-body-sm text-text-secondary">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-accent hover:text-accent-hover inline-flex items-center gap-1 transition-colors"
            >
              Create one now
              <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
