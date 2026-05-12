import bcrypt from "bcrypt";
import { HttpError } from "../lib/httpError.js";
import { signAccessToken } from "../lib/jwt.js";
import * as authRepository from "./auth.repository.js";

/**
 * @typedef {{ id: string; name: string; email: string; role: "ADMIN" | "WARDEN" }} SanitizedUser
 * @typedef {{ id: string; name: string; type: import("@prisma/client").HostelType }} WardenHostelSummary
 */

/**
 * @param {{ email: string; password: string }} input
 * @returns {Promise<{ token: string; user: SanitizedUser; hostel: WardenHostelSummary | null }>}
 */
export async function login(input) {
  const account = await authRepository.findAccountByEmail(input.email);
  if (!account) {
    throw new HttpError(401, "Invalid credentials");
  }

  const { record, kind } = account;

  if (record.status !== "ACTIVE") {
    throw new HttpError(403, "Account is not active");
  }

  const expectedRole = kind === "admin" ? "ADMIN" : "WARDEN";
  if (record.role !== expectedRole) {
    throw new HttpError(403, "Invalid role for this account");
  }

  const match = await bcrypt.compare(input.password, record.password_hash);
  if (!match) {
    throw new HttpError(401, "Invalid credentials");
  }

  const token = signAccessToken({
    userId: record.id,
    role: expectedRole,
    accountType: kind,
  });

  let hostel = null;
  if (kind === "warden" && record.assigned_hostel_id) {
    const h = await authRepository.findHostelSummaryById(record.assigned_hostel_id);
    if (h && h.status === "ACTIVE") {
      hostel = { id: h.id, name: h.name, type: h.type };
    }
  }

  return {
    token,
    user: {
      id: record.id,
      name: record.name,
      email: record.email,
      role: expectedRole,
    },
    hostel,
  };
}

/**
 * @param {{ userId: string; accountType: "admin" | "warden" }} ctx
 * @returns {Promise<{ user: SanitizedUser; hostel: WardenHostelSummary | null }>}
 */
export async function getMe(ctx) {
  if (ctx.accountType === "warden") {
    const warden = await authRepository.findWardenWithHostel(ctx.userId);
    if (!warden) {
      throw new HttpError(401, "Session expired");
    }
    if (warden.status !== "ACTIVE") {
      throw new HttpError(403, "Account is not active");
    }
    if (warden.role !== "WARDEN") {
      throw new HttpError(403, "Invalid role for this account");
    }
    let hostel = null;
    if (warden.assigned_hostel && warden.assigned_hostel.status === "ACTIVE") {
      hostel = {
        id: warden.assigned_hostel.id,
        name: warden.assigned_hostel.name,
        type: warden.assigned_hostel.type,
      };
    }
    return {
      user: {
        id: warden.id,
        name: warden.name,
        email: warden.email,
        role: "WARDEN",
      },
      hostel,
    };
  }

  const record = await authRepository.findAccountById(ctx.userId, "admin");
  if (!record) {
    throw new HttpError(401, "Session expired");
  }
  if (record.status !== "ACTIVE") {
    throw new HttpError(403, "Account is not active");
  }
  if (record.role !== "ADMIN") {
    throw new HttpError(403, "Invalid role for this account");
  }
  return {
    user: {
      id: record.id,
      name: record.name,
      email: record.email,
      role: "ADMIN",
    },
    hostel: null,
  };
}
