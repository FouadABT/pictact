import { SessionManager } from '../core/session-manager';
import { UserSession, UserPermissions } from '../../shared/types/auth';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Create fresh instance for each test
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  describe('createSession', () => {
    it('should create a valid session for authenticated user', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';

      // Act
      const sessionToken = await sessionManager.createSession(username, 'testsubreddit');

      // Assert
      expect(sessionToken).toBeDefined();
      expect(sessionToken).toMatch(/^sess_/);
      expect(sessionToken.length).toBeGreaterThan(20);

      // Verify session can be retrieved
      const session = sessionManager.getSession(sessionToken);
      expect(session).toBeDefined();
      expect(session!.isAnonymous).toBe(false);
      expect(session!.redditUsername).toBe(username);
      expect(session!.sessionId).toBe(sessionToken);
    });

    it('should create session with subreddit context', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';
      const subreddit = 'testsubreddit';

      // Act
      const sessionToken = await sessionManager.createSession(username, subreddit);

      // Assert
      const session = sessionManager.getSession(sessionToken);
      expect(session!.subredditContext).toBe(subreddit);
    });

    it('should enforce session limits per user', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';
      const maxSessions = 5;

      // Act - Create more sessions than the limit
      const sessionTokens: string[] = [];
      for (let i = 0; i < maxSessions + 2; i++) {
        const token = await sessionManager.createSession(username, 'testsubreddit');
        sessionTokens.push(token);
      }

      // Assert - Only the most recent sessions should be valid
      let validSessions = 0;
      for (const token of sessionTokens) {
        const session = sessionManager.getSession(token);
        if (session) {
          validSessions++;
        }
      }
      expect(validSessions).toBeLessThanOrEqual(maxSessions);
    });

    it('should set appropriate session expiration', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';
      const beforeCreation = new Date();

      // Act
      const sessionToken = await sessionManager.createSession(username, 'testsubreddit');

      // Assert
      const session = sessionManager.getSession(sessionToken);
      expect(session!.createdAt).toBeInstanceOf(Date);
      expect(session!.expiresAt).toBeInstanceOf(Date);
      expect(session!.expiresAt.getTime()).toBeGreaterThan(beforeCreation.getTime());
      
      // Should expire in approximately 24 hours
      const expectedExpiry = beforeCreation.getTime() + (24 * 60 * 60 * 1000);
      const actualExpiry = session!.expiresAt.getTime();
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('createAnonymousSession', () => {
    it('should create anonymous session with limited duration', () => {
      // Arrange
      const beforeCreation = new Date();

      // Act
      const sessionToken = sessionManager.createAnonymousSession('testsubreddit');

      // Assert
      expect(sessionToken).toBeDefined();
      expect(sessionToken).toMatch(/^sess_/);

      const session = sessionManager.getSession(sessionToken);
      expect(session).toBeDefined();
      expect(session!.isAnonymous).toBe(true);
      expect(session!.redditUsername).toBe('Anonymous');
      
      // Should expire in approximately 1 hour
      const expectedExpiry = beforeCreation.getTime() + (60 * 60 * 1000);
      const actualExpiry = session!.expiresAt.getTime();
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000);
    });

    it('should create unique anonymous sessions', () => {
      // Act
      const token1 = sessionManager.createAnonymousSession('testsubreddit');
      const token2 = sessionManager.createAnonymousSession('testsubreddit');

      // Assert
      const session1 = sessionManager.getSession(token1);
      const session2 = sessionManager.getSession(token2);
      
      expect(session1!.sessionId).not.toBe(session2!.sessionId);
      expect(session1!.sessionId).not.toBe(session2!.sessionId);
    });

    it('should set anonymous permissions correctly', () => {
      // Act
      const sessionToken = sessionManager.createAnonymousSession('testsubreddit');

      // Assert
      const session = sessionManager.getSession(sessionToken);
      expect(session!.permissions).toEqual({
        canCreateEvents: false,
        canModerate: false,
        canViewProfiles: false,
        canExportData: false
      });
    });
  });

  describe('validateSession', () => {
    it('should validate existing valid session', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';
      const sessionToken = await sessionManager.createSession(username, 'testsubreddit');

      // Act
      const validatedSession = await sessionManager.validateSession(sessionToken);

      // Assert
      expect(validatedSession).toBeDefined();
      expect(validatedSession!.isAnonymous).toBe(false);
      expect(validatedSession!.redditUsername).toBe(username);
      expect(validatedSession!.sessionId).toBe(sessionToken);
    });

    it('should return null for non-existent session', async () => {
      // Arrange
      const fakeToken = 'sess_fake_token_12345';

      // Act
      const result = await sessionManager.validateSession(fakeToken);

      // Assert
      expect(result).toBeNull();
    });

    it('should update last activity on validation', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';
      const sessionToken = await sessionManager.createSession(username, 'testsubreddit');
      
      const originalSession = sessionManager.getSession(sessionToken);
      const originalActivity = originalSession!.lastActivity;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      const validatedSession = await sessionManager.validateSession(sessionToken);

      // Assert
      expect(validatedSession!.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
    });

    it('should auto-refresh sessions close to expiry', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';
      const sessionToken = await sessionManager.createSession(username, 'testsubreddit');
      
      // Manually set session to be close to expiry
      const session = sessionManager.getSession(sessionToken);
      const nearExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      session!.expiresAt = nearExpiry;

      // Act
      const validatedSession = await sessionManager.validateSession(sessionToken);

      // Assert
      expect(validatedSession).toBeDefined();
      expect(validatedSession!.expiresAt.getTime()).toBeGreaterThan(nearExpiry.getTime());
    });

    it('should not auto-refresh anonymous sessions', async () => {
      // Arrange
      const sessionToken = sessionManager.createAnonymousSession('testsubreddit');
      const session = sessionManager.getSession(sessionToken);
      const originalExpiry = session!.expiresAt;
      
      // Set close to expiry
      session!.expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Act
      const validatedSession = await sessionManager.validateSession(sessionToken);

      // Assert
      expect(validatedSession!.expiresAt.getTime()).toBe(session!.expiresAt.getTime());
    });
  });

  describe('Security Features', () => {
    it('should track failed validation attempts', async () => {
      // Arrange
      const fakeToken = 'sess_fake_token_12345';

      // Act - Make multiple failed validation attempts
      for (let i = 0; i < 5; i++) {
        await sessionManager.validateSession(fakeToken);
      }

      // Assert - Token should still be rejected
      const result = await sessionManager.validateSession(fakeToken);
      expect(result).toBeNull();
    });

    it('should lock tokens after excessive failed attempts', async () => {
      // Arrange
      const fakeToken = 'sess_fake_token_12345';
      const maxAttempts = 10;

      // Act - Exceed maximum failed attempts
      for (let i = 0; i < maxAttempts + 1; i++) {
        await sessionManager.validateSession(fakeToken);
      }

      // Assert - Even if we create a real session with this token, it should be locked
      const userId = 'user123';
      const username = 'testuser';
      
      // Manually add a session with the locked token (simulating token collision)
      const lockedSession: UserSession = {
        sessionId: fakeToken,
        redditUsername: username,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastActivity: new Date(),
        subredditContext: 'testsubreddit',
        isAnonymous: false,
        permissions: {
          canCreateEvents: true,
          canModerate: false,
          canViewProfiles: true,
          canExportData: true
        }
      };
      
      (sessionManager as any).sessions.set(fakeToken, lockedSession);
      
      const result = await sessionManager.validateSession(fakeToken);
      expect(result).toBeNull(); // Should be locked
    });

    it('should generate cryptographically secure session IDs', async () => {
      // Arrange & Act
      const sessionTokens: string[] = [];
      for (let i = 0; i < 100; i++) {
        const token = await sessionManager.createSession(`user${i}`, `username${i}`);
        sessionTokens.push(token);
      }

      // Assert
      // All tokens should be unique
      const uniqueTokens = new Set(sessionTokens);
      expect(uniqueTokens.size).toBe(sessionTokens.length);

      // All tokens should follow expected format
      sessionTokens.forEach(token => {
        expect(token).toMatch(/^sess_[a-z0-9_]+$/);
        expect(token.length).toBeGreaterThan(30);
      });
    });

    it('should handle concurrent session operations safely', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';

      // Act - Create multiple sessions concurrently
      const promises = Array(10).fill(null).map((_, i) => 
        sessionManager.createSession(`${userId}_${i}`, `${username}_${i}`)
      );
      const sessionTokens = await Promise.all(promises);

      // Assert
      expect(sessionTokens).toHaveLength(10);
      
      // All tokens should be unique
      const uniqueTokens = new Set(sessionTokens);
      expect(uniqueTokens.size).toBe(10);

      // All sessions should be valid
      const validationPromises = sessionTokens.map(token => 
        sessionManager.validateSession(token)
      );
      const validatedSessions = await Promise.all(validationPromises);
      
      validatedSessions.forEach(session => {
        expect(session).toBeDefined();
      });
    });
  });

  describe('Session Management', () => {
    it('should invalidate specific session', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';
      const sessionToken = await sessionManager.createSession(username, 'testsubreddit');

      // Verify session exists
      expect(sessionManager.getSession(sessionToken)).toBeDefined();

      // Act
      await sessionManager.invalidateSession(sessionToken);

      // Assert
      expect(sessionManager.getSession(sessionToken)).toBeNull();
    });

    it('should invalidate all sessions for a user', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';
      const sessionTokens = [
        await sessionManager.createSession(username, 'testsubreddit'),
        await sessionManager.createSession(username, 'testsubreddit'),
        await sessionManager.createSession(username, 'testsubreddit')
      ];

      // Verify all sessions exist
      sessionTokens.forEach(token => {
        expect(sessionManager.getSession(token)).toBeDefined();
      });

      // Act
      await sessionManager.invalidateUserSessions(userId);

      // Assert
      sessionTokens.forEach(token => {
        expect(sessionManager.getSession(token)).toBeNull();
      });
    });

    it('should provide session statistics', async () => {
      // Arrange
      const userId1 = 'user1';
      const userId2 = 'user2';
      
      await sessionManager.createSession(userId1, 'username1');
      await sessionManager.createSession(userId2, 'username2');
      sessionManager.createAnonymousSession('testsubreddit');
      sessionManager.createAnonymousSession('testsubreddit');

      // Act
      const stats = sessionManager.getSessionStatistics();

      // Assert
      expect(stats.totalSessions).toBe(4);
      expect(stats.authenticatedSessions).toBe(2);
      expect(stats.anonymousSessions).toBe(2);
      expect(stats.lockedTokens).toBe(0);
      expect(stats.failedAttempts).toBe(0);
    });

    it('should force logout user and clean up security data', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';
      const sessionTokens = [
        await sessionManager.createSession(username, 'testsubreddit'),
        await sessionManager.createSession(username, 'testsubreddit')
      ];

      // Create some failed attempts for one of the tokens
      await sessionManager.validateSession('fake_token_for_user');

      // Act
      const removedCount = await sessionManager.forceUserLogout(userId);

      // Assert
      expect(removedCount).toBe(2);
      sessionTokens.forEach(token => {
        expect(sessionManager.getSession(token)).toBeNull();
      });
    });
  });

  describe('Session Expiry and Cleanup', () => {
    it('should reject expired sessions', async () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';
      const sessionToken = await sessionManager.createSession(username, 'testsubreddit');
      
      // Manually expire the session
      const session = sessionManager.getSession(sessionToken);
      session!.expiresAt = new Date(Date.now() - 1000); // 1 second ago

      // Act
      const result = await sessionManager.validateSession(sessionToken);

      // Assert
      expect(result).toBeNull();
      expect(sessionManager.getSession(sessionToken)).toBeNull(); // Should be cleaned up
    });

    it('should handle session cleanup gracefully', () => {
      // Arrange
      const userId = 'user123';
      const username = 'testuser';

      // Act & Assert - Should not throw during cleanup operations
      expect(() => {
        (sessionManager as any).cleanupExpiredSessions();
      }).not.toThrow();
    });
  });
});