import request from "supertest";
import app from "../../src/app.js";
import { PrismaClient } from "../../generated/prisma/index.js";

const prisma = new PrismaClient();

describe("Integration: Authentication Flow", () => {
  beforeAll(async () => {
    // Ensure database is connected
    await prisma.$connect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    // Only delete users specific to auth tests, not users.integration.test.ts users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["integration.test@example.com"],
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up after all tests
    // Only delete users specific to auth tests
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["integration.test@example.com"],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe("Complete user registration and login flow", () => {
    it("should register a new user, login, and access protected resources", async () => {
      // Step 1: Register a new user
      const registerData = {
        fullName: "Integration Test User",
        email: "integration.test@example.com",
        password: "SecurePass123!",
        dateOfBirth: "1990-01-15",
      };

      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send(registerData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data).toHaveProperty("id");
      expect(registerResponse.body.data).toHaveProperty("email");
      expect(registerResponse.body.data.email).toBe(
        registerData.email.toLowerCase(),
      );

      const userId = registerResponse.body.data.id;

      // Step 2: Login with the registered user
      const loginData = {
        email: registerData.email,
        password: registerData.password,
      };

      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send(loginData);

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty("tokens");
      expect(loginResponse.body.data.tokens).toHaveProperty("accessToken");
      expect(loginResponse.body.data.tokens).toHaveProperty("refreshToken");

      const accessToken = loginResponse.body.data.tokens.accessToken;

      // Step 3: Access protected resource with access token
      const profileResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe(
        registerData.email.toLowerCase(),
      );
      expect(profileResponse.body.data.fullName).toBe(registerData.fullName);
    });

    it("should prevent login with incorrect password", async () => {
      // Step 1: Register user
      const registerData = {
        fullName: "Integration Test User",
        email: "integration.test@example.com",
        password: "SecurePass123!",
        dateOfBirth: "1990-01-15",
      };

      await request(app).post("/api/auth/register").send(registerData);

      // Step 2: Try to login with wrong password
      const loginResponse = await request(app).post("/api/auth/login").send({
        email: registerData.email,
        password: "WrongPassword123!",
      });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body.success).toBe(false);
      expect(loginResponse.body.error.message).toBe("Invalid credentials");
    });

    it("should prevent duplicate email registration", async () => {
      // Step 1: Register first user
      const userData = {
        fullName: "Integration Test User",
        email: "integration.test@example.com",
        password: "SecurePass123!",
        dateOfBirth: "1990-01-15",
      };

      const firstRegister = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(firstRegister.status).toBe(201);

      // Step 2: Try to register with same email
      const secondRegister = await request(app)
        .post("/api/auth/register")
        .send({
          ...userData,
          fullName: "Different Name",
        });

      expect(secondRegister.status).toBe(409);
      expect(secondRegister.body.success).toBe(false);
      expect(secondRegister.body.error.message).toBe("Email already exists");
    });
  });

  describe("Token refresh flow", () => {
    it("should refresh access token using refresh token", async () => {
      // Step 1: Register and login
      const userData = {
        fullName: "Integration Test User",
        email: "integration.test@example.com",
        password: "SecurePass123!",
        dateOfBirth: "1990-01-15",
      };

      await request(app).post("/api/auth/register").send(userData);

      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({ email: userData.email, password: userData.password });

      const refreshToken = loginResponse.body.data.tokens.refreshToken;

      // Step 2: Refresh the token
      const refreshResponse = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data).toHaveProperty("accessToken");
      expect(refreshResponse.body.data).toHaveProperty("refreshToken");

      // New tokens should be returned (they might have the same payload if generated quickly, but different refresh tokens)
      expect(refreshResponse.body.data.refreshToken).not.toBe(refreshToken);

      // Step 3: Use new access token to access protected resource
      const userId = loginResponse.body.data.user.id;
      const profileResponse = await request(app)
        .get(`/api/users/${userId}`)
        .set(
          "Authorization",
          `Bearer ${refreshResponse.body.data.accessToken}`,
        );

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);
    });

    it("should reject invalid refresh token", async () => {
      const refreshResponse = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid-token" });

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.success).toBe(false);
    });
  });

  describe("Logout flow", () => {
    it("should logout from current device and invalidate refresh token", async () => {
      // Step 1: Register and login
      const userData = {
        fullName: "Integration Test User",
        email: "integration.test@example.com",
        password: "SecurePass123!",
        dateOfBirth: "1990-01-15",
      };

      await request(app).post("/api/auth/register").send(userData);

      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({ email: userData.email, password: userData.password });

      const accessToken = loginResponse.body.data.tokens.accessToken;
      const refreshToken = loginResponse.body.data.tokens.refreshToken;

      // Step 2: Logout
      const logoutResponse = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);

      // Step 3: Try to use the old refresh token (should fail)
      const refreshResponse = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.success).toBe(false);
    });

    it("should logout from all devices", async () => {
      // Step 1: Register
      const userData = {
        fullName: "Integration Test User",
        email: "integration.test@example.com",
        password: "SecurePass123!",
        dateOfBirth: "1990-01-15",
      };

      await request(app).post("/api/auth/register").send(userData);

      // Step 2: Login from device 1
      const login1 = await request(app)
        .post("/api/auth/login")
        .send({ email: userData.email, password: userData.password });

      const token1 = login1.body.data.tokens.refreshToken;
      const accessToken1 = login1.body.data.tokens.accessToken;

      // Step 3: Login from device 2
      const login2 = await request(app)
        .post("/api/auth/login")
        .send({ email: userData.email, password: userData.password });

      const token2 = login2.body.data.tokens.refreshToken;

      // Step 4: Logout from all devices using device 1
      const logoutAllResponse = await request(app)
        .post("/api/auth/logout-all")
        .set("Authorization", `Bearer ${accessToken1}`);

      expect(logoutAllResponse.status).toBe(200);
      expect(logoutAllResponse.body.success).toBe(true);

      // Step 5: Try to refresh with both tokens (should fail)
      const refresh1 = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: token1 });

      const refresh2 = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: token2 });

      expect(refresh1.status).toBe(401);
      expect(refresh2.status).toBe(401);
    });
  });
});
