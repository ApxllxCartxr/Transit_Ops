import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt, normalizeAndMapRole, isSessionExpired, canAccessRoute, ROUTES } from "@/lib/auth-utils";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;

  // Root redirect logic
  if (pathname === "/") {
    if (sessionToken) {
      const payload = decodeJwt(sessionToken);
      if (payload && !isSessionExpired(payload.exp)) {
        return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
      } else {
        const response = NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
        response.cookies.delete("better-auth.session_token");
        return response;
      }
    } else {
      return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
    }
  }

  const isAuthPage = pathname === ROUTES.LOGIN;
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/vehicles") ||
    pathname.startsWith("/drivers") ||
    pathname.startsWith("/trips") ||
    pathname.startsWith("/maintenance") ||
    pathname.startsWith("/expenses") ||
    pathname.startsWith("/reports");

  if (isProtectedRoute) {
    if (!sessionToken) {
      const loginUrl = new URL(ROUTES.LOGIN, request.url);
      loginUrl.searchParams.set("callbackUrl", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const payload = decodeJwt(sessionToken);
    if (!payload || isSessionExpired(payload.exp)) {
      const loginUrl = new URL(ROUTES.LOGIN, request.url);
      loginUrl.searchParams.set("callbackUrl", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("better-auth.session_token");
      return response;
    }

    // Role-based Access Control via Centralized Permission Matrix
    const role = normalizeAndMapRole(payload.roles || []);
    if (!canAccessRoute(role, pathname)) {
      console.warn(`RBAC violation: User ${payload.email} with role ${role} tried to access ${pathname}`);
      return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
    }
  }

  if (isAuthPage && sessionToken) {
    const payload = decodeJwt(sessionToken);
    if (payload && !isSessionExpired(payload.exp)) {
      return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
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
