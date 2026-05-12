import { buildApiUrl } from "@/config/env";
import type { LoginFailureReason } from "@/types/auth";
import {
  apiErrorSchema,
  loginSuccessSchema,
  meSuccessSchema,
  type LoginSuccessResult,
} from "@/lib/api/apiTypes";
import {
  httpRequest,
  readJsonSafe,
  RequestAbortedError,
  RequestTimeoutError,
} from "@/lib/api/httpClient";

function mapStatusToFailure(status: number): LoginFailureReason {
  if (status === 401) return "INVALID_CREDENTIALS";
  if (status >= 500) return "SERVER";
  return "UNEXPECTED";
}

export async function loginRequest(
  input: { email: string; password: string },
  signal: AbortSignal,
): Promise<
  | { ok: true; data: LoginSuccessResult }
  | { ok: false; reason: LoginFailureReason; message?: string }
> {
  let response: Response;
  try {
    response = await httpRequest(buildApiUrl("/api/auth/login"), {
      method: "POST",
      body: input,
      signal,
    });
  } catch (err) {
    if (err instanceof RequestAbortedError) {
      return { ok: false, reason: "ABORTED" };
    }
    if (err instanceof RequestTimeoutError) {
      return { ok: false, reason: "TIMEOUT" };
    }
    if (err instanceof TypeError) {
      return { ok: false, reason: "NETWORK" };
    }
    return { ok: false, reason: "UNEXPECTED" };
  }

  const json = await readJsonSafe(response);

  if (json && typeof json === "object" && "__malformedJson" in json) {
    return { ok: false, reason: "MALFORMED_RESPONSE" };
  }

  if (json === null || json === undefined) {
    return { ok: false, reason: "EMPTY_PAYLOAD" };
  }

  if (!response.ok) {
    const parsedErr = apiErrorSchema.safeParse(json);
    return {
      ok: false,
      reason: mapStatusToFailure(response.status),
      message: parsedErr.success ? parsedErr.data.message : undefined,
    };
  }

  const parsed = loginSuccessSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, reason: "MALFORMED_RESPONSE" };
  }

  return {
    ok: true,
    data: {
      token: parsed.data.data.token,
      user: parsed.data.data.user,
      hostel: parsed.data.data.hostel ?? null,
    },
  };
}

export async function meRequest(
  token: string,
  signal: AbortSignal,
): Promise<
  | {
      ok: true;
      user: LoginSuccessResult["user"];
      hostel: import("@/types/warden").WardenHostelSummary | null;
    }
  | { ok: false; reason: LoginFailureReason }
> {
  let response: Response;
  try {
    response = await httpRequest(buildApiUrl("/api/auth/me"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    });
  } catch (err) {
    if (err instanceof RequestAbortedError) {
      return { ok: false, reason: "ABORTED" };
    }
    if (err instanceof RequestTimeoutError) {
      return { ok: false, reason: "TIMEOUT" };
    }
    if (err instanceof TypeError) {
      return { ok: false, reason: "NETWORK" };
    }
    return { ok: false, reason: "UNEXPECTED" };
  }

  const json = await readJsonSafe(response);

  if (json && typeof json === "object" && "__malformedJson" in json) {
    return { ok: false, reason: "MALFORMED_RESPONSE" };
  }

  if (!response.ok) {
    if (response.status === 401) {
      return { ok: false, reason: "INVALID_CREDENTIALS" };
    }
    return { ok: false, reason: mapStatusToFailure(response.status) };
  }

  const parsed = meSuccessSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, reason: "MALFORMED_RESPONSE" };
  }

  return { ok: true, user: parsed.data.data.user, hostel: parsed.data.data.hostel ?? null };
}

export async function logoutRequest(signal: AbortSignal): Promise<void> {
  try {
    await httpRequest(buildApiUrl("/api/auth/logout"), {
      method: "POST",
      signal,
    });
  } catch {
    // Logout is best-effort; local session clearing happens in the store.
  }
}
