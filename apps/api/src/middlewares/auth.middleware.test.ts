import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Mock jwt before importing the middleware
vi.mock("jsonwebtoken");

describe("Auth Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
    vi.clearAllMocks();
  });

  describe("Token Validation", () => {
    it("should reject requests without authorization header", async () => {
      const { authenticate } = await import("./auth.middleware");

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should reject requests with invalid token format", async () => {
      mockRequest.headers = {
        authorization: "InvalidFormat",
      };

      const { authenticate } = await import("./auth.middleware");

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should reject expired tokens", async () => {
      mockRequest.headers = {
        authorization: "Bearer expired_token",
      };

      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error("jwt expired");
      });

      const { authenticate } = await import("./auth.middleware");

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should call next for valid tokens", async () => {
      mockRequest.headers = {
        authorization: "Bearer valid_token",
      };

      const mockPayload = {
        userId: "user-123",
        companyId: "company-123",
        role: "agent",
      };

      vi.mocked(jwt.verify).mockReturnValue(mockPayload as any);

      const { authenticate } = await import("./auth.middleware");

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual(mockPayload);
    });
  });

  describe("Role Authorization", () => {
    it("should allow access for matching role", async () => {
      mockRequest.headers = {
        authorization: "Bearer valid_token",
      };

      const mockPayload = {
        userId: "user-123",
        companyId: "company-123",
        role: "admin",
      };

      vi.mocked(jwt.verify).mockReturnValue(mockPayload as any);

      const { authenticate, authorize } = await import("./auth.middleware");

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const authorizeMiddleware = authorize(["admin"]);
      await authorizeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(2);
    });

    it("should deny access for non-matching role", async () => {
      (mockRequest as any).user = {
        userId: "user-123",
        companyId: "company-123",
        role: "agent",
      };

      const { authorize } = await import("./auth.middleware");

      const authorizeMiddleware = authorize(["admin"]);
      await authorizeMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });
});
