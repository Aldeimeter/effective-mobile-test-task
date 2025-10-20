import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { validateParams } from "../middlewares/validation.middleware.js";
import { authenticate, isSelfOrAdmin } from "../middlewares/auth.middleware.js";
import { getUserByIdSchema } from "../validators/user.validator.js";

const router = Router();

// Protected route - user can view own profile, admin can view any profile
router.get(
  "/:id",
  authenticate,
  validateParams(getUserByIdSchema),
  isSelfOrAdmin,
  userController.getUserById.bind(userController),
);

export default router;
