export type UserRole = "ADMIN" | "WARDEN";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type LoginFailureReason =
  | "INVALID_CREDENTIALS"
  | "NETWORK"
  | "TIMEOUT"
  | "SERVER"
  | "MALFORMED_RESPONSE"
  | "EMPTY_PAYLOAD"
  | "UNEXPECTED"
  | "ABORTED";
