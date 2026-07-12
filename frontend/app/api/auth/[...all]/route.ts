import { NextRequest, NextResponse } from "next/server";
import { decodeJwt, normalizeAndMapRole, isSessionExpired } from "@/lib/auth-utils";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Reusable backend fetching helper
async function callBackend(path: string, method: "GET" | "POST", body?: any, headers: Record<string, string> = {}) {
  const url = `${BACKEND_URL}${path}`;
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response;
  } catch (error) {
    console.error(`Backend connectivity failure on ${method} ${url}:`, error);
    return null; // Return null to represent connection timeout/failures
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ all: string[] }> }) {
  const resolvedParams = await params;
  const path = resolvedParams.all.join("/");

  if (path === "get-session" || path === "session") {
    const sessionToken = request.cookies.get("better-auth.session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json(null);
    }

    const jwtPayload = decodeJwt(sessionToken);
    if (!jwtPayload || isSessionExpired(jwtPayload.exp)) {
      const response = NextResponse.json(null);
      response.cookies.delete("better-auth.session_token");
      return response;
    }

    // Validate the token by hitting the backend source-of-truth /me endpoint
    const backendRes = await callBackend("/api/v1/auth/me", "GET", undefined, {
      "Authorization": `Bearer ${sessionToken}`,
    });

    if (!backendRes || !backendRes.ok) {
      const response = NextResponse.json(null);
      response.cookies.delete("better-auth.session_token");
      return response;
    }

    const userData = await backendRes.json();
    return NextResponse.json({
      session: {
        id: sessionToken,
        userId: userData.id,
        expiresAt: new Date(jwtPayload.exp * 1000).toISOString(),
        token: sessionToken,
      },
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.full_name,
        role: normalizeAndMapRole(userData.roles),
        image: null,
      },
    });
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ all: string[] }> }) {
  const resolvedParams = await params;
  const path = resolvedParams.all.join("/");

  if (path === "sign-in/email") {
    try {
      // CSRF mitigation check
      const origin = request.headers.get("origin") || request.headers.get("referer");
      if (origin && !origin.includes(request.headers.get("host") || "")) {
        return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
      }

      const { email, password } = await request.json();
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
      }

      // Forward client's IP to the backend to support rate limiting
      const clientIp = request.headers.get("x-forwarded-for") || request.ip || "";
      const headers: Record<string, string> = {};
      if (clientIp) {
        headers["X-Forwarded-For"] = clientIp;
      }

      const backendRes = await callBackend("/api/v1/auth/login", "POST", { email, password }, headers);

      if (!backendRes) {
        return NextResponse.json(
          { error: "TransitOps authentication server is temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }

      if (!backendRes.ok) {
        const errBody = await backendRes.json().catch(() => ({}));
        // Generic error mapping without leaking internal database states
        const message = errBody.detail || "Invalid email or password";
        return NextResponse.json({ error: message, message }, { status: backendRes.status });
      }

      const loginData = await backendRes.json();
      const token = loginData.token;
      const jwtPayload = decodeJwt(token);

      const response = NextResponse.json({
        session: {
          id: token,
          userId: loginData.user.id,
          expiresAt: jwtPayload ? new Date(jwtPayload.exp * 1000).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          token: token,
        },
        user: {
          id: loginData.user.id,
          email: loginData.user.email,
          name: loginData.user.full_name,
          role: normalizeAndMapRole(loginData.user.roles),
          image: null,
        },
      });

      // Write secure cookie
      const isProd = process.env.NODE_ENV === "production";
      const maxAgeSeconds = jwtPayload ? jwtPayload.exp - Math.floor(Date.now() / 1000) : 3600;

      response.cookies.set("better-auth.session_token", token, {
        httpOnly: true,
        path: "/",
        maxAge: maxAgeSeconds > 0 ? maxAgeSeconds : 3600,
        sameSite: "lax",
        secure: isProd,
      });

      return response;
    } catch (e) {
      return NextResponse.json({ error: "Invalid request payload format" }, { status: 400 });
    }
  }

  if (path === "sign-out") {
    const sessionToken = request.cookies.get("better-auth.session_token")?.value;
    if (sessionToken) {
      await callBackend("/api/v1/auth/logout", "POST", undefined, {
        "Authorization": `Bearer ${sessionToken}`,
      });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("better-auth.session_token");
    return response;
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
