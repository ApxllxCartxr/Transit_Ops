import { useEffect, useState } from "react";

type AuthResponse<T> = {
  data: T | null;
  error: string | null;
};

type AuthPayload = {
  email: string;
  password: string;
};

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  image: string | null;
};

type Session = {
  id: string;
  userId: string;
  expiresAt: string;
  token: string;
};

type AuthData = {
  session: Session;
  user: User;
} | null;

async function callAuth<T>(path: string, init: RequestInit): Promise<AuthResponse<T>> {
  const response = await fetch(`/api/auth/${path}`, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });

  const payload = await response.json();
  if (!response.ok) {
    return {
      data: null,
      error: payload?.error || response.statusText || "Authentication request failed.",
    };
  }

  if (payload?.error) {
    return {
      data: null,
      error: payload.error,
    };
  }

  return {
    data: payload as T,
    error: null,
  };
}

export function useSession() {
  const [data, setData] = useState<AuthData>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchSession() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "same-origin",
        });
        const payload = await response.json();

        if (!active) return;

        if (response.ok) {
          setData(payload ?? null);
          setError(null);
        } else {
          setData(null);
          setError(payload?.error || response.statusText || "Failed to load session.");
        }
      } catch (err: any) {
        if (!active) return;
        setError(err.message || "Failed to load session.");
        setData(null);
      } finally {
        if (active) setIsPending(false);
      }
    }

    fetchSession();
    return () => {
      active = false;
    };
  }, []);

  return { data, isPending, error };
}

export const authClient = {
  useSession,
  signIn: {
    email: async (payload: AuthPayload) =>
      callAuth<{ session: Session; user: User }>("sign-in/email", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  signUp: {
    email: async (payload: { email: string; password: string; name: string }) =>
      callAuth<{ session: Session; user: User }>("sign-up/email", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  signOut: async () => {
    const response = await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload?.error || response.statusText || "Sign out failed.");
    }

    return true;
  },
};
