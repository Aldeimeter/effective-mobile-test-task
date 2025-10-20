import { jest } from "@jest/globals";
import type { User } from "../../generated/prisma/index.js";

// Create mock functions before any imports
const mockPrismaUser = {
  findUnique: jest.fn<() => Promise<User | null>>(),
  create: jest.fn<() => Promise<User>>(),
};

const mockRedisServiceInstance = {
  storeRefreshToken: jest.fn<() => Promise<void>>(),
  getRefreshToken: jest.fn<() => Promise<string | null>>(),
  deleteRefreshToken: jest.fn<() => Promise<void>>(),
  deleteAllUserTokens: jest.fn<() => Promise<void>>(),
};

const mockPasswordUtil = {
  hashPassword: jest.fn<() => Promise<string>>(),
  comparePassword: jest.fn<() => Promise<boolean>>(),
};

// Mock modules with factory functions
jest.unstable_mockModule("../../src/config/database.js", () => ({
  prisma: {
    user: mockPrismaUser,
  },
}));

jest.unstable_mockModule("../../src/services/redis.service.js", () => ({
  RedisService: jest.fn().mockImplementation(() => mockRedisServiceInstance),
}));

jest.unstable_mockModule(
  "../../src/utils/password.util.js",
  () => mockPasswordUtil,
);

// Import after mocks are set up
const { default: app } = await import("../../src/app.js");
const { TokenService } = await import("../../src/services/token.service.js");
const request = (await import("supertest")).default;

describe("Auth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    const validRegisterData = {
      fullName: "John Doe",
      email: "john@example.com",
      password: "Test123!@#",
      dateOfBirth: "1990-01-15",
    };

    it("should register a new user successfully", async () => {
      const mockUser: User = {
        id: "user-123",
        fullName: "John Doe",
        email: "john@example.com",
        password: "hashed-password",
        dateOfBirth: new Date("1990-01-15"),
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPasswordUtil.hashPassword.mockResolvedValue("hashed-password");
      mockPrismaUser.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegisterData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.data).toMatchObject({
        id: mockUser.id,
        fullName: mockUser.fullName,
        email: mockUser.email,
        role: mockUser.role,
        isActive: mockUser.isActive,
      });
      expect(response.body.data.dateOfBirth).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
      expect(response.body.data.password).toBeUndefined();
    });

    it("should return 409 if email already exists", async () => {
      const existingUser: Partial<User> = {
        id: "existing-user",
        email: "john@example.com",
      };

      mockPrismaUser.findUnique.mockResolvedValue(existingUser as User);

      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegisterData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Email already exists");
    });

    it("should return 400 for invalid email", async () => {
      const invalidData = {
        ...validRegisterData,
        email: "invalid-email",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Invalid email format");
    });

    it("should return 400 for weak password", async () => {
      const invalidData = {
        ...validRegisterData,
        password: "weak",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Password must be");
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 for invalid date format", async () => {
      const invalidData = {
        ...validRegisterData,
        dateOfBirth: "invalid-date",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should accept different date formats", async () => {
      const mockUser: User = {
        id: "user-123",
        fullName: "John Doe",
        email: "john@example.com",
        password: "hashed-password",
        dateOfBirth: new Date("1990-01-15"),
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPasswordUtil.hashPassword.mockResolvedValue("hashed-password");
      mockPrismaUser.create.mockResolvedValue(mockUser);

      // Test US format
      const usFormatData = {
        ...validRegisterData,
        dateOfBirth: "01/15/1990",
      };
      const response = await request(app)
        .post("/api/auth/register")
        .send(usFormatData);

      expect(response.status).toBe(201);
    });
  });

  describe("POST /api/auth/login", () => {
    const validLoginData = {
      email: "john@example.com",
      password: "Test123!@#",
    };

    it("should login successfully with valid credentials", async () => {
      const mockUser: User = {
        id: "user-123",
        fullName: "John Doe",
        email: "john@example.com",
        password: "hashed-password",
        dateOfBirth: new Date("1990-01-15"),
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockPasswordUtil.comparePassword.mockResolvedValue(true);
      mockRedisServiceInstance.storeRefreshToken.mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/auth/login")
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("tokens");
      expect(response.body.data.tokens).toHaveProperty("accessToken");
      expect(response.body.data.tokens).toHaveProperty("refreshToken");
      expect(response.body.data.user.password).toBeUndefined();
    });

    it("should return 401 for non-existent user", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/login")
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invalid credentials");
    });

    it("should return 401 for incorrect password", async () => {
      const mockUser: Partial<User> = {
        id: "user-123",
        email: "john@example.com",
        password: "hashed-password",
        isActive: true,
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser as User);
      mockPasswordUtil.comparePassword.mockResolvedValue(false);

      const response = await request(app)
        .post("/api/auth/login")
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invalid credentials");
    });

    it("should return 403 for inactive user", async () => {
      const mockUser: Partial<User> = {
        id: "user-123",
        email: "john@example.com",
        password: "hashed-password",
        isActive: false,
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser as User);

      const response = await request(app)
        .post("/api/auth/login")
        .send(validLoginData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Account is blocked");
    });

    it("should return 400 for invalid email format", async () => {
      const invalidData = {
        email: "invalid-email",
        password: "Test123!@#",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 for missing password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh tokens successfully with valid refresh token", async () => {
      const mockUser: Partial<User> = {
        id: "user-123",
        fullName: "John Doe",
        email: "john@example.com",
        role: "user",
        isActive: true,
      };

      const tokenService = new TokenService();
      const { refreshToken } = tokenService.generateTokenPair(
        mockUser.id as string,
        mockUser.role as "user",
      );

      mockRedisServiceInstance.getRefreshToken.mockResolvedValue(
        mockUser.id as string,
      );
      mockPrismaUser.findUnique.mockResolvedValue(mockUser as User);
      mockRedisServiceInstance.deleteRefreshToken.mockResolvedValue(undefined);
      mockRedisServiceInstance.storeRefreshToken.mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Tokens refreshed successfully");
      expect(response.body.data).toHaveProperty("accessToken");
      expect(response.body.data).toHaveProperty("refreshToken");
    });

    it("should return 401 for invalid refresh token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid-token" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 for revoked refresh token", async () => {
      const tokenService = new TokenService();
      const { refreshToken } = tokenService.generateTokenPair(
        "user-123",
        "user",
      );

      mockRedisServiceInstance.getRefreshToken.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invalid or revoked token");
    });

    it("should return 404 if user not found", async () => {
      const tokenService = new TokenService();
      const { refreshToken } = tokenService.generateTokenPair(
        "user-123",
        "user",
      );

      mockRedisServiceInstance.getRefreshToken.mockResolvedValue("user-123");
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("User not found");
    });

    it("should return 403 if user is blocked", async () => {
      const mockUser: Partial<User> = {
        id: "user-123",
        isActive: false,
      };

      const tokenService = new TokenService();
      const { refreshToken } = tokenService.generateTokenPair(
        "user-123",
        "user" as const,
      );

      mockRedisServiceInstance.getRefreshToken.mockResolvedValue("user-123");
      mockPrismaUser.findUnique.mockResolvedValue(mockUser as User);

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Account is blocked");
    });

    it("should return 401 for access token instead of refresh token", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        "user-123",
        "user",
      );

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: accessToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invalid token type");
    });

    it("should return 400 for missing refresh token", async () => {
      const response = await request(app).post("/api/auth/refresh").send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully with valid refresh token", async () => {
      const tokenService = new TokenService();
      const { accessToken, refreshToken } = tokenService.generateTokenPair(
        "user-123",
        "user",
      );

      mockRedisServiceInstance.deleteRefreshToken.mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logged out successfully");
    });

    it("should return 401 without authentication token", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .send({ refreshToken: "some-token" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("No token provided");
    });

    it("should return 401 with invalid authorization format", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", "InvalidFormat")
        .send({ refreshToken: "some-token" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invalid authorization format");
    });

    it("should return 401 with invalid access token", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", "Bearer invalid-token")
        .send({ refreshToken: "some-token" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 with refresh token in authorization header", async () => {
      const tokenService = new TokenService();
      const { refreshToken } = tokenService.generateTokenPair(
        "user-123",
        "user",
      );

      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${refreshToken}`)
        .send({ refreshToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invalid token type");
    });

    it("should return 400 for missing refresh token in body", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        "user-123",
        "user",
      );

      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should be idempotent - logout with already logged out token", async () => {
      const tokenService = new TokenService();
      const { accessToken, refreshToken } = tokenService.generateTokenPair(
        "user-123",
        "user",
      );

      mockRedisServiceInstance.deleteRefreshToken.mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/auth/logout-all", () => {
    it("should logout from all devices successfully", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        "user-123",
        "user",
      );

      mockRedisServiceInstance.deleteAllUserTokens.mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/auth/logout-all")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Logged out from all devices successfully",
      );
      expect(mockRedisServiceInstance.deleteAllUserTokens).toHaveBeenCalledWith(
        "user-123",
      );
    });

    it("should return 401 without authentication token", async () => {
      const response = await request(app).post("/api/auth/logout-all");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("No token provided");
    });

    it("should return 401 with invalid access token", async () => {
      const response = await request(app)
        .post("/api/auth/logout-all")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 with refresh token instead of access token", async () => {
      const tokenService = new TokenService();
      const { refreshToken } = tokenService.generateTokenPair(
        "user-123",
        "user",
      );

      const response = await request(app)
        .post("/api/auth/logout-all")
        .set("Authorization", `Bearer ${refreshToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invalid token type");
    });

    it("should return 401 with malformed authorization header", async () => {
      const response = await request(app)
        .post("/api/auth/logout-all")
        .set("Authorization", "NotBearer token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invalid authorization format");
    });
  });
});
