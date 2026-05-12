import { prisma } from "../lib/prisma.js";

/**
 * @typedef {{
 *   wardenId: string;
 *   hostelId: string;
 *   hostel: { id: string; name: string; type: "BOYS" | "GIRLS"; capacity: number; status: import("@prisma/client").HostelStatus };
 * }} WardenRequestContext
 */

/**
 * @param {import("express").Request} req
 * @returns {req is import("express").Request & { warden: WardenRequestContext }}
 */
export function assertWardenContext(req) {
  if (!req.warden) {
    throw new Error("Warden context missing");
  }
  return true;
}

/**
 * Requires authenticated WARDEN with active hostel assignment.
 * @type {import("express").RequestHandler}
 */
export async function requireWardenHostel(req, res, next) {
  const auth = req.auth;
  if (!auth || auth.role !== "WARDEN" || auth.accountType !== "warden") {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }

  const warden = await prisma.warden.findUnique({
    where: { id: auth.userId },
    select: { id: true, assigned_hostel_id: true, status: true },
  });

  if (!warden || warden.status !== "ACTIVE" || !warden.assigned_hostel_id) {
    res.status(403).json({ success: false, message: "No active hostel assignment" });
    return;
  }

  const hostel = await prisma.hostel.findUnique({
    where: { id: warden.assigned_hostel_id },
    select: { id: true, name: true, type: true, capacity: true, status: true },
  });

  if (!hostel || hostel.status !== "ACTIVE") {
    res.status(403).json({ success: false, message: "Hostel unavailable" });
    return;
  }

  /** @type {WardenRequestContext} */
  const ctx = {
    wardenId: warden.id,
    hostelId: hostel.id,
    hostel,
  };
  req.warden = ctx;
  next();
}
