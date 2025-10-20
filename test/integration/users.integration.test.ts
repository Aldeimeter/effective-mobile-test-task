import request from "supertest";
import app from "../../src/app.js";
import { PrismaClient } from "../../generated/prisma/index.js";

const prisma = new PrismaClient();

describe("Integration: User Management Flow", () => {
  let adminToken: string;
  let adminId: string;
  let regularUserToken: string;
  let regularUserId: string;

  beforeAll(async () => {
    // Ensure database is connected
    await prisma.$connect();

    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "integration.admin@example.com",
            "integration.user@example.com",
            "integration.lifecycle@example.com",
          ],
        },
      },
    });

    // Create admin user through API
    const adminRegister = await request(app).post("/api/auth/register").send({
      fullName: "Integration Admin User",
      email: "integration.admin@example.com",
      password: "AdminPass123!",
      dateOfBirth: "1985-01-01",
    });

    adminId = adminRegister.body.data.id;

    // Update user role to admin (this is the only database operation needed)
    // since there's no API endpoint to create admin users
    await prisma.user.update({
      where: { id: adminId },
      data: { role: "admin" },
    });

    // Login as admin
    const adminLogin = await request(app).post("/api/auth/login").send({
      email: "integration.admin@example.com",
      password: "AdminPass123!",
    });

    adminToken = adminLogin.body.data.tokens.accessToken;

    // Create regular user through API
    const regularUserRegister = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Integration Regular User",
        email: "integration.user@example.com",
        password: "UserPass123!",
        dateOfBirth: "1995-05-15",
      });

    regularUserId = regularUserRegister.body.data.id;

    // Login to get token
    const regularUserLogin = await request(app).post("/api/auth/login").send({
      email: "integration.user@example.com",
      password: "UserPass123!",
    });

    regularUserToken = regularUserLogin.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "integration.admin@example.com",
            "integration.user@example.com",
            "integration.lifecycle@example.com",
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe("User profile access flow", () => {
    it("should allow user to access their own profile", async () => {
      const response = await request(app)
        .get(`/api/users/${regularUserId}`)
        .set("Authorization", `Bearer ${regularUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(regularUserId);
      expect(response.body.data.email).toBe("integration.user@example.com");
      expect(response.body.data.fullName).toBe("Integration Regular User");
    });

    it("should allow admin to access any user profile", async () => {
      const response = await request(app)
        .get(`/api/users/${regularUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(regularUserId);
      expect(response.body.data.email).toBe("integration.user@example.com");
    });

    it("should prevent regular user from accessing another user profile", async () => {
      const response = await request(app)
        .get(`/api/users/${adminId}`)
        .set("Authorization", `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(
        "You can only access your own profile",
      );
    });

    it("should prevent unauthenticated access to user profile", async () => {
      const response = await request(app).get(`/api/users/${regularUserId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should return 404 for non-existent user", async () => {
      const fakeUserId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .get(`/api/users/${fakeUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Admin getting all users flow", () => {
    it("should allow admin to get all users", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      // Should include both admin and regular user
      const emails = response.body.data.map((u: { email: string }) => u.email);
      expect(emails).toContain("integration.admin@example.com");
      expect(emails).toContain("integration.user@example.com");
    });

    it("should prevent regular user from getting all users", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(
        "Access denied. Admin role required",
      );
    });

    it("should prevent unauthenticated access to all users", async () => {
      const response = await request(app).get("/api/users");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("User blocking flow", () => {
    it("should allow user to block themselves", async () => {
      const response = await request(app)
        .patch(`/api/users/${regularUserId}/block`)
        .set("Authorization", `Bearer ${regularUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);

      // Verify user is blocked by trying to login
      const loginResponse = await request(app).post("/api/auth/login").send({
        email: "integration.user@example.com",
        password: "UserPass123!",
      });

      expect(loginResponse.status).toBe(403);
      expect(loginResponse.body.success).toBe(false);
      expect(loginResponse.body.error.message).toBe("Account is blocked");

      // Unblock for next tests
      await prisma.user.update({
        where: { id: regularUserId },
        data: { isActive: true },
      });
    });

    it("should allow admin to block any user", async () => {
      const response = await request(app)
        .patch(`/api/users/${regularUserId}/block`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);

      // Unblock for next tests
      await prisma.user.update({
        where: { id: regularUserId },
        data: { isActive: true },
      });
    });

    it("should prevent regular user from blocking another user", async () => {
      const response = await request(app)
        .patch(`/api/users/${adminId}/block`)
        .set("Authorization", `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(
        "You can only access your own profile",
      );
    });

    it("should prevent blocked user from accessing protected endpoints", async () => {
      // Block the user
      await request(app)
        .patch(`/api/users/${regularUserId}/block`)
        .set("Authorization", `Bearer ${regularUserToken}`);

      // Try to access profile (should fail because token is invalidated after blocking)
      // Login should fail for blocked users
      const loginResponse = await request(app).post("/api/auth/login").send({
        email: "integration.user@example.com",
        password: "UserPass123!",
      });

      expect(loginResponse.status).toBe(403);
      expect(loginResponse.body.error.message).toBe("Account is blocked");

      // Unblock for next tests
      await prisma.user.update({
        where: { id: regularUserId },
        data: { isActive: true },
      });
    });

    it("should return 404 when blocking non-existent user", async () => {
      const fakeUserId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .patch(`/api/users/${fakeUserId}/block`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Complete user lifecycle flow", () => {
    it("should complete full user lifecycle: register -> login -> access profile -> block -> verify blocked", async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send({
          fullName: "Integration Lifecycle User",
          email: "integration.lifecycle@example.com",
          password: "LifecyclePass123!",
          dateOfBirth: "1992-06-20",
        });

      expect(registerResponse.status).toBe(201);
      const userId = registerResponse.body.data.id;

      // Login to get token
      const lifecycleLogin = await request(app).post("/api/auth/login").send({
        email: "integration.lifecycle@example.com",
        password: "LifecyclePass123!",
      });

      const userToken = lifecycleLogin.body.data.tokens.accessToken;

      // Step 2: Access own profile
      const profileResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.isActive).toBe(true);

      // Step 3: Block user
      const blockResponse = await request(app)
        .patch(`/api/users/${userId}/block`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(blockResponse.status).toBe(200);
      expect(blockResponse.body.data.isActive).toBe(false);

      // Step 4: Verify user cannot login when blocked
      const loginResponse = await request(app).post("/api/auth/login").send({
        email: "integration.lifecycle@example.com",
        password: "LifecyclePass123!",
      });

      expect(loginResponse.status).toBe(403);
      expect(loginResponse.body.error.message).toBe("Account is blocked");

      // Cleanup
      await prisma.user.delete({
        where: { id: userId },
      });
    });
  });
});
