import { Request, Response, NextFunction } from "express";
import { tokenService } from "../services/token.service.js";
import { UnauthorizedError } from "../utils/errors.js";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError("No token provided");
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new UnauthorizedError("Invalid authorization format");
    }

    const token = parts[1];
    const decoded = tokenService.verifyToken(token);

    // Verify token type is access token
    if (decoded.type !== "access") {
      throw new UnauthorizedError("Invalid token type");
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
