/**
 * Development-only quick-fill credentials.
 * Do not enable in production builds.
 */
export const DEV_ADMIN_CREDENTIALS = {
  email: "admin@hostel.com",
  password: "Admin@123",
} as const;

export const DEV_WARDEN_CREDENTIALS = {
  email: "warden@hostel.com",
  password: "Warden@123",
} as const;

export function isDevQuickFillEnabled(): boolean {
  return import.meta.env.DEV === true;
}
