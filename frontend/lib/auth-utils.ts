import { isActionAllowed } from "./rbac-guards";

export const ROUTES = {
  DASHBOARD: "/dashboard",
  LOGIN: "/login",
};

export function decodeJwt(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }

    const jsonStr = typeof Buffer !== "undefined"
      ? Buffer.from(base64, "base64").toString("utf-8")
      : atob(base64);

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

export function isSessionExpired(exp?: number): boolean {
  if (!exp) return true;
  return Date.now() >= exp * 1000;
}

export function normalizeAndMapRole(roles: string | string[]): string {
  const roleList = Array.isArray(roles) ? roles : [roles];
  for (const r of roleList) {
    if (!r) continue;
    // Map spaces if any, e.g. "Fleet Manager" -> "FleetManager"
    const cleaned = r.replace(/\s+/g, "");
    if (["Admin", "FleetManager", "Dispatcher", "SafetyOfficer", "FinancialAnalyst"].includes(cleaned)) {
      return cleaned;
    }
  }
  return "Dispatcher"; // Fallback default
}

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard": ["Admin", "FleetManager", "Dispatcher", "SafetyOfficer", "FinancialAnalyst"],
  "/vehicles": ["Admin", "FleetManager", "Dispatcher"],
  "/drivers": ["Admin", "SafetyOfficer", "Dispatcher"],
  "/trips": ["Admin", "Dispatcher"],
  "/maintenance": ["Admin", "FleetManager"],
  "/expenses": ["Admin", "FinancialAnalyst"],
  "/reports": ["Admin", "FinancialAnalyst", "FleetManager"],
};

export function canAccessRoute(role: string, pathname: string): boolean {
  const cleanPath = pathname.split("?")[0].split("#")[0];
  const matchingKey = Object.keys(ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length)
    .find((key) => cleanPath === key || cleanPath.startsWith(key + "/"));

  if (!matchingKey) {
    return true;
  }

  return ROUTE_PERMISSIONS[matchingKey].includes(role);
}
