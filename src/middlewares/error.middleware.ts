import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { sendError } from "../utils/response.util.js";
import { env } from "../config/env.js";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  // Log error for debugging
  console.error("Error:", error);

  // Handle known application errors
  if (error instanceof AppError) {
    return sendError(res, error.statusCode, error.message);
  }

  // Handle unknown errors
  const message =
    env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message || "Internal server error";

  return sendError(res, 500, message);
};
