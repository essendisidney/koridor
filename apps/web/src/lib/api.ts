export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

/** Prefer same-origin `/api/v1` in the browser so Vercel auth always works. */
export function getApiUrl() {
  // Browser: always hit this deployment's App Router APIs.
  // Ignores misconfigured NEXT_PUBLIC_API_URL (localhost / dead Nest hosts).
  if (typeof window !== "undefined") {
    return "/api/v1";
  }

  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/v1`;
  return "http://localhost:4000/api/v1";
}

export async function api<T>(
  path: string,
  { method = "GET", body, token, headers = {} }: RequestOptions = {},
): Promise<T> {
  const url = `${getApiUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body:
        body === undefined
          ? undefined
          : isForm
            ? (body as FormData)
            : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Cannot reach the API. Check your connection and try again.",
      0,
      "NETWORK_ERROR",
    );
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      payload?.error?.message ?? payload?.message ?? "Request failed",
      res.status,
      payload?.error?.code,
    );
  }

  return (payload?.data !== undefined ? payload.data : payload) as T;
}

export const API_URL = "/api/v1";
