import { buildApiUrl } from "@/config/env";
import {
  httpRequest,
  readJsonSafe,
  RequestAbortedError,
  RequestTimeoutError,
} from "@/lib/api/httpClient";
import { useAuthStore } from "@/stores/authStore";
import { clearAdminPersistedStores } from "@/stores/adminLayoutStore";
import { clearWardenPersistedStores } from "@/stores/wardenLayoutStore";

export type WardenClientFailure =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NETWORK"
  | "TIMEOUT"
  | "MALFORMED"
  | "SERVER"
  | "ABORTED"
  | "UNEXPECTED";

export class WardenClientError extends Error {
  constructor(
    public readonly failure: WardenClientFailure,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "WardenClientError";
  }
}

function redirectUnauthorized(): void {
  useAuthStore.getState().clearSession();
  clearAdminPersistedStores();
  clearWardenPersistedStores();
  window.location.assign("/login?reason=session_expired");
}

function isMalformed(json: unknown): json is { __malformedJson: true } {
  return !!json && typeof json === "object" && "__malformedJson" in json;
}

export interface WardenRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function wardenRequest<T>(
  path: string,
  options: WardenRequestOptions = {},
): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await httpRequest(buildApiUrl(path), {
      method: options.method ?? "GET",
      body: options.body,
      headers,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
  } catch (err) {
    if (err instanceof RequestAbortedError) {
      throw new WardenClientError("ABORTED", 0, "Request aborted");
    }
    if (err instanceof RequestTimeoutError) {
      throw new WardenClientError("TIMEOUT", 0, "Request timed out");
    }
    if (err instanceof TypeError) {
      throw new WardenClientError("NETWORK", 0, "Network error");
    }
    throw new WardenClientError("UNEXPECTED", 0, "Unexpected error");
  }

  if (response.status === 401) {
    redirectUnauthorized();
    throw new WardenClientError("UNAUTHORIZED", 401, "Session expired");
  }

  if (response.status === 403) {
    throw new WardenClientError("FORBIDDEN", 403, "You do not have access to this resource.");
  }

  const json = await readJsonSafe(response);

  if (json === null || json === undefined || isMalformed(json)) {
    throw new WardenClientError("MALFORMED", response.status, "Unexpected response");
  }

  if (!response.ok) {
    const message =
      typeof json === "object" &&
      json &&
      "message" in json &&
      typeof json.message === "string"
        ? json.message
        : "Request failed";
    const failure: WardenClientFailure = response.status >= 500 ? "SERVER" : "UNEXPECTED";
    throw new WardenClientError(failure, response.status, message);
  }

  if (typeof json !== "object" || !json || !("success" in json) || json.success !== true) {
    throw new WardenClientError("MALFORMED", response.status, "Unexpected response");
  }

  if (!("data" in json)) {
    throw new WardenClientError("MALFORMED", response.status, "Unexpected response");
  }

  return json.data as T;
}
