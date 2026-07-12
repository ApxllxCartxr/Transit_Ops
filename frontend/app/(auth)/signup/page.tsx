"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";
import {
  Truck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  ArrowRight,
  User,
} from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!email || !password || !confirmPassword || !fullName) {
      setError("All fields are required");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const { data, error: authError } = await authClient.signUp.email({
        email,
        password,
        name: fullName,
      });

      if (authError) {
        const errorMsg = typeof authError === "string" ? authError : authError.message || "Sign up failed";
        setError(errorMsg);
        addToast(errorMsg, "error");
      } else if (data) {
        addToast("Account created successfully! Redirecting to dashboard…", "success");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      const message = err?.message || "An unexpected error occurred. Please try again.";
      setError(message);
      addToast(message, "error");
    } finally {
      setIsLoading(false);
    }
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
            Create Your Account
          </h1>
          <p className="mt-2 text-body-sm text-text-secondary">
            Join TransitOps fleet management platform
          </p>
        </div>

        {/* Card Frame */}
        <div
          className="relative overflow-hidden rounded-[20px] border border-border-subtle bg-surface-2 p-8"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="sr-only">Sign Up</h2>

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
            {/* Full Name */}
            <div>
              <label htmlFor="name-input" className="block text-caption font-medium text-text-secondary mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-text-disabled" strokeWidth={1.5} />
                </div>
                <input
                  id="name-input"
                  name="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>

            {/* Email */}
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

            {/* Password */}
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
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pl-10 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-disabled hover:text-text-secondary transition-colors duration-[80ms]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-text-disabled">At least 8 characters recommended</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password-input" className="block text-caption font-medium text-text-secondary mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-text-disabled" strokeWidth={1.5} />
                </div>
                <input
                  id="confirm-password-input"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputCls} pl-10 pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-disabled hover:text-text-secondary transition-colors duration-[80ms]"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-[var(--dur-fast)]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              )}
              {isLoading ? "Creating Account…" : "Create Account"}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-body-sm text-text-secondary">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-accent hover:text-accent-hover transition-colors">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-caption text-center text-text-tertiary">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
