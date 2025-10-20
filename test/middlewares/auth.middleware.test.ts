import { jest } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import {
  authenticate,
  isAdmin,
  isSelfOrAdmin,
} from "../../src/middlewares/auth.middleware.js";
import { TokenService } from "../../src/services/token.service.js";
import { UnauthorizedError, ForbiddenError } from "../../src/utils/errors.js";

type MockNextFunction = ReturnType<typeof jest.fn>;

describe("Auth Middleware", () => {
  describe("authenticate", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: MockNextFunction;
    const tokenService = new TokenService();

    beforeEach(() => {
      mockRequest = {
        headers: {},
      };
      mockResponse = {};
      mockNext = jest.fn();
    });

    describe("TC-AUTH-001: Valid access token in Authorization header", () => {
      it("should authenticate successfully and attach user to request", () => {
        const { accessToken } = tokenService.generateTokenPair(
          "user-123",
          "user",
        );

        mockRequest.headers = {
          authorization: `Bearer ${accessToken}`,
        };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRequest.user).toBeDefined();
        expect(mockRequest.user?.userId).toBe("user-123");
        expect(mockRequest.user?.role).toBe("user");
      });

      it("should work with admin token", () => {
        const { accessToken } = tokenService.generateTokenPair(
          "admin-456",
          "admin",
        );

        mockRequest.headers = {
          authorization: `Bearer ${accessToken}`,
        };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRequest.user).toBeDefined();
        expect(mockRequest.user?.userId).toBe("admin-456");
        expect(mockRequest.user?.role).toBe("admin");
      });
    });

    describe("TC-AUTH-002: No Authorization header", () => {
      it("should return 401 error when no authorization header", () => {
        mockRequest.headers = {};

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const error = mockNext.mock.calls[0][0] as UnauthorizedError;
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error.message).toBe("No token provided");
        expect(mockRequest.user).toBeUndefined();
      });
    });

    describe("TC-AUTH-003: Malformed Authorization header", () => {
      it("should return error for header without Bearer prefix", () => {
        mockRequest.headers = {
          authorization: "InvalidFormat token123",
        };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const error = mockNext.mock.calls[0][0] as UnauthorizedError;
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error.message).toBe("Invalid authorization format");
        expect(mockRequest.user).toBeUndefined();
      });

      it("should return error for Bearer without token", () => {
        mockRequest.headers = {
          authorization: "Bearer",
        };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const error = mockNext.mock.calls[0][0] as UnauthorizedError;
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error.message).toBe("Invalid authorization format");
      });

      it("should return error for just token without Bearer", () => {
        mockRequest.headers = {
          authorization: "some-token-here",
        };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const error = mockNext.mock.calls[0][0] as UnauthorizedError;
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error.message).toBe("Invalid authorization format");
      });
    });

    describe("TC-AUTH-004: Invalid/tampered token", () => {
      it("should return error for invalid JWT format", () => {
        mockRequest.headers = {
          authorization: "Bearer invalid-token-format",
        };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
        expect(mockRequest.user).toBeUndefined();
      });

      it("should return error for tampered token signature", () => {
        const { accessToken } = tokenService.generateTokenPair(
          "user-123",
          "user",
        );
        // Tamper with the token by changing last character
        const tamperedToken = accessToken.slice(0, -5) + "XXXXX";

        mockRequest.headers = {
          authorization: `Bearer ${tamperedToken}`,
        };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
        expect(mockRequest.user).toBeUndefined();
      });
    });

    describe("TC-AUTH-005: Expired access token", () => {
      it("should return error for expired token", async () => {
        // Create a token that's already expired
        const expiredTokenService = new TokenService();
        // Mock Date to create an expired token
        const originalDateNow = Date.now;
        Date.now = jest.fn(() => new Date("2020-01-01").getTime());

        const { accessToken } = expiredTokenService.generateTokenPair(
          "user-123",
          "user",
        );

        // Restore Date.now
        Date.now = originalDateNow;

        mockRequest.headers = {
          authorization: `Bearer ${accessToken}`,
        };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
        expect(mockRequest.user).toBeUndefined();
      });
    });

    describe("TC-AUTH-006: Wrong token type (refresh used as access)", () => {
      it("should return error when refresh token is used in authorization header", () => {
        const { refreshToken } = tokenService.generateTokenPair(
          "user-123",
          "user",
        );

        mockRequest.headers = {
          authorization: `Bearer ${refreshToken}`,
        };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const error = mockNext.mock.calls[0][0] as UnauthorizedError;
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error.message).toBe("Invalid token type");
        expect(mockRequest.user).toBeUndefined();
      });
    });

    describe("Edge cases", () => {
      it("should handle authorization header with extra spaces", () => {
        const { accessToken } = tokenService.generateTokenPair(
          "user-123",
          "user",
        );

        // Note: Express typically trims headers, but let's test Bearer with multiple spaces
        mockRequest.headers = {
          authorization: `Bearer  ${accessToken}`,
        };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        // Should fail due to split producing more than 2 parts
        expect(mockNext).toHaveBeenCalledTimes(1);
        const error = mockNext.mock.calls[0][0];
        expect(error).toBeDefined();
      });

      it("should handle case-sensitive Bearer keyword", () => {
        const { accessToken } = tokenService.generateTokenPair(
          "user-123",
          "user",
        );

        mockRequest.headers = {
          authorization: `bearer ${accessToken}`, // lowercase
        };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        const error = mockNext.mock.calls[0][0] as UnauthorizedError;
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error.message).toBe("Invalid authorization format");
      });

      it("should not mutate request if authentication fails", () => {
        mockRequest.headers = {
          authorization: "Bearer invalid-token",
        };

        const originalRequest = { ...mockRequest };

        authenticate(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockRequest.user).toBeUndefined();
        expect(mockRequest.headers).toEqual(originalRequest.headers);
      });
    });
  });

  describe("isAdmin", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: MockNextFunction;

    beforeEach(() => {
      mockRequest = { params: {}, user: undefined };
      mockResponse = {};
      mockNext = jest.fn();
    });

    it("should allow admin role to proceed", () => {
      mockRequest.user = { userId: "admin-123", role: "admin" };

      isAdmin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should reject user role", () => {
      mockRequest.user = { userId: "user-123", role: "user" };

      isAdmin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("should reject request without authenticated user", () => {
      mockRequest.user = undefined;

      isAdmin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext as NextFunction,
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe("isSelfOrAdmin", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: MockNextFunction;

    beforeEach(() => {
      mockRequest = { params: {}, user: undefined };
      mockResponse = {};
      mockNext = jest.fn();
    });

    describe("Success Cases", () => {
      it("should allow admin to access any user's profile", () => {
        mockRequest.user = { userId: "admin-123", role: "admin" };
        mockRequest.params = { id: "user-456" };

        isSelfOrAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should allow admin to access their own profile", () => {
        mockRequest.user = { userId: "admin-123", role: "admin" };
        mockRequest.params = { id: "admin-123" };

        isSelfOrAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });

      it("should allow user to access their own profile", () => {
        mockRequest.user = { userId: "user-123", role: "user" };
        mockRequest.params = { id: "user-123" };

        isSelfOrAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });
    });

    describe("Failure Cases", () => {
      it("should reject user trying to access another user's profile", () => {
        mockRequest.user = { userId: "user-123", role: "user" };
        mockRequest.params = { id: "user-456" };

        isSelfOrAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
        const error = mockNext.mock.calls[0][0] as ForbiddenError;
        expect(error.message).toBe("You can only access your own profile");
      });

      it("should reject request without authenticated user", () => {
        mockRequest.user = undefined;
        mockRequest.params = { id: "user-123" };

        isSelfOrAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
        const error = mockNext.mock.calls[0][0] as ForbiddenError;
        expect(error.message).toBe("Authentication required");
      });
    });

    describe("Edge Cases", () => {
      it("should handle missing params.id gracefully", () => {
        mockRequest.user = { userId: "user-123", role: "user" };
        mockRequest.params = {};

        isSelfOrAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      });

      it("should compare user IDs as strings (case-sensitive)", () => {
        mockRequest.user = { userId: "user-123", role: "user" };
        mockRequest.params = { id: "User-123" };

        isSelfOrAdmin(
          mockRequest as Request,
          mockResponse as Response,
          mockNext as NextFunction,
        );

        expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      });
    });
  });
});
