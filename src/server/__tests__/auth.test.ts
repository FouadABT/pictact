import { AuthenticationService } from '../core/auth';
import { SessionManager } from '../core/session-manager';
import { AuthenticatedUser, UserPermissions } from '../../shared/types/auth';

// Mock the Devvit web server module
jest.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentUsername: jest.fn(),
  },
}));

import { reddit } from '@devvit/web/server';

describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  let mockGetCurrentUsername: jest.MockedFunction<typeof reddit.getCurrentUsername>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create fresh instance for each test
    authService = new AuthenticationService();
    mockGetCurrentUsername = reddit.getCurrentUsername as jest.MockedFunction<typeof reddit.getCurrentUsername>;
  });

  describe('getCurrentUser', () => {
    it('should return authenticated user when Reddit OAuth provides username', async () => {
      // Arrange
      const mockUsername = 'testuser123';
      mockGetCurrentUsername.mockResolvedValue(mockUsername);

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.redditUsername).toBe(mockUsername);
      expect(result.user!.subredditContext).toBeDefined();
      expect(result.user!.isAnonymous).toBe(false);
      expect(result.user!.sessionToken).toBeDefined();
      expect(result.user!.permissions).toEqual({
        canCreateEvents: true,
        canModerate: false,
        canViewProfiles: true,
        canExportData: true
      });
    });

    it('should return anonymous user when Reddit OAuth returns null', async () => {
      // Arrange
      mockGetCurrentUsername.mockResolvedValue(undefined);

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.redditUsername).toBe('Anonymous');
      expect(result.user!.subredditContext).toBeDefined();
      expect(result.user!.isAnonymous).toBe(true);
      expect(result.user!.sessionToken).toBeDefined();
      expect(result.user!.permissions).toEqual({
        canCreateEvents: false,
        canModerate: false,
        canViewProfiles: false,
        canExportData: false
      });
    });

    it('should handle invalid Reddit username format', async () => {
      // Arrange
      const invalidUsername = 'ab'; // Too short
      mockGetCurrentUsername.mockResolvedValue(invalidUsername);

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Reddit username format');
    });

    it('should fallback to anonymous user on Reddit OAuth error', async () => {
      // Arrange
      mockGetCurrentUsername.mockRejectedValue(new Error('OAuth failed'));

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.isAnonymous).toBe(true);
      expect(result.error).toContain('Authentication failed, proceeding anonymously');
    });

    it('should validate Reddit username format correctly', async () => {
      // Test valid usernames
      const validUsernames = ['user123', 'test_user', 'user-name', 'a'.repeat(20)];
      
      for (const username of validUsernames) {
        mockGetCurrentUsername.mockResolvedValue(username);
        const result = await authService.getCurrentUser();
        expect(result.success).toBe(true);
        expect(result.user!.redditUsername).toBe(username);
      }

      // Test invalid usernames
      const invalidUsernames = ['ab', 'a'.repeat(21), 'user@name', 'user name', ''];
      
      for (const username of invalidUsernames) {
        mockGetCurrentUsername.mockResolvedValue(username);
        const result = await authService.getCurrentUser();
        expect(result.success).toBe(false);
      }
    });
  });

  describe('validateSession', () => {
    it('should validate a valid session token', async () => {
      // Arrange
      const mockUsername = 'testuser';
      mockGetCurrentUsername.mockResolvedValue(mockUsername);
      
      // Create a user first to get a session token
      const authResult = await authService.getCurrentUser();
      const sessionToken = authResult.user!.sessionToken;

      // Act
      const result = await authService.validateSession(sessionToken);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.redditUsername).toBe(mockUsername);
      expect(result.user!.sessionToken).toBe(sessionToken);
    });

    it('should reject invalid session token format', async () => {
      // Test various invalid token formats
      const invalidTokens = ['', 'short', null as any, undefined as any, 123 as any];

      for (const token of invalidTokens) {
        const result = await authService.validateSession(token);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid session token format');
      }
    });

    it('should reject non-existent session token', async () => {
      // Arrange
      const fakeToken = 'sess_fake_token_that_does_not_exist';

      // Act
      const result = await authService.validateSession(fakeToken);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid or expired session');
    });

    it('should handle session validation errors gracefully', async () => {
      // Arrange - Create a session manager that will throw an error
      const originalSessionManager = (authService as any).sessionManager;
      (authService as any).sessionManager = {
        validateSession: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      // Act
      const result = await authService.validateSession('valid_token_format');

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Database error');

      // Restore original session manager
      (authService as any).sessionManager = originalSessionManager;
    });
  });

  describe('refreshAuthentication', () => {
    it('should refresh valid existing session', async () => {
      // Arrange
      const mockUsername = 'testuser';
      mockGetCurrentUsername.mockResolvedValue(mockUsername);
      
      // Create initial session
      const initialAuth = await authService.getCurrentUser();
      const sessionToken = initialAuth.user!.sessionToken;

      // Act
      const result = await authService.refreshAuthentication(sessionToken);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.redditUsername).toBe(mockUsername);
      expect(result.user!.sessionToken).toBe(sessionToken);
    });

    it('should create new session when existing session is invalid', async () => {
      // Arrange
      const mockUsername = 'testuser';
      mockGetCurrentUsername.mockResolvedValue(mockUsername);
      const invalidToken = 'invalid_session_token';

      // Act
      const result = await authService.refreshAuthentication(invalidToken);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.redditUsername).toBe(mockUsername);
      expect(result.user!.sessionToken).not.toBe(invalidToken);
    });

    it('should create new session when no existing session provided', async () => {
      // Arrange
      const mockUsername = 'testuser';
      mockGetCurrentUsername.mockResolvedValue(mockUsername);

      // Act
      const result = await authService.refreshAuthentication();

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.redditUsername).toBe(mockUsername);
    });

    it('should handle refresh authentication errors', async () => {
      // Arrange
      mockGetCurrentUsername.mockRejectedValue(new Error('OAuth service unavailable'));

      // Act
      const result = await authService.refreshAuthentication();

      // Assert
      expect(result.success).toBe(true); // Should fallback to anonymous
      expect(result.user!.isAnonymous).toBe(true);
    });
  });

  describe('logout', () => {
    it('should logout user and invalidate session', async () => {
      // Arrange
      const mockUsername = 'testuser';
      mockGetCurrentUsername.mockResolvedValue(mockUsername);
      
      // Create session
      const authResult = await authService.getCurrentUser();
      const sessionToken = authResult.user!.sessionToken;

      // Verify session is valid before logout
      const preLogoutValidation = await authService.validateSession(sessionToken);
      expect(preLogoutValidation.isValid).toBe(true);

      // Act
      await authService.logout(sessionToken);

      // Assert - Session should be invalid after logout
      const postLogoutValidation = await authService.validateSession(sessionToken);
      expect(postLogoutValidation.isValid).toBe(false);
    });

    it('should handle logout errors gracefully', async () => {
      // Arrange
      const invalidToken = 'invalid_token';

      // Act & Assert - Should not throw
      await expect(authService.logout(invalidToken)).resolves.toBeUndefined();
    });
  });

  describe('Security Features', () => {
    it('should generate unique session tokens for different users', async () => {
      // Arrange
      const users = ['user1', 'user2', 'user3'];
      const sessionTokens: string[] = [];

      // Act
      for (const username of users) {
        mockGetCurrentUsername.mockResolvedValue(username);
        const result = await authService.getCurrentUser();
        sessionTokens.push(result.user!.sessionToken);
      }

      // Assert
      const uniqueTokens = new Set(sessionTokens);
      expect(uniqueTokens.size).toBe(users.length);
    });

    it('should handle concurrent authentication requests safely', async () => {
      // Arrange
      const mockUsername = 'testuser';
      mockGetCurrentUsername.mockResolvedValue(mockUsername);

      // Act - Make multiple concurrent requests
      const promises = Array(5).fill(null).map(() => authService.getCurrentUser());
      const results = await Promise.all(promises);

      // Assert
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.user!.redditUsername).toBe(mockUsername);
      });

      // All session tokens should be unique
      const tokens = results.map(r => r.user!.sessionToken);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it('should properly handle anonymous user permissions', async () => {
      // Arrange
      mockGetCurrentUsername.mockResolvedValue(undefined);

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result.user!.isAnonymous).toBe(true);
      expect(result.user!.permissions).toEqual({
        canCreateEvents: false,
        canModerate: false,
        canViewProfiles: false,
        canExportData: false
      });
    });

    it('should maintain session security during validation', async () => {
      // Arrange
      const mockUsername = 'testuser';
      mockGetCurrentUsername.mockResolvedValue(mockUsername);
      
      const authResult = await authService.getCurrentUser();
      const sessionToken = authResult.user!.sessionToken;

      // Act - Validate session multiple times
      const validations = await Promise.all([
        authService.validateSession(sessionToken),
        authService.validateSession(sessionToken),
        authService.validateSession(sessionToken)
      ]);

      // Assert
      validations.forEach(validation => {
        expect(validation.isValid).toBe(true);
        expect(validation.user!.sessionToken).toBe(sessionToken);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed session tokens', async () => {
      const malformedTokens = [
        'not_a_session_token',
        'sess_',
        'sess_malformed',
        '{"fake": "json"}',
        '<script>alert("xss")</script>'
      ];

      for (const token of malformedTokens) {
        const result = await authService.validateSession(token);
        expect(result.isValid).toBe(false);
      }
    });

    it('should handle Reddit API timeouts gracefully', async () => {
      // Arrange
      mockGetCurrentUsername.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      // Act
      const result = await authService.getCurrentUser();

      // Assert - Should fallback to anonymous
      expect(result.success).toBe(true);
      expect(result.user!.isAnonymous).toBe(true);
      expect(result.error).toContain('Authentication failed, proceeding anonymously');
    });

    it('should validate session token security properties', async () => {
      // Arrange
      const mockUsername = 'testuser';
      mockGetCurrentUsername.mockResolvedValue(mockUsername);

      // Act
      const result = await authService.getCurrentUser();
      const sessionToken = result.user!.sessionToken;

      // Assert - Session token should have security properties
      expect(sessionToken).toMatch(/^sess_/); // Should start with sess_
      expect(sessionToken.length).toBeGreaterThan(20); // Should be sufficiently long
      expect(sessionToken).not.toContain(' '); // Should not contain spaces
      expect(sessionToken).not.toContain(mockUsername); // Should not contain username
    });
  });
});