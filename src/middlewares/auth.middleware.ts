import { Request, Response, NextFunction } from "express";
import { tokenService } from "../services/token.service.js";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";

/**
 * Middleware to authenticate requests using JWT tokens.
 * Extracts and verifies the access token from Authorization header.
 * Attaches user info (userId, role) to req.user.
 */
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

/**
 * Middleware to ensure the authenticated user has admin role.
 * Must be used after authenticate middleware.
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      throw new ForbiddenError("Access denied. Admin role required");
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to ensure the authenticated user can only access their own resources
 * or is an admin who can access any resource.
 *
 * Must be used after authenticate middleware.
 * The user ID should be in req.params.id
 *
 * Usage: GET /users/:id - user can view own profile, admin can view any profile
 */
export const isSelfOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new ForbiddenError("Authentication required");
    }

    const requestedUserId = req.params.id;
    const { userId, role } = req.user;

    // Admin can access any user's resource
    if (role === "admin") {
      return next();
    }

    // Regular user can only access their own resource
    if (userId === requestedUserId) {
      return next();
    }

    throw new ForbiddenError("You can only access your own profile");
  } catch (error) {
    next(error);
  }
};
