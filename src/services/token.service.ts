import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env.js";
import { TokenPayload, TokenPair } from "../types/index.js";
import { Role } from "../../generated/prisma/index.js";
import { UnauthorizedError } from "../utils/errors.js";

export class TokenService {
  private readonly secret: string;
  private readonly accessExpiration: string;
  private readonly refreshExpiration: string;

  constructor(
    secret?: string,
    accessExpiration?: string,
    refreshExpiration?: string,
  ) {
    this.secret = secret || env.JWT_SECRET;
    this.accessExpiration = accessExpiration || env.JWT_ACCESS_EXPIRATION;
    this.refreshExpiration = refreshExpiration || env.JWT_REFRESH_EXPIRATION;
  }

  generateAccessToken(userId: string, role: Role): string {
    const payload: TokenPayload = {
      userId,
      role,
      type: "access",
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: this.accessExpiration,
    } as jwt.SignOptions);
  }

  generateRefreshToken(
    userId: string,
    role: Role,
  ): {
    token: string;
    tokenId: string;
  } {
    const tokenId = randomUUID();
    const payload: TokenPayload = {
      userId,
      role,
      type: "refresh",
      tokenId,
    };

    const token = jwt.sign(payload, this.secret, {
      expiresIn: this.refreshExpiration,
    } as jwt.SignOptions);

    return { token, tokenId };
  }

  generateTokenPair(
    userId: string,
    role: Role,
  ): TokenPair & {
    tokenId: string;
  } {
    const accessToken = this.generateAccessToken(userId, role);
    const { token: refreshToken, tokenId } = this.generateRefreshToken(
      userId,
      role,
    );

    return {
      accessToken,
      refreshToken,
      tokenId,
    };
  }

  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token expired");
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError("Invalid token");
      }
      throw new UnauthorizedError("Token verification failed");
    }
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }
}

export const tokenService = new TokenService();
