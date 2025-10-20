import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service.js";
import { prisma } from "../config/database.js";
import { sendSuccess } from "../utils/response.util.js";

// Initialize service
const userService = new UserService(prisma);

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
}

export const userController = new UserController();
