import * as authService from "./auth.service.js";

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token: result.token,
        user: result.user,
        hostel: result.hostel ?? null,
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export function logout(_req, res) {
  res.status(200).json({
    success: true,
    message: "Logout successful",
    data: null,
  });
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export async function me(req, res, next) {
  try {
    const auth = req.auth;
    if (!auth) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const payload = await authService.getMe({
      userId: auth.userId,
      accountType: auth.accountType,
    });
    res.status(200).json({
      success: true,
      message: "OK",
      data: { user: payload.user, hostel: payload.hostel },
    });
  } catch (e) {
    next(e);
  }
}
