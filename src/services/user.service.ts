import { PrismaClient, User } from "../../generated/prisma/index.js";
import { NotFoundError } from "../utils/errors.js";
import { UserResponse } from "../types/index.js";
import { RedisService } from "./redis.service.js";

export class UserService {
  constructor(
    private prisma: PrismaClient,
    private redisService: RedisService,
  ) {}

  private excludePassword(user: User): UserResponse {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserById(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return this.excludePassword(user);
  }

  async blockUser(userId: string): Promise<UserResponse> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Update user to blocked status
    const blockedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Delete all user's tokens to force logout
    await this.redisService.deleteAllUserTokens(userId);

    return this.excludePassword(blockedUser);
  }

  async getAllUsers(): Promise<UserResponse[]> {
    const users = await this.prisma.user.findMany();
    return users.map((user) => this.excludePassword(user));
  }
}
