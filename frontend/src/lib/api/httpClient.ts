const DEFAULT_TIMEOUT_MS = 15_000;

export class RequestAbortedError extends Error {
  constructor() {
    super("Request aborted");
    this.name = "RequestAbortedError";
  }
}

export class RequestTimeoutError extends Error {
  constructor() {
    super("Request timed out");
    this.name = "RequestTimeoutError";
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export interface HttpRequestOptions extends Omit<RequestInit, "body"> {
  timeoutMs?: number;
  body?: unknown;
  signal?: AbortSignal;
}

function mergeSignals(signals: AbortSignal[]): AbortSignal | undefined {
  if (signals.length === 0) return undefined;
  if (signals.length === 1) return signals[0];
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      return controller.signal;
    }
    s.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

export async function httpRequest(
  url: string,
  options: HttpRequestOptions = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, body, headers, signal, ...rest } =
    options;

  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), timeoutMs);

  const mergedSignal = mergeSignals(
    [signal, timeoutController.signal].filter(Boolean) as AbortSignal[],
  );

  const initHeaders = new Headers(headers);
  if (body !== undefined && !initHeaders.has("Content-Type")) {
    initHeaders.set("Content-Type", "application/json");
  }

  try {
    return await fetch(url, {
      ...rest,
      signal: mergedSignal,
      headers: initHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (isAbortError(err) || mergedSignal?.aborted) {
      if (signal?.aborted) throw new RequestAbortedError();
      throw new RequestTimeoutError();
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { __malformedJson: true as const, raw: text };
  }
}
