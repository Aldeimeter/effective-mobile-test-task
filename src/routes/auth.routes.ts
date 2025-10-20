import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validation.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} from "../validators/auth.validator.js";

const router = Router();

// Public routes
router.post(
  "/register",
  validate(registerSchema),
  authController.register.bind(authController),
);

router.post(
  "/login",
  validate(loginSchema),
  authController.login.bind(authController),
);

router.post(
  "/refresh",
  validate(refreshTokenSchema),
  authController.refresh.bind(authController),
);

// Protected routes
router.post(
  "/logout",
  authenticate,
  validate(logoutSchema),
  authController.logout.bind(authController),
);

router.post(
  "/logout-all",
  authenticate,
  authController.logoutAll.bind(authController),
);

export default router;
