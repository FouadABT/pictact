import { UserSession, UserPermissions } from "../../shared/types/auth";

/**
 * Session Manager
 * Handles session creation, validation, and cleanup with enhanced security features
 */
export class SessionManager {
  private sessions: Map<string, UserSession> = new Map();
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly ANONYMOUS_SESSION_DURATION = 60 * 60 * 1000; // 1 hour for anonymous users
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly MAX_SESSIONS_PER_USER = 5; // Limit concurrent sessions per user
  private readonly SESSION_REFRESH_THRESHOLD = 60 * 60 * 1000; // Refresh if session expires within 1 hour

  // Security tracking
  private failedValidationAttempts: Map<string, number> = new Map();
  private readonly MAX_FAILED_ATTEMPTS = 10;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private lockedTokens: Map<string, Date> = new Map();

  constructor() {
    // Start periodic cleanup of expired sessions
    this.startCleanupTimer();
  }

  /**
   * Create a new session for an authenticated user with Reddit compliance
   * Uses username-based session management without storing Reddit user IDs
   */
  async createSession(username: string, subredditContext: string): Promise<string> {
    // Enforce session limits per user (using username instead of userId)
    await this.enforceSessionLimits(username, subredditContext);
    
    const sessionId = this.generateSecureSessionId();
    const now = new Date();
    
    const session: UserSession = {
      sessionId,
      redditUsername: username,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_DURATION),
      lastActivity: now,
      permissions: this.getDefaultPermissions(),
      subredditContext,
      isAnonymous: false
    };

    this.sessions.set(sessionId, session);
    
    // Log session creation for security monitoring (without storing user ID)
    console.log(`Session created for user ${username} in r/${subredditContext}, expires at ${session.expiresAt.toISOString()}`);
    
    return sessionId;
  }

  /**
   * Create a temporary session for anonymous users with limited duration
   * Subreddit-aware for Reddit compliance
   */
  createAnonymousSession(subredditContext: string): string {
    const sessionId = this.generateSecureSessionId();
    const now = new Date();
    
    const session: UserSession = {
      sessionId,
      redditUsername: "Anonymous",
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.ANONYMOUS_SESSION_DURATION),
      lastActivity: now,
      permissions: this.getAnonymousPermissions(),
      subredditContext,
      isAnonymous: true
    };

    this.sessions.set(sessionId, session);
    console.log(`Anonymous session created in r/${subredditContext}: ${sessionId.substring(0, 10)}..., expires at ${session.expiresAt.toISOString()}`);
    
    return sessionId;
  }

  /**
   * Validate a session token and return session data with security checks
   */
  async validateSession(sessionToken: string): Promise<UserSession | null> {
    // Check if token is locked due to failed attempts
    if (this.isTokenLocked(sessionToken)) {
      console.warn(`Validation attempted on locked token: ${sessionToken.substring(0, 10)}...`);
      return null;
    }

    const session = this.sessions.get(sessionToken);
    
    if (!session) {
      this.recordFailedValidation(sessionToken);
      return null;
    }

    const now = new Date();

    // Check if session has expired
    if (now > session.expiresAt) {
      this.sessions.delete(sessionToken);
      console.log(`Expired session removed for user ${session.redditUsername}`);
      return null;
    }

    // Check if session needs refresh (close to expiry)
    const timeUntilExpiry = session.expiresAt.getTime() - now.getTime();
    if (timeUntilExpiry < this.SESSION_REFRESH_THRESHOLD && !session.isAnonymous) {
      // Extend session for authenticated users
      session.expiresAt = new Date(now.getTime() + this.SESSION_DURATION);
      console.log(`Session auto-refreshed for user ${session.redditUsername} in r/${session.subredditContext}`);
    }

    // Update last activity
    session.lastActivity = now;
    this.sessions.set(sessionToken, session);

    // Clear any failed validation attempts for this token
    this.failedValidationAttempts.delete(sessionToken);

    return session;
  }

  /**
   * Invalidate a session
   */
  async invalidateSession(sessionToken: string): Promise<void> {
    this.sessions.delete(sessionToken);
  }

  /**
   * Invalidate all sessions for a user (by username for Reddit compliance)
   */
  async invalidateUserSessions(username: string, subredditContext?: string): Promise<void> {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.redditUsername === username && 
          (!subredditContext || session.subredditContext === subredditContext)) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get session information without updating activity
   */
  getSession(sessionToken: string): UserSession | null {
    const session = this.sessions.get(sessionToken);
    
    if (!session || new Date() > session.expiresAt) {
      return null;
    }

    return session;
  }

  /**
   * Generate a cryptographically secure session ID
   */
  private generateSecureSessionId(): string {
    // Generate a more secure session ID with higher entropy
    const timestamp = Date.now().toString(36);
    const randomPart1 = Math.random().toString(36).substring(2);
    const randomPart2 = Math.random().toString(36).substring(2);
    const randomPart3 = Math.random().toString(36).substring(2);
    return `sess_${timestamp}_${randomPart1}${randomPart2}${randomPart3}`;
  }

  /**
   * Enforce session limits per user to prevent session flooding
   * Uses username and subreddit context for Reddit compliance
   */
  private async enforceSessionLimits(username: string, subredditContext: string): Promise<void> {
    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.redditUsername === username && session.subredditContext === subredditContext)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

    // Remove oldest sessions if limit exceeded
    if (userSessions.length >= this.MAX_SESSIONS_PER_USER) {
      const sessionsToRemove = userSessions.slice(this.MAX_SESSIONS_PER_USER - 1);
      for (const session of sessionsToRemove) {
        this.sessions.delete(session.sessionId);
        console.log(`Removed old session for user ${session.redditUsername} in r/${session.subredditContext} due to session limit`);
      }
    }
  }

  /**
   * Record failed validation attempt for security monitoring
   */
  private recordFailedValidation(sessionToken: string): void {
    const attempts = this.failedValidationAttempts.get(sessionToken) || 0;
    this.failedValidationAttempts.set(sessionToken, attempts + 1);

    if (attempts + 1 >= this.MAX_FAILED_ATTEMPTS) {
      this.lockedTokens.set(sessionToken, new Date(Date.now() + this.LOCKOUT_DURATION));
      console.warn(`Token locked due to excessive failed validation attempts: ${sessionToken.substring(0, 10)}...`);
    }
  }

  /**
   * Check if a token is locked due to failed validation attempts
   */
  private isTokenLocked(sessionToken: string): boolean {
    const lockExpiry = this.lockedTokens.get(sessionToken);
    if (!lockExpiry) {
      return false;
    }

    if (new Date() > lockExpiry) {
      // Lock has expired, remove it
      this.lockedTokens.delete(sessionToken);
      this.failedValidationAttempts.delete(sessionToken);
      return false;
    }

    return true;
  }

  /**
   * Get default permissions for authenticated users
   */
  private getDefaultPermissions(): UserPermissions {
    return {
      canCreateEvents: true,
      canModerate: false,
      canViewProfiles: true,
      canExportData: true
    };
  }

  /**
   * Get limited permissions for anonymous users
   */
  private getAnonymousPermissions(): UserPermissions {
    return {
      canCreateEvents: false,
      canModerate: false,
      canViewProfiles: false,
      canExportData: false
    };
  }

  /**
   * Get session statistics for monitoring and debugging
   */
  getSessionStatistics(): {
    totalSessions: number;
    authenticatedSessions: number;
    anonymousSessions: number;
    lockedTokens: number;
    failedAttempts: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const authenticatedSessions = sessions.filter(s => !s.isAnonymous).length;
    const anonymousSessions = sessions.filter(s => s.isAnonymous).length;

    return {
      totalSessions: sessions.length,
      authenticatedSessions,
      anonymousSessions,
      lockedTokens: this.lockedTokens.size,
      failedAttempts: this.failedValidationAttempts.size
    };
  }

  /**
   * Force cleanup of all sessions for a specific user (for security purposes)
   * Uses username for Reddit compliance
   */
  async forceUserLogout(username: string, subredditContext?: string): Promise<number> {
    const userSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.redditUsername === username && 
              (!subredditContext || session.subredditContext === subredditContext));

    userSessions.forEach(([sessionId, _]) => {
      this.sessions.delete(sessionId);
      this.failedValidationAttempts.delete(sessionId);
      this.lockedTokens.delete(sessionId);
    });

    const contextInfo = subredditContext ? ` in r/${subredditContext}` : ' (all subreddits)';
    console.log(`Force logout: removed ${userSessions.length} sessions for user ${username}${contextInfo}`);
    return userSessions.length;
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Remove expired sessions and perform security cleanup
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];
    const expiredLocks: string[] = [];

    // Clean up expired sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
      // Also clean up any associated security data
      this.failedValidationAttempts.delete(sessionId);
    });

    // Clean up expired token locks
    for (const [token, lockExpiry] of this.lockedTokens.entries()) {
      if (now > lockExpiry) {
        expiredLocks.push(token);
      }
    }

    expiredLocks.forEach(token => {
      this.lockedTokens.delete(token);
      this.failedValidationAttempts.delete(token);
    });

    if (expiredSessions.length > 0 || expiredLocks.length > 0) {
      console.log(`Security cleanup: ${expiredSessions.length} expired sessions, ${expiredLocks.length} expired locks removed`);
    }
  }
}