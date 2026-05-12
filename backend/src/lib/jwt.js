import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * @typedef {{ sub: string; role: "ADMIN" | "WARDEN"; typ: "admin" | "warden" }} JwtPayload
 */

/**
 * @param {{ userId: string; role: "ADMIN" | "WARDEN"; accountType: "admin" | "warden" }} input
 */
export function signAccessToken(input) {
  /** @type {JwtPayload} */
  const payload = {
    sub: input.userId,
    role: input.role,
    typ: input.accountType,
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: "hostel-manage-api",
    audience: "hostel-manage-app",
  });
}

/**
 * @param {string} token
 * @returns {JwtPayload}
 */
export function verifyAccessToken(token) {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: "hostel-manage-api",
    audience: "hostel-manage-app",
  });
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.sub !== "string" ||
    (decoded.role !== "ADMIN" && decoded.role !== "WARDEN") ||
    (decoded.typ !== "admin" && decoded.typ !== "warden")
  ) {
    const err = new Error("Invalid token payload");
    err.name = "JsonWebTokenError";
    throw err;
  }
  return /** @type {JwtPayload} */ (decoded);
}
