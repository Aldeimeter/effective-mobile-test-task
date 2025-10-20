import { jest } from "@jest/globals";
import type { User } from "../../generated/prisma/index.js";

// Create mock functions before any imports
const mockPrismaUser = {
  findUnique: jest.fn<() => Promise<User | null>>(),
  findMany: jest.fn<() => Promise<User[]>>(),
  create: jest.fn<() => Promise<User>>(),
  update: jest.fn<() => Promise<User>>(),
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

  describe("PATCH /api/users/:id/block", () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const adminId = "660e8400-e29b-41d4-a716-446655440001";

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

    const mockBlockedUser: User = {
      ...mockUser,
      isActive: false,
      updatedAt: new Date(),
    };

    it("should block user and return user with isActive set to false", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        adminId,
        "admin" as const,
      );

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockPrismaUser.update.mockResolvedValue(mockBlockedUser);
      mockRedisServiceInstance.deleteAllUserTokens.mockResolvedValue(undefined);

      const response = await request(app)
        .patch(`/api/users/${userId}/block`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User blocked successfully");
      expect(response.body.data).toMatchObject({
        id: mockBlockedUser.id,
        isActive: false,
      });
    });

    it("should return 404 when user not found", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        adminId,
        "admin" as const,
      );

      mockPrismaUser.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .patch(`/api/users/${userId}/block`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("User not found");
    });

    it("should handle idempotent blocking (already blocked user)", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        adminId,
        "admin" as const,
      );

      const alreadyBlockedUser: User = { ...mockUser, isActive: false };
      mockPrismaUser.findUnique.mockResolvedValue(alreadyBlockedUser);
      mockPrismaUser.update.mockResolvedValue(alreadyBlockedUser);
      mockRedisServiceInstance.deleteAllUserTokens.mockResolvedValue(undefined);

      const response = await request(app)
        .patch(`/api/users/${userId}/block`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });

    it("should not expose password field in response", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        adminId,
        "admin" as const,
      );

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockPrismaUser.update.mockResolvedValue(mockBlockedUser);
      mockRedisServiceInstance.deleteAllUserTokens.mockResolvedValue(undefined);

      const response = await request(app)
        .patch(`/api/users/${userId}/block`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.email).toBe(mockUser.email);
    });
  });

  describe("GET /api/users", () => {
    const adminId = "660e8400-e29b-41d4-a716-446655440001";

    const mockUsers: User[] = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        fullName: "John Doe",
        email: "john@example.com",
        password: "hashed-password",
        dateOfBirth: new Date("1990-01-15"),
        role: "user",
        isActive: true,
        createdAt: new Date("2024-01-01T10:00:00.000Z"),
        updatedAt: new Date("2024-01-01T10:00:00.000Z"),
      },
      {
        id: "770e8400-e29b-41d4-a716-446655440002",
        fullName: "Jane Smith",
        email: "jane@example.com",
        password: "hashed-password-2",
        dateOfBirth: new Date("1995-05-20"),
        role: "user",
        isActive: true,
        createdAt: new Date("2024-01-02T10:00:00.000Z"),
        updatedAt: new Date("2024-01-02T10:00:00.000Z"),
      },
      {
        id: adminId,
        fullName: "Admin User",
        email: "admin@example.com",
        password: "hashed-password-admin",
        dateOfBirth: new Date("1985-03-10"),
        role: "admin",
        isActive: true,
        createdAt: new Date("2024-01-03T10:00:00.000Z"),
        updatedAt: new Date("2024-01-03T10:00:00.000Z"),
      },
      {
        id: "880e8400-e29b-41d4-a716-446655440003",
        fullName: "Blocked User",
        email: "blocked@example.com",
        password: "hashed-password-blocked",
        dateOfBirth: new Date("1992-07-25"),
        role: "user",
        isActive: false,
        createdAt: new Date("2024-01-04T10:00:00.000Z"),
        updatedAt: new Date("2024-01-04T10:00:00.000Z"),
      },
    ];

    it("should return all users when requested by admin", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        adminId,
        "admin" as const,
      );

      mockPrismaUser.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Users retrieved successfully");
      expect(response.body.data).toHaveLength(4);
      expect(response.body.data[0].password).toBeUndefined();
      expect(response.body.data[1].password).toBeUndefined();
      expect(response.body.data[2].password).toBeUndefined();
      expect(response.body.data[3].password).toBeUndefined();
    });

    it("should return empty array when no users exist", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        adminId,
        "admin" as const,
      );

      mockPrismaUser.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it("should not expose password field in response for any user", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        adminId,
        "admin" as const,
      );

      mockPrismaUser.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      response.body.data.forEach((user: User) => {
        expect(user.password).toBeUndefined();
        expect(user.email).toBeDefined();
        expect(user.fullName).toBeDefined();
      });
    });

    it("should include both active and inactive users", async () => {
      const tokenService = new TokenService();
      const { accessToken } = tokenService.generateTokenPair(
        adminId,
        "admin" as const,
      );

      mockPrismaUser.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(4);

      const activeUsers = response.body.data.filter(
        (user: User) => user.isActive === true,
      );
      const inactiveUsers = response.body.data.filter(
        (user: User) => user.isActive === false,
      );

      expect(activeUsers).toHaveLength(3);
      expect(inactiveUsers).toHaveLength(1);
    });
  });
});
