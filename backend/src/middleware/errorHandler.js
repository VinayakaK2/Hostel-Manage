import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../lib/httpError.js";

/**
 * @typedef {{ success: false; message: string }} ErrorBody
 */

/**
 * Maps internal errors to safe client-facing messages and HTTP status.
 * @param {unknown} err
 * @returns {{ status: number; body: ErrorBody }}
 */
export function mapErrorToResponse(err) {
  if (err instanceof HttpError) {
    return {
      status: err.statusCode,
      body: { success: false, message: err.message },
    };
  }

  if (err instanceof ZodError) {
    const first = err.errors[0];
    const message = first?.message ?? "Invalid request";
    return { status: 400, body: { success: false, message } };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      status: 400,
      body: { success: false, message: "Request could not be processed" },
    };
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return {
      status: 400,
      body: { success: false, message: "Invalid request" },
    };
  }

  if (err && typeof err === "object" && "statusCode" in err) {
    const statusCode = /** @type {{ statusCode: number; message?: string }} */ (err)
      .statusCode;
    const message =
      typeof /** @type {{ message?: string }} */ (err).message === "string"
        ? /** @type {{ message: string }} */ (err).message
        : "Request failed";
    if (statusCode === 401) {
      return { status: 401, body: { success: false, message } };
    }
    if (statusCode === 403) {
      return { status: 403, body: { success: false, message } };
    }
    if (statusCode === 404) {
      return { status: 404, body: { success: false, message } };
    }
  }

  if (err instanceof Error) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return {
        status: 401,
        body: { success: false, message: "Session expired" },
      };
    }
  }

  return {
    status: 500,
    body: { success: false, message: "Something went wrong" },
  };
}

/**
 * Express error-handling middleware (must be last).
 * @type {import("express").ErrorRequestHandler}
 */
export function errorHandler(err, _req, res, _next) {
  const { status, body } = mapErrorToResponse(err);
  res.status(status).json(body);
}
