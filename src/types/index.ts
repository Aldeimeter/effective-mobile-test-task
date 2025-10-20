import { Role } from "../../generated/prisma/index.js";

export interface TokenPayload {
  userId: string;
  role: Role;
  type: "access" | "refresh";
  tokenId?: string; // Only for refresh tokens
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  dateOfBirth: Date;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
