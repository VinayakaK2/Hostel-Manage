import type { UserRole } from "@/types/auth";

interface JwtPayloadShape {
  sub?: string;
  role?: UserRole;
  exp?: number;
}

function base64UrlToJson(segment: string): unknown {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLen);
  const json = atob(base64);
  return JSON.parse(json) as unknown;
}

export function decodeJwtPayload(token: string): JwtPayloadShape | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return null;
    const payload = base64UrlToJson(parts[1]);
    if (!payload || typeof payload !== "object") return null;
    return payload as JwtPayloadShape;
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (typeof payload?.exp !== "number") return null;
  return payload.exp * 1000;
}

export function isJwtExpired(token: string, skewMs = 30_000): boolean {
  const expMs = getTokenExpiryMs(token);
  if (!expMs) return true;
  return Date.now() >= expMs - skewMs;
}

export function getRoleFromToken(token: string): UserRole | null {
  const payload = decodeJwtPayload(token);
  if (payload?.role === "ADMIN" || payload?.role === "WARDEN") {
    return payload.role;
  }
  return null;
}
