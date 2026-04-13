import { useAuthStore } from "@/store/auth";
import { PUBLIC_API_BASE_URL } from "@/lib/public-api-base";

const API_BASE_URL = PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  accessToken?: string | null;
  /** Internal flag — prevents infinite retry loop on refresh failure. */
  _retry?: boolean;
}

async function parseError(res: Response): Promise<{ message: string; data?: unknown }> {
  let message = res.statusText;
  let data: unknown;
  try {
    const body = await res.json();
    message = body.message ?? body.error ?? message;
    data = body;
  } catch {
    // use statusText fallback
  }
  return { message, data };
}

export async function apiFetch<T>(
  path: string,
  { accessToken, _retry, ...options }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // Auto-refresh on 401
  if (res.status === 401 && !_retry) {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json() as { accessToken: string };
        const store = useAuthStore.getState();
        if (store.user) {
          store.setAuth(store.user, data.accessToken);
        }
        // Retry original request with new token
        return apiFetch<T>(path, {
          ...options,
          accessToken: data.accessToken,
          _retry: true,
        });
      }
    } catch {
      // refresh failed — fall through to throw 401
    }

    // Clear auth and redirect to login
    useAuthStore.getState().clear();
    if (typeof window !== "undefined") {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  if (!res.ok) {
    const { message, data } = await parseError(res);
    throw new ApiError(res.status, message, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
