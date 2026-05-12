import { buildApiUrl } from "@/config/env";
import {
  httpRequest,
  readJsonSafe,
  RequestAbortedError,
  RequestTimeoutError,
} from "@/lib/api/httpClient";
import { useAuthStore } from "@/stores/authStore";
import { clearAdminPersistedStores } from "@/stores/adminLayoutStore";

export type AdminClientFailure =
  | "UNAUTHORIZED"
  | "NETWORK"
  | "TIMEOUT"
  | "MALFORMED"
  | "SERVER"
  | "ABORTED"
  | "UNEXPECTED";

export class AdminClientError extends Error {
  constructor(
    public readonly failure: AdminClientFailure,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminClientError";
  }
}

function redirectUnauthorized(): void {
  useAuthStore.getState().clearSession();
  clearAdminPersistedStores();
  window.location.assign("/login?reason=session_expired");
}

function isMalformed(json: unknown): json is { __malformedJson: true } {
  return !!json && typeof json === "object" && "__malformedJson" in json;
}

export interface AdminRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function adminRequest<T>(
  path: string,
  options: AdminRequestOptions = {},
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
      throw new AdminClientError("ABORTED", 0, "Request aborted");
    }
    if (err instanceof RequestTimeoutError) {
      throw new AdminClientError("TIMEOUT", 0, "Request timed out");
    }
    if (err instanceof TypeError) {
      throw new AdminClientError("NETWORK", 0, "Network error");
    }
    throw new AdminClientError("UNEXPECTED", 0, "Unexpected error");
  }

  if (response.status === 401) {
    redirectUnauthorized();
    throw new AdminClientError("UNAUTHORIZED", 401, "Session expired");
  }

  const json = await readJsonSafe(response);

  if (json === null || json === undefined || isMalformed(json)) {
    throw new AdminClientError(
      "MALFORMED",
      response.status,
      "Unexpected response",
    );
  }

  if (!response.ok) {
    const message =
      typeof json === "object" &&
      json &&
      "message" in json &&
      typeof json.message === "string"
        ? json.message
        : "Request failed";
    const failure: AdminClientFailure =
      response.status >= 500 ? "SERVER" : "UNEXPECTED";
    throw new AdminClientError(failure, response.status, message);
  }

  if (
    typeof json !== "object" ||
    !json ||
    !("success" in json) ||
    json.success !== true
  ) {
    throw new AdminClientError(
      "MALFORMED",
      response.status,
      "Unexpected response",
    );
  }

  if (!("data" in json)) {
    throw new AdminClientError(
      "MALFORMED",
      response.status,
      "Unexpected response",
    );
  }

  return json.data as T;
}
