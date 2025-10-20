import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { ServiceUnavailableError } from "../utils/errors.js";

export class RedisService {
  private client: Redis;
  private readonly refreshTokenTTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(redisClient?: Redis) {
    if (redisClient) {
      this.client = redisClient;
    } else {
      this.client = new Redis(env.REDIS_URL);
    }
  }

  async storeRefreshToken(tokenId: string, userId: string): Promise<void> {
    try {
      const key = `refresh_token:${tokenId}`;
      await this.client.setex(key, this.refreshTokenTTL, userId);

      // Also maintain a set of tokens per user for logout-all functionality
      const userTokensKey = `user_tokens:${userId}`;
      await this.client.sadd(userTokensKey, tokenId);
      await this.client.expire(userTokensKey, this.refreshTokenTTL);
    } catch {
      throw new ServiceUnavailableError("Failed to store refresh token");
    }
  }

  async getRefreshToken(tokenId: string): Promise<string | null> {
    try {
      const key = `refresh_token:${tokenId}`;
      return await this.client.get(key);
    } catch {
      throw new ServiceUnavailableError("Failed to retrieve refresh token");
    }
  }

  async deleteRefreshToken(tokenId: string): Promise<void> {
    try {
      const key = `refresh_token:${tokenId}`;

      // Get userId before deleting to also remove from user's token set
      const userId = await this.client.get(key);

      await this.client.del(key);

      if (userId) {
        const userTokensKey = `user_tokens:${userId}`;
        await this.client.srem(userTokensKey, tokenId);
      }
    } catch {
      throw new ServiceUnavailableError("Failed to delete refresh token");
    }
  }

  async deleteAllUserTokens(userId: string): Promise<void> {
    try {
      const userTokensKey = `user_tokens:${userId}`;

      // Get all token IDs for this user
      const tokenIds = await this.client.smembers(userTokensKey);

      if (tokenIds.length > 0) {
        // Delete all refresh tokens
        const keys = tokenIds.map((tokenId) => `refresh_token:${tokenId}`);
        await this.client.del(...keys);

        // Delete the user tokens set
        await this.client.del(userTokensKey);
      }
    } catch {
      throw new ServiceUnavailableError("Failed to delete user tokens");
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export const redisService = new RedisService();
