import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;

  // Root redirect logic
  if (pathname === "/") {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  const isAuthPage = pathname === "/login";
  const isProtectedRoute = pathname.startsWith("/dashboard") || 
                           pathname.startsWith("/vehicles") || 
                           pathname.startsWith("/drivers") || 
                           pathname.startsWith("/trips") || 
                           pathname.startsWith("/maintenance") || 
                           pathname.startsWith("/expenses") || 
                           pathname.startsWith("/reports");

  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    // Remember original URL to redirect back after login (optional UX benefit)
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Basic RBAC Route Protection on the Frontend
  if (sessionToken && sessionToken.startsWith("mock_session:")) {
    const [_, email, role] = sessionToken.split(":");

    // Fleet Manager routes: /vehicles, /maintenance
    // Safety Officer routes: /drivers
    // Financial Analyst routes: /expenses, /reports, /fuel-logs
    // Dispatcher routes: /trips
    // Admins: Full access

    if (role !== "Admin") {
      if (pathname.startsWith("/drivers") && role !== "SafetyOfficer") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if ((pathname.startsWith("/vehicles") || pathname.startsWith("/maintenance")) && role !== "FleetManager") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if ((pathname.startsWith("/expenses") || pathname.startsWith("/reports")) && role !== "FinancialAnalyst") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (pathname.startsWith("/trips") && role !== "Dispatcher") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/vehicles/:path*",
    "/drivers/:path*",
    "/trips/:path*",
    "/maintenance/:path*",
    "/expenses/:path*",
    "/reports/:path*",
  ],
};
