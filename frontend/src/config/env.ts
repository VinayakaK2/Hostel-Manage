const rawBase = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

export const apiBaseUrl = rawBase.replace(/\/+$/, "");

export function buildApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!apiBaseUrl) return p;
  return `${apiBaseUrl}${p}`;
}
