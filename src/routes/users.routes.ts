import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { validateParams } from "../middlewares/validation.middleware.js";
import { authenticate, isSelfOrAdmin } from "../middlewares/auth.middleware.js";
import {
  getUserByIdSchema,
  blockUserSchema,
} from "../validators/user.validator.js";

const router = Router();

// Protected route - user can view own profile, admin can view any profile
router.get(
  "/:id",
  authenticate,
  validateParams(getUserByIdSchema),
  isSelfOrAdmin,
  userController.getUserById.bind(userController),
);

// Protected route - admin can block any user, user can block themselves
router.patch(
  "/:id/block",
  authenticate,
  validateParams(blockUserSchema),
  isSelfOrAdmin,
  userController.blockUser.bind(userController),
);

export default router;
