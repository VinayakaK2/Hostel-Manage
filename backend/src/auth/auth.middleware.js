import { verifyAccessToken } from "../lib/jwt.js";
import { loginBodySchema } from "./auth.validation.js";

/**
 * @typedef {{ userId: string; role: "ADMIN" | "WARDEN"; accountType: "admin" | "warden" }} RequestAuth
 */

/**
 * Validates JSON body for login; attaches parsed value to req.body.
 * @type {import("express").RequestHandler}
 */
export function validateLoginBody(req, res, next) {
  if (
    !req.body ||
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid request body",
    });
    return;
  }
  const parsed = loginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    res.status(400).json({
      success: false,
      message: first?.message ?? "Invalid request",
    });
    return;
  }
  req.body = parsed.data;
  next();
}

/**
 * @type {import("express").RequestHandler}
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    /** @type {RequestAuth} */
    const auth = {
      userId: payload.sub,
      role: payload.role,
      accountType: payload.typ,
    };
    req.auth = auth;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Session expired" });
  }
}
