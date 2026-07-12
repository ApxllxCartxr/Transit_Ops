import { NextRequest, NextResponse } from "next/server";

// Helper to parse role from email
function getRoleFromEmail(email: string): string {
  const parts = email.split("@")[0].toLowerCase();
  if (parts.includes("admin")) return "Admin";
  if (parts.includes("fleet")) return "FleetManager";
  if (parts.includes("dispatch")) return "Dispatcher";
  if (parts.includes("safety")) return "SafetyOfficer";
  if (parts.includes("finance") || parts.includes("analyst")) return "FinancialAnalyst";
  return "FleetManager"; // Default role
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ all: string[] }> }) {
  const resolvedParams = await params;
  const path = resolvedParams.all.join("/");

  if (path === "session") {
    const sessionToken = request.cookies.get("better-auth.session_token")?.value;

    if (!sessionToken || !sessionToken.startsWith("mock_session:")) {
      return NextResponse.json(null);
    }

    const [_, email, role] = sessionToken.split(":");
    const name = email.split("@")[0].replace(/[^a-zA-Z]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

    return NextResponse.json({
      session: {
        id: "mock-session-id",
        userId: "mock-user-id",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        token: sessionToken,
      },
      user: {
        id: "mock-user-id",
        email,
        name,
        role,
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
      const { email, password } = await request.json();

      if (!email || !password || password.length < 6) {
        return NextResponse.json({ error: "Invalid credentials. Password must be >= 6 characters." }, { status: 400 });
      }

      const role = getRoleFromEmail(email);
      const name = email.split("@")[0].replace(/[^a-zA-Z]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      const sessionToken = `mock_session:${email}:${role}`;

      const response = NextResponse.json({
        session: {
          id: "mock-session-id",
          userId: "mock-user-id",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          token: sessionToken,
        },
        user: {
          id: "mock-user-id",
          email,
          name,
          role,
          image: null,
        },
      });

      // Set cookie
      response.cookies.set("better-auth.session_token", sessionToken, {
        httpOnly: true,
        path: "/",
        maxAge: 24 * 60 * 60, // 24 hours
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });

      return response;
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  if (path === "sign-up/email") {
    try {
      const { email, password, name } = await request.json();

      if (!email || !password || password.length < 6) {
        return NextResponse.json({ error: "Password must be >= 6 characters." }, { status: 400 });
      }

      const role = getRoleFromEmail(email);
      const displayName = name || email.split("@")[0];
      const sessionToken = `mock_session:${email}:${role}`;

      const response = NextResponse.json({
        session: {
          id: "mock-session-id",
          userId: "mock-user-id",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          token: sessionToken,
        },
        user: {
          id: "mock-user-id",
          email,
          name: displayName,
          role,
          image: null,
        },
      });

      // Set cookie
      response.cookies.set("better-auth.session_token", sessionToken, {
        httpOnly: true,
        path: "/",
        maxAge: 24 * 60 * 60,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });

      return response;
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  if (path === "sign-out") {
    const response = NextResponse.json({ success: true });
    response.cookies.delete("better-auth.session_token");
    return response;
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
