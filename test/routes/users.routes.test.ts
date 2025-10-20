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

describe("User Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/users/:id", () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const adminId = "660e8400-e29b-41d4-a716-446655440001";
    const otherUserId = "770e8400-e29b-41d4-a716-446655440002";
    const nonExistentId = "880e8400-e29b-41d4-a716-446655440003";

    const mockUser: User = {
      id: userId,
      fullName: "John Doe",
      email: "john@example.com",
      password: "hashed-password",
      dateOfBirth: new Date("1990-01-15"),
      role: "user",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should return user by id when requesting own profile", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        userId,
        "user" as const,
      );

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User retrieved successfully");
      expect(response.body.data).toMatchObject({
        id: mockUser.id,
        fullName: mockUser.fullName,
        email: mockUser.email,
        role: mockUser.role,
        isActive: mockUser.isActive,
      });
      expect(response.body.data.password).toBeUndefined();
    });

    it("should allow admin to access any user profile", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        adminId,
        "admin" as const,
      );

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockUser.id);
      expect(response.body.data.password).toBeUndefined();
    });

    it("should return 403 when user tries to access another user's profile", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        otherUserId,
        "user" as const,
      );

      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(
        "You can only access your own profile",
      );
    });

    it("should return 404 when user not found", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        nonExistentId,
        "user" as const,
      );

      mockPrismaUser.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/users/${nonExistentId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("User not found");
    });

    it("should return 400 when invalid UUID format", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        userId,
        "user" as const,
      );

      const response = await request(app)
        .get("/api/users/invalid-uuid")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Invalid user ID format");
    });

    it("should not expose password field in response", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        adminId,
        "admin" as const,
      );

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.email).toBe(mockUser.email);
    });
  });
});
