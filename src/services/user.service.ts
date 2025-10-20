import { PrismaClient, User } from "../../generated/prisma/index.js";
import { NotFoundError } from "../utils/errors.js";
import { UserResponse } from "../types/index.js";

export class UserService {
  constructor(private prisma: PrismaClient) {}

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
}
