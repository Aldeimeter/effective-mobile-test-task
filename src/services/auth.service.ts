import { PrismaClient, User } from "../../generated/prisma/index.js";
import { TokenService } from "./token.service.js";
import { RedisService } from "./redis.service.js";
import { hashPassword, comparePassword } from "../utils/password.util.js";
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors.js";
import { RegisterInput, LoginInput } from "../validators/auth.validator.js";
import { UserResponse, TokenPair } from "../types/index.js";

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private tokenService: TokenService,
    private redisService: RedisService,
  ) {}

  private excludePassword(user: User): UserResponse {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async register(data: RegisterInput): Promise<UserResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError("Email already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: hashedPassword,
        dateOfBirth: data.dateOfBirth,
        role: "user",
        isActive: true,
      },
    });

    return this.excludePassword(user);
  }

  async login(
    data: LoginInput,
  ): Promise<{ user: UserResponse; tokens: TokenPair }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ForbiddenError("Account is blocked");
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Generate tokens
    const { accessToken, refreshToken, tokenId } =
      this.tokenService.generateTokenPair(user.id, user.role);

    // Store refresh token in Redis
    await this.redisService.storeRefreshToken(tokenId, user.id);

    return {
      user: this.excludePassword(user),
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    // Verify token
    const decoded = this.tokenService.verifyToken(refreshToken);

    // Validate token type
    if (decoded.type !== "refresh") {
      throw new UnauthorizedError("Invalid token type");
    }

    if (!decoded.tokenId) {
      throw new UnauthorizedError("Invalid token");
    }

    // Check if token exists in Redis
    const userId = await this.redisService.getRefreshToken(decoded.tokenId);

    if (!userId) {
      throw new UnauthorizedError("Invalid or revoked token");
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // Clean up orphaned token
      await this.redisService.deleteRefreshToken(decoded.tokenId);
      throw new NotFoundError("User not found");
    }

    // Check if user is still active
    if (!user.isActive) {
      // Remove all tokens for blocked user
      await this.redisService.deleteRefreshToken(decoded.tokenId);
      throw new ForbiddenError("Account is blocked");
    }

    // Delete old refresh token
    await this.redisService.deleteRefreshToken(decoded.tokenId);

    // Generate new token pair
    const {
      accessToken,
      refreshToken: newRefreshToken,
      tokenId: newTokenId,
    } = this.tokenService.generateTokenPair(user.id, user.role);

    // Store new refresh token
    await this.redisService.storeRefreshToken(newTokenId, user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    // Decode token (don't need to verify expiration for logout)
    const decoded = this.tokenService.decodeToken(refreshToken);

    if (!decoded || !decoded.tokenId) {
      // If token is invalid, just return success (idempotent)
      return;
    }

    // Delete refresh token from Redis
    await this.redisService.deleteRefreshToken(decoded.tokenId);
  }

  async logoutAll(userId: string): Promise<void> {
    // Delete all refresh tokens for user
    await this.redisService.deleteAllUserTokens(userId);
  }
}
