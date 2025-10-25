import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../core/auth-middleware';
import { AuthenticationService } from '../core/auth';
import { AuthenticatedUser, SessionValidationResult } from '../../shared/types/auth';

// Mock the authentication service
jest.mock('../core/auth');

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockAuthService: jest.Mocked<AuthenticationService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Create mocked authentication service
    mockAuthService = {
      validateSession: jest.fn(),
      getCurrentUser: jest.fn(),
      refreshAuthentication: jest.fn(),
      logout: jest.fn(),
    } as any;

    authMiddleware = new AuthMiddleware(mockAuthService);

    // Create mock request and response objects
    mockRequest = {
      headers: {},
      query: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('requireAuth middleware', () => {
    it('should authenticate user with valid Bearer token', async () => {
      // Arrange
      const sessionToken = 'valid_session_token';
      const mockUser: AuthenticatedUser = {
        redditUsername: 'testuser',
        redditUserId: 'user123',
        sessionToken,
        permissions: {
          canCreateEvents: true,
          canModerate: false,
          canViewProfiles: true,
          canExportData: true
        },
        isAnonymous: false
      };

      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`
      };

      const validationResult: SessionValidationResult = {
        isValid: true,
        user: mockUser
      };

      mockAuthService.validateSession.mockResolvedValue(validationResult);

      // Act
      await authMiddleware.requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateSession).toHaveBeenCalledWith(sessionToken);
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should authenticate user with session token in query parameter', async () => {
      // Arrange
      const sessionToken = 'valid_session_token';
      const mockUser: AuthenticatedUser = {
        redditUsername: 'testuser',
        redditUserId: 'user123',
        sessionToken,
        permissions: {
          canCreateEvents: true,
          canModerate: false,
          canViewProfiles: true,
          canExportData: true
        },
        isAnonymous: false
      };

      mockRequest.query = { sessionToken };

      const validationResult: SessionValidationResult = {
        isValid: true,
        user: mockUser
      };

      mockAuthService.validateSession.mockResolvedValue(validationResult);

      // Act
      await authMiddleware.requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateSession).toHaveBeenCalledWith(sessionToken);
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate user with session token in request body', async () => {
      // Arrange
      const sessionToken = 'valid_session_token';
      const mockUser: AuthenticatedUser = {
        redditUsername: 'testuser',
        redditUserId: 'user123',
        sessionToken,
        permissions: {
          canCreateEvents: true,
          canModerate: false,
          canViewProfiles: true,
          canExportData: true
        },
        isAnonymous: false
      };

      mockRequest.body = { sessionToken };

      const validationResult: SessionValidationResult = {
        isValid: true,
        user: mockUser
      };

      mockAuthService.validateSession.mockResolvedValue(validationResult);

      // Act
      await authMiddleware.requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateSession).toHaveBeenCalledWith(sessionToken);
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request with no session token', async () => {
      // Arrange - No token provided

      // Act
      await authMiddleware.requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Authentication required",
        message: "No session token provided"
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockAuthService.validateSession).not.toHaveBeenCalled();
    });

    it('should reject request with invalid session token', async () => {
      // Arrange
      const invalidToken = 'invalid_session_token';
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`
      };

      const validationResult: SessionValidationResult = {
        isValid: false,
        error: 'Session expired'
      };

      mockAuthService.validateSession.mockResolvedValue(validationResult);

      // Act
      await authMiddleware.requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateSession).toHaveBeenCalledWith(invalidToken);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid session",
        message: "Session expired"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle authentication service errors', async () => {
      // Arrange
      const sessionToken = 'valid_session_token';
      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`
      };

      mockAuthService.validateSession.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await authMiddleware.requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Authentication error",
        message: "Failed to validate authentication"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    it('should authenticate user when valid token is provided', async () => {
      // Arrange
      const sessionToken = 'valid_session_token';
      const mockUser: AuthenticatedUser = {
        redditUsername: 'testuser',
        redditUserId: 'user123',
        sessionToken,
        permissions: {
          canCreateEvents: true,
          canModerate: false,
          canViewProfiles: true,
          canExportData: true
        },
        isAnonymous: false
      };

      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`
      };

      const validationResult: SessionValidationResult = {
        isValid: true,
        user: mockUser
      };

      mockAuthService.validateSession.mockResolvedValue(validationResult);

      // Act
      await authMiddleware.optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateSession).toHaveBeenCalledWith(sessionToken);
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when no token is provided', async () => {
      // Arrange - No token provided

      // Act
      await authMiddleware.optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateSession).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when token is invalid', async () => {
      // Arrange
      const invalidToken = 'invalid_session_token';
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`
      };

      const validationResult: SessionValidationResult = {
        isValid: false,
        error: 'Session expired'
      };

      mockAuthService.validateSession.mockResolvedValue(validationResult);

      // Act
      await authMiddleware.optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateSession).toHaveBeenCalledWith(invalidToken);
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication on service errors', async () => {
      // Arrange
      const sessionToken = 'valid_session_token';
      mockRequest.headers = {
        authorization: `Bearer ${sessionToken}`
      };

      mockAuthService.validateSession.mockRejectedValue(new Error('Service unavailable'));

      // Act
      await authMiddleware.optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requirePermission middleware', () => {
    it('should allow access when user has required permission', async () => {
      // Arrange
      const mockUser: AuthenticatedUser = {
        redditUsername: 'testuser',
        redditUserId: 'user123',
        sessionToken: 'token',
        permissions: {
          canCreateEvents: true,
          canModerate: false,
          canViewProfiles: true,
          canExportData: true
        },
        isAnonymous: false
      };

      mockRequest.user = mockUser;
      const permissionMiddleware = authMiddleware.requirePermission('canCreateEvents');

      // Act
      await permissionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required permission', async () => {
      // Arrange
      const mockUser: AuthenticatedUser = {
        redditUsername: 'testuser',
        redditUserId: 'user123',
        sessionToken: 'token',
        permissions: {
          canCreateEvents: false,
          canModerate: false,
          canViewProfiles: true,
          canExportData: true
        },
        isAnonymous: false
      };

      mockRequest.user = mockUser;
      const permissionMiddleware = authMiddleware.requirePermission('canCreateEvents');

      // Act
      await permissionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Insufficient permissions",
        message: "Permission 'canCreateEvents' is required"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', async () => {
      // Arrange - No user attached to request
      const permissionMiddleware = authMiddleware.requirePermission('canCreateEvents');

      // Act
      await permissionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Authentication required",
        message: "Must be authenticated to access this resource"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should work with different permission types', async () => {
      // Arrange
      const mockUser: AuthenticatedUser = {
        redditUsername: 'moderator',
        redditUserId: 'mod123',
        sessionToken: 'token',
        permissions: {
          canCreateEvents: true,
          canModerate: true,
          canViewProfiles: true,
          canExportData: true
        },
        isAnonymous: false
      };

      mockRequest.user = mockUser;

      // Test different permissions
      const permissions: Array<keyof AuthenticatedUser['permissions']> = [
        'canCreateEvents',
        'canModerate',
        'canViewProfiles',
        'canExportData'
      ];

      for (const permission of permissions) {
        const permissionMiddleware = authMiddleware.requirePermission(permission);
        await permissionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });
  });

  describe('Token Extraction', () => {
    it('should prioritize Authorization header over query parameter', async () => {
      // Arrange
      const headerToken = 'header_token';
      const queryToken = 'query_token';
      
      mockRequest.headers = {
        authorization: `Bearer ${headerToken}`
      };
      mockRequest.query = { sessionToken: queryToken };

      const validationResult: SessionValidationResult = {
        isValid: true,
        user: {
          redditUsername: 'testuser',
          redditUserId: 'user123',
          sessionToken: headerToken,
          permissions: {
            canCreateEvents: true,
            canModerate: false,
            canViewProfiles: true,
            canExportData: true
          },
          isAnonymous: false
        }
      };

      mockAuthService.validateSession.mockResolvedValue(validationResult);

      // Act
      await authMiddleware.requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateSession).toHaveBeenCalledWith(headerToken);
      expect(mockAuthService.validateSession).not.toHaveBeenCalledWith(queryToken);
    });

    it('should handle malformed Authorization header', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'InvalidFormat token123'
      };

      // Act
      await authMiddleware.requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Authentication required",
        message: "No session token provided"
      });
    });

    it('should extract token from body for POST requests', async () => {
      // Arrange
      const bodyToken = 'body_token';
      mockRequest.body = { sessionToken: bodyToken };

      const validationResult: SessionValidationResult = {
        isValid: true,
        user: {
          redditUsername: 'testuser',
          redditUserId: 'user123',
          sessionToken: bodyToken,
          permissions: {
            canCreateEvents: true,
            canModerate: false,
            canViewProfiles: true,
            canExportData: true
          },
          isAnonymous: false
        }
      };

      mockAuthService.validateSession.mockResolvedValue(validationResult);

      // Act
      await authMiddleware.requireAuth(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateSession).toHaveBeenCalledWith(bodyToken);
    });
  });
});