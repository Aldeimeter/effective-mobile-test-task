import express from "express";
import helmet from "helmet";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  return res.json({ status: "ok", message: "Server is running" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);

// 404 handler
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: {
      message: "Route not found",
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
