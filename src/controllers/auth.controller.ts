import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service.js";
import { TokenService } from "../services/token.service.js";
import { RedisService } from "../services/redis.service.js";
import { prisma } from "../config/database.js";
import { sendSuccess } from "../utils/response.util.js";
import {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  LogoutInput,
} from "../validators/auth.validator.js";

// Initialize services
const tokenService = new TokenService();
const redisService = new RedisService();
const authService = new AuthService(prisma, tokenService, redisService);

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as RegisterInput;
      const user = await authService.register(data);

      return sendSuccess(res, 201, user, "User registered successfully");
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as LoginInput;
      const result = await authService.login(data);

      return sendSuccess(res, 200, result, "Login successful");
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;
      const tokens = await authService.refresh(refreshToken);

      return sendSuccess(res, 200, tokens, "Tokens refreshed successfully");
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body as LogoutInput;
      await authService.logout(refreshToken);

      return sendSuccess(res, 200, null, "Logged out successfully");
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      // req.user is guaranteed to exist because of authenticate middleware
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      await authService.logoutAll(userId);

      return sendSuccess(
        res,
        200,
        null,
        "Logged out from all devices successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
