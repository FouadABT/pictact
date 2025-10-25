import { AuthenticationService } from '../core/auth';
import { RedditComplianceService } from '../core/reddit-compliance-service';
import { SessionManager } from '../core/session-manager';
import { AuthMiddleware } from '../core/auth-middleware';
import { Request, Response, NextFunction } from 'express';
import { 
  AuthenticatedUser, 
  UserPermissions, 
  SessionValidationResult,
  AuthenticationResult 
} from '../../shared/types/auth';

// Mock the Devvit web server module
jest.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentUsername: jest.fn(),
  },
  context: {
    postId: 'test_post_123',
    subredditName: 'testsubreddit'
  }
}));

import { reddit, context } from '@devvit/web/server';

describe('Reddit Authentication Compliance Tests', () => {
  let authService: AuthenticationService;
  let redditComplianceService: RedditComplianceService;
  let sessionManager: SessionManager;
  let authMiddleware: AuthMiddleware;
  let mockGetCurrentUsername: jest.MockedFunction<typeof reddit.getCurrentUsername>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create fresh instances for each test
    authService = new AuthenticationService();
    redditComplianceService = new RedditComplianceService();
    sessionManager = new SessionManager();
    authMiddleware = new AuthMiddleware(authService);
    
    mockGetCurrentUsername = reddit.getCurrentUsername as jest.MockedFunction<typeof reddit.getCurrentUsername>;
    
    // Reset context to default
    (context as any).subredditName = 'testsubreddit';
    (context as any).postId = 'test_post_123';
  });

  describe('Reddit-Only User Identification (Requirements 3.1, 3.2)', () => {
    describe('Reddit OAuth Integration', () => {
      it('should use reddit.getCurrentUsername() for user identification', async () => {
        // Arrange
        const mockUsername = 'testuser123';
        mockGetCurrentUsername.mockResolvedValue(mockUsername);

        // Act
        const result = await authService.getCurrentUser();

        // Assert
        expect(mockGetCurrentUsername).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.user!.redditUsername).toBe(mockUsername);
        expect(result.user!.isAnonymous).toBe(false);
      });

      it('should never store Reddit user IDs in authentication data', async () => {
        // Arrange
        const mockUsername = 'testuser123';
        mockGetCurrentUsername.mockResolvedValue(mockUsername);

        // Act
        const result = await authService.getCurrentUser();
        
        // Assert - Check user data structure for Reddit ID compliance
        expect(result.success).toBe(true);
        expect(result.user!.redditUsername).toBe(mockUsername);
        
        // Verify no Reddit user ID properties exist
        expect(result.user).not.toHaveProperty('redditUserId');
        expect(result.user).not.toHaveProperty('userId');
        expect(result.user).not.toHaveProperty('id');
        
        // Check that session token doesn't contain user data
        const sessionToken = result.user!.sessionToken;
        expect(sessionToken).toBeDefined();
        expect(sessionToken).not.toContain(mockUsername);
        expect(sessionToken).not.toMatch(/t2_[a-z0-9]+/i); // Reddit user ID pattern
        expect(sessionToken).not.toMatch(/user_[a-z0-9]+/i); // Alternative user ID pattern
      });

      it('should validate Reddit username format through compliance service', async () => {
        // Test that the Reddit compliance service validates usernames
        const redditService = new RedditComplianceService();
        
        // Test valid username
        mockGetCurrentUsername.mockResolvedValue('validuser123');
        const validResult = await redditService.getCurrentRedditUser();
        expect(validResult.success).toBe(true);
        
        // Test invalid username (too short)
        mockGetCurrentUsername.mockResolvedValue('ab');
        const invalidResult = await redditService.getCurrentRedditUser();
        expect(invalidResult.success).toBe(false);
        expect(invalidResult.error).toBe('Invalid Reddit username format');
      });

      it('should fallback to anonymous user when Reddit OAuth fails', async () => {
        // Arrange
        mockGetCurrentUsername.mockRejectedValue(new Error('OAuth service unavailable'));

        // Act
        const result = await authService.getCurrentUser();

        // Assert
        expect(result.success).toBe(true);
        expect(result.user!.isAnonymous).toBe(true);
        expect(result.user!.redditUsername).toBe('Anonymous');
        expect(result.error).toBeDefined();
      });

      it('should handle Reddit API returning null/undefined gracefully', async () => {
        // Test null response
        mockGetCurrentUsername.mockResolvedValue(null as any);
        let result = await authService.getCurrentUser();
        expect(result.success).toBe(true);
        expect(result.user!.isAnonymous).toBe(true);

        // Test undefined response
        mockGetCurrentUsername.mockResolvedValue(undefined as any);
        result = await authService.getCurrentUser();
        expect(result.success).toBe(true);
        expect(result.user!.isAnonymous).toBe(true);
      });
    });

    describe('Session Management Compliance', () => {
      it('should create secure sessions without exposing Reddit user data', async () => {
        // Arrange
        const mockUsername = 'testuser';
        mockGetCurrentUsername.mockResolvedValue(mockUsername);

        // Act
        const result = await authService.getCurrentUser();
        const sessionToken = result.user!.sessionToken;

        // Assert session token security properties
        expect(sessionToken).toMatch(/^sess_/);
        expect(sessionToken.length).toBeGreaterThan(20);
        expect(sessionToken).not.toContain(mockUsername);
        
        // Verify session validation works without exposing Reddit IDs
        const validation = await authService.validateSession(sessionToken);
        expect(validation.isValid).toBe(true);
        expect(validation.user!.redditUsername).toBe(mockUsername);
        
        // Verify no Reddit IDs in validation response
        const validationData = JSON.stringify(validation);
        expect(validationData).not.toMatch(/t2_[a-z0-9]+/i);
        expect(validationData).not.toMatch(/user_[a-z0-9]+/i);
      });

      it('should maintain subreddit context in user sessions', async () => {
        // Arrange
        const mockUsername = 'testuser';
        mockGetCurrentUsername.mockResolvedValue(mockUsername);

        // Act
        const result = await authService.getCurrentUser();

        // Assert
        expect(result.user!.subredditContext).toBeDefined();
        expect(typeof result.user!.subredditContext).toBe('string');
        expect(result.user!.subredditContext!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Moderator Permission Checking and Subreddit Context (Requirements 3.1, 3.4)', () => {
    describe('Reddit Moderator Permission Integration', () => {
      it('should use reddit.getModPermissions() for moderator verification', async () => {
        // Arrange
        const mockUsername = 'moderatoruser';
        const subreddit = 'testsubreddit';
        mockGetCurrentUsername.mockResolvedValue(mockUsername);

        // Mock the Reddit API moderator permissions call
        const mockModPermissions = ['posts', 'comments', 'config'];
        const mockGetModPermissions = jest.fn().mockResolvedValue(mockModPermissions);
        (reddit as any).getModPermissions = mockGetModPermissions;

        // Act
        const permissionsResult = await redditComplianceService.getModeratorPermissions(subreddit, mockUsername);

        // Assert
        expect(mockGetModPermissions).toHaveBeenCalledWith(subreddit, mockUsername);
        expect(permissionsResult.success).toBe(true);
        expect(permissionsResult.data!.canManagePosts).toBe(true);
        expect(permissionsResult.data!.canManageComments).toBe(true);
        expect(permissionsResult.data!.canManageSettings).toBe(true);
      });

      it('should handle moderator permission API failures gracefully', async () => {
        // Arrange
        const mockUsername = 'testuser';
        const subreddit = 'testsubreddit';
        
        // Mock API failure
        const mockGetModPermissions = jest.fn().mockRejectedValue(new Error('API not available'));
        (reddit as any).getModPermissions = mockGetModPermissions;

        // Act
        const permissionsResult = await redditComplianceService.getModeratorPermissions(subreddit, mockUsername);

        // Assert - Should fallback gracefully
        expect(permissionsResult.success).toBe(true);
        expect(permissionsResult.data).toBeDefined();
        // Should return no permissions as safe default
        expect(permissionsResult.data!.canManagePosts).toBe(false);
        expect(permissionsResult.data!.canManageComments).toBe(false);
      });

      it('should deny moderator permissions for anonymous users', async () => {
        // Arrange
        mockGetCurrentUsername.mockResolvedValue(undefined);

        // Act
        const authResult = await authService.getCurrentUser();
        const sessionToken = authResult.user!.sessionToken;
        const permissionCheck = await authService.checkModeratorPermission(sessionToken, 'canManagePosts');

        // Assert
        expect(permissionCheck.hasPermission).toBe(false);
        expect(authResult.user!.isAnonymous).toBe(true);
      });
    });

    describe('Subreddit Context Management', () => {
      it('should maintain subreddit context throughout authentication flow', async () => {
        // Arrange
        const mockUsername = 'testuser';
        const expectedSubreddit = 'testsubreddit';
        mockGetCurrentUsername.mockResolvedValue(mockUsername);

        // Act
        const authResult = await authService.getCurrentUser();
        const contextResult = await redditComplianceService.getDevvitContext();

        // Assert
        expect(authResult.user!.subredditContext).toBeDefined();
        expect(contextResult.success).toBe(true);
        expect(contextResult.data!.subreddit).toBe(expectedSubreddit);
        expect(contextResult.data!.postId).toBe('test_post_123');
      });

      it('should validate subreddit permissions for specific actions', async () => {
        // Arrange
        const mockUsername = 'testuser';
        const subreddit = 'testsubreddit';
        mockGetCurrentUsername.mockResolvedValue(mockUsername);

        // Act
        const permissionResult = await redditComplianceService.validateSubredditPermissions(
          subreddit,
          'manage_posts'
        );

        // Assert
        expect(permissionResult.success).toBe(true);
        expect(typeof permissionResult.data).toBe('boolean');
      });

      it('should handle invalid subreddit context gracefully', async () => {
        // Arrange
        const originalSubreddit = context.subredditName;
        (context as any).subredditName = null;

        // Act
        const contextResult = await redditComplianceService.getDevvitContext();

        // Assert
        expect(contextResult.success).toBe(false);
        expect(contextResult.error).toContain('subreddit not found');

        // Restore original context
        (context as any).subredditName = originalSubreddit;
      });
    });
  });

  describe('Privacy Compliance and Data Redaction (Requirements 5.1, 5.2, 5.3)', () => {
    describe('Reddit ID Redaction', () => {
      it('should never store Reddit user IDs in any persistent data', async () => {
        // Arrange
        const mockUsername = 'testuser';
        mockGetCurrentUsername.mockResolvedValue(mockUsername);

        // Act
        const authResult = await authService.getCurrentUser();
        const sessionToken = authResult.user!.sessionToken;

        // Assert - Check all data structures for Reddit ID patterns
        const userData = JSON.stringify(authResult.user);
        const sessionData = JSON.stringify({ sessionToken });

        // Reddit user ID patterns to check for
        const redditIdPatterns = [
          /t2_[a-z0-9]+/i,     // Reddit user ID format
          /user_[a-z0-9]+/i,   // Alternative user ID format
          /u\/[a-zA-Z0-9_-]+/, // Username reference format
          /reddit\.com\/user\//i // Reddit user URL format
        ];

        redditIdPatterns.forEach(pattern => {
          expect(userData).not.toMatch(pattern);
          expect(sessionData).not.toMatch(pattern);
        });

        // Verify only username is stored, not ID
        expect(authResult.user!.redditUsername).toBe(mockUsername);
      });

      it('should redact Reddit usernames from exported data', async () => {
        // Arrange
        const mockUsername = 'testuser';
        mockGetCurrentUsername.mockResolvedValue(mockUsername);

        // Create session with user data
        const authResult = await authService.getCurrentUser();

        // Mock data export functionality
        const exportData = {
          user: authResult.user,
          gameHistory: [
            { player: mockUsername, score: 100 },
            { player: 'otheruser', score: 85 }
          ]
        };

        // Act - Simulate data redaction for export
        const redactedData = redactRedditData(exportData);

        // Assert
        expect(redactedData.user.redditUsername).toBe('[REDACTED]');
        expect(redactedData.gameHistory[0].player).toBe('[REDACTED]');
        expect(redactedData.gameHistory[1].player).toBe('[REDACTED]');
      });

      it('should maintain data integrity while redacting Reddit identifiers', async () => {
        // Arrange
        const mockUsername = 'testuser';
        mockGetCurrentUsername.mockResolvedValue(mockUsername);

        // Act
        const authResult = await authService.getCurrentUser();
        const sessionToken = authResult.user!.sessionToken;

        // Verify session still works after creation
        const validation = await authService.validateSession(sessionToken);

        // Assert
        expect(validation.isValid).toBe(true);
        expect(validation.user!.permissions).toBeDefined();
        expect(validation.user!.subredditContext).toBeDefined();
        expect(validation.user!.isAnonymous).toBe(false);
        
        // Verify no Reddit IDs in validation response
        const validationData = JSON.stringify(validation);
        expect(validationData).not.toMatch(/t2_[a-z0-9]+/i);
      });
    });

    describe('Authentication Middleware Privacy Compliance', () => {
      it('should not expose Reddit user data in middleware errors', async () => {
        // Arrange
        const mockRequest = {
          headers: { authorization: 'Bearer invalid_token' },
          query: {},
          body: {}
        } as Request;

        const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        } as unknown as Response;

        const mockNext = jest.fn() as NextFunction;

        // Act
        await authMiddleware.requireAuth(mockRequest, mockResponse, mockNext);

        // Assert
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: "Invalid session",
          message: expect.any(String)
        });

        // Verify no Reddit user data in error response
        const errorCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
        const errorData = JSON.stringify(errorCall);
        expect(errorData).not.toMatch(/t2_[a-z0-9]+/i);
        expect(errorData).not.toMatch(/u\/[a-zA-Z0-9_-]+/);
      });

      it('should handle authentication without exposing session internals', async () => {
        // Arrange
        const mockUsername = 'testuser';
        mockGetCurrentUsername.mockResolvedValue(mockUsername);

        const authResult = await authService.getCurrentUser();
        const sessionToken = authResult.user!.sessionToken;

        const mockRequest = {
          headers: { authorization: `Bearer ${sessionToken}` },
          query: {},
          body: {}
        } as Request;

        const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        } as unknown as Response;

        const mockNext = jest.fn() as NextFunction;

        // Act
        await authMiddleware.requireAuth(mockRequest, mockResponse, mockNext);

        // Assert
        expect(mockNext).toHaveBeenCalled();
        expect(mockRequest.user).toBeDefined();
        expect(mockRequest.user!.redditUsername).toBe(mockUsername);
        
        // Verify no internal session data is exposed
        expect(mockRequest.user).not.toHaveProperty('sessionId');
        expect(mockRequest.user).not.toHaveProperty('createdAt');
        expect(mockRequest.user).not.toHaveProperty('expiresAt');
      });
    });
  });

  describe('Integration Tests - End-to-End Reddit Compliance', () => {
    it('should complete full authentication flow with Reddit compliance', async () => {
      // Arrange
      const mockUsername = 'integrationuser';
      mockGetCurrentUsername.mockResolvedValue(mockUsername);

      // Act - Complete authentication flow
      const authResult = await authService.getCurrentUser();
      const sessionToken = authResult.user!.sessionToken;
      const validation = await authService.validateSession(sessionToken);
      const contextResult = await redditComplianceService.getDevvitContext();

      // Assert - Verify complete compliance
      expect(authResult.success).toBe(true);
      expect(authResult.user!.redditUsername).toBe(mockUsername);
      expect(authResult.user!.subredditContext).toBeDefined();
      
      expect(validation.isValid).toBe(true);
      expect(validation.user!.redditUsername).toBe(mockUsername);
      
      expect(contextResult.success).toBe(true);
      expect(contextResult.data!.subreddit).toBeDefined();
      expect(contextResult.data!.postId).toBe('test_post_123');

      // Verify no Reddit IDs stored anywhere
      const allData = JSON.stringify({
        auth: authResult,
        validation: validation,
        context: contextResult
      });
      expect(allData).not.toMatch(/t2_[a-z0-9]+/i);
    });

    it('should handle Reddit API failures with graceful degradation', async () => {
      // Arrange
      mockGetCurrentUsername.mockRejectedValue(new Error('Reddit API unavailable'));

      // Act
      const authResult = await authService.getCurrentUser();
      const sessionToken = authResult.user!.sessionToken;
      const validation = await authService.validateSession(sessionToken);

      // Assert - Should work in anonymous mode
      expect(authResult.success).toBe(true);
      expect(authResult.user!.isAnonymous).toBe(true);
      expect(authResult.user!.redditUsername).toBe('Anonymous');
      
      expect(validation.isValid).toBe(true);
      expect(validation.user!.isAnonymous).toBe(true);
      
      // Should still maintain subreddit context
      expect(authResult.user!.subredditContext).toBeDefined();
    });

    it('should maintain security and privacy under concurrent access', async () => {
      // Arrange
      const usernames = ['user1', 'user2', 'user3'];
      
      // Act - Simulate concurrent authentication
      const authPromises = usernames.map((username, index) => {
        // Reset mock for each call
        mockGetCurrentUsername.mockResolvedValueOnce(username);
        return authService.getCurrentUser();
      });

      const results = await Promise.all(authPromises);

      // Assert
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.user!.redditUsername).toBe(usernames[index]);
        expect(result.user!.subredditContext).toBeDefined();
      });

      // Verify all session tokens are unique
      const tokens = results.map(r => r.user!.sessionToken);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);

      // Verify no Reddit IDs in any result
      const allResults = JSON.stringify(results);
      expect(allResults).not.toMatch(/t2_[a-z0-9]+/i);
    });
  });
});

// Helper function for data redaction testing
function redactRedditData(data: any): any {
  const redacted = JSON.parse(JSON.stringify(data));
  
  const redactObject = (obj: any) => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        redactObject(obj[key]);
      } else if (typeof obj[key] === 'string') {
        if (key.toLowerCase().includes('username') || 
            key.toLowerCase().includes('player') ||
            key.toLowerCase().includes('user')) {
          obj[key] = '[REDACTED]';
        }
      }
    }
  };

  redactObject(redacted);
  return redacted;
}