import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service.js";
import { RedisService } from "../services/redis.service.js";
import { prisma } from "../config/database.js";
import { sendSuccess } from "../utils/response.util.js";

// Initialize services
const redisService = new RedisService();
const userService = new UserService(prisma, redisService);

export class UserController {
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      return sendSuccess(res, 200, user, "User retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async blockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const blockedUser = await userService.blockUser(id);

      return sendSuccess(res, 200, blockedUser, "User blocked successfully");
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAllUsers();

      return sendSuccess(res, 200, users, "Users retrieved successfully");
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
