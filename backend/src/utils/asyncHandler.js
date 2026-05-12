/**
 * Wraps async route handlers so errors reach Express error middleware.
 * @template {import("express").Request} Req
 * @template {import("express").Response} Res
 * @param {(req: Req, res: Res, next: import("express").NextFunction) => Promise<unknown>} fn
 */
export function asyncHandler(fn) {
  return /** @type {import("express").RequestHandler} */ (
    req,
    res,
    next,
  ) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
