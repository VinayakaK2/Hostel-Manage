/**
 * @type {import("express").RequestHandler}
 */
export function requireAdmin(req, res, next) {
  const auth = /** @type {import("../auth/auth.middleware.js").RequestAuth | undefined} */ (
    req.auth
  );
  if (!auth || auth.role !== "ADMIN") {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }
  next();
}
