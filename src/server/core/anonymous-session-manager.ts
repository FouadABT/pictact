// Anonymous session manager - handles temporary sessions for anonymous users

import { AnonymousProfile } from "../../shared/types/profile.js";

/**
 * Anonymous Session Manager
 * Manages temporary sessions for users participating without persistent tracking
 */
export class AnonymousSessionManager {
  private anonymousSessions: Map<string, AnonymousProfile> = new Map();
  private readonly ANONYMOUS_SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  private readonly CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes cleanup interval
  private readonly MAX_ANONYMOUS_SESSIONS = 1000; // Prevent memory overflow

  constructor() {
    // Start periodic cleanup of expired anonymous sessions
    this.startCleanupTimer();
  }

  /**
   * Create a new anonymous session
   */
  createAnonymousSession(sessionId?: string): AnonymousProfile {
    // Clean up if we're approaching the session limit
    if (this.anonymousSessions.size >= this.MAX_ANONYMOUS_SESSIONS) {
      this.cleanupOldestSessions(100); // Remove 100 oldest sessions
    }

    const anonymousProfile: AnonymousProfile = {
      sessionId: sessionId || this.generateAnonymousSessionId(),
      temporaryStats: {
        sessionMatches: 0,
        sessionWins: 0,
        sessionPoints: 0
      },
      createdAt: new Date()
    };

    this.anonymousSessions.set(anonymousProfile.sessionId, anonymousProfile);
    
    console.log(`Anonymous session created: ${anonymousProfile.sessionId.substring(0, 15)}...`);
    return anonymousProfile;
  }

  /**
   * Get anonymous session by ID
   */
  getAnonymousSession(sessionId: string): AnonymousProfile | null {
    const session = this.anonymousSessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const sessionAge = now.getTime() - session.createdAt.getTime();
    
    if (sessionAge > this.ANONYMOUS_SESSION_DURATION) {
      this.anonymousSessions.delete(sessionId);
      console.log(`Expired anonymous session removed: ${sessionId.substring(0, 15)}...`);
      return null;
    }

    return session;
  }

  /**
   * Update anonymous session statistics
   */
  updateAnonymousStats(
    sessionId: string, 
    updates: {
      matchesPlayed?: number;
      wins?: number;
      points?: number;
    }
  ): AnonymousProfile | null {
    const session = this.getAnonymousSession(sessionId);
    
    if (!session) {
      return null;
    }

    // Update temporary statistics
    if (updates.matchesPlayed !== undefined) {
      session.temporaryStats.sessionMatches += updates.matchesPlayed;
    }
    
    if (updates.wins !== undefined) {
      session.temporaryStats.sessionWins += updates.wins;
    }
    
    if (updates.points !== undefined) {
      session.temporaryStats.sessionPoints += updates.points;
    }

    this.anonymousSessions.set(sessionId, session);
    return session;
  }

  /**
   * Record match result for anonymous user
   */
  recordAnonymousMatchResult(
    sessionId: string,
    matchResult: {
      won: boolean;
      points: number;
    }
  ): AnonymousProfile | null {
    return this.updateAnonymousStats(sessionId, {
      matchesPlayed: 1,
      wins: matchResult.won ? 1 : 0,
      points: matchResult.points
    });
  }

  /**
   * Delete anonymous session
   */
  deleteAnonymousSession(sessionId: string): void {
    this.anonymousSessions.delete(sessionId);
    console.log(`Anonymous session deleted: ${sessionId.substring(0, 15)}...`);
  }

  /**
   * Check if a session ID belongs to an anonymous user
   */
  isAnonymousSession(sessionId: string): boolean {
    return sessionId.startsWith('anon_') || this.anonymousSessions.has(sessionId);
  }

  /**
   * Get anonymous session statistics for monitoring
   */
  getAnonymousSessionStatistics(): {
    totalAnonymousSessions: number;
    averageSessionAge: number;
    totalAnonymousMatches: number;
    totalAnonymousPoints: number;
  } {
    const sessions = Array.from(this.anonymousSessions.values());
    const now = new Date();
    
    let totalMatches = 0;
    let totalPoints = 0;
    let totalAge = 0;

    for (const session of sessions) {
      totalMatches += session.temporaryStats.sessionMatches;
      totalPoints += session.temporaryStats.sessionPoints;
      totalAge += now.getTime() - session.createdAt.getTime();
    }

    return {
      totalAnonymousSessions: sessions.length,
      averageSessionAge: sessions.length > 0 ? totalAge / sessions.length : 0,
      totalAnonymousMatches: totalMatches,
      totalAnonymousPoints: totalPoints
    };
  }

  /**
   * Convert anonymous session to authenticated profile data
   * Used when anonymous user decides to create an account
   */
  convertAnonymousToAuthenticated(sessionId: string): {
    matches: number;
    wins: number;
    points: number;
  } | null {
    const session = this.getAnonymousSession(sessionId);
    
    if (!session) {
      return null;
    }

    const conversionData = {
      matches: session.temporaryStats.sessionMatches,
      wins: session.temporaryStats.sessionWins,
      points: session.temporaryStats.sessionPoints
    };

    // Remove the anonymous session after conversion
    this.deleteAnonymousSession(sessionId);
    
    console.log(`Anonymous session converted to authenticated: ${sessionId.substring(0, 15)}...`);
    return conversionData;
  }

  /**
   * Check if anonymous participation is allowed based on privacy settings
   */
  isAnonymousParticipationAllowed(allowAnonymousMode: boolean): boolean {
    return allowAnonymousMode;
  }

  // Private helper methods

  /**
   * Generate a unique anonymous session ID
   */
  private generateAnonymousSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart1 = Math.random().toString(36).substring(2);
    const randomPart2 = Math.random().toString(36).substring(2);
    return `anon_${timestamp}_${randomPart1}${randomPart2}`;
  }

  /**
   * Start periodic cleanup of expired anonymous sessions
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Remove expired anonymous sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.anonymousSessions.entries()) {
      const sessionAge = now.getTime() - session.createdAt.getTime();
      
      if (sessionAge > this.ANONYMOUS_SESSION_DURATION) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.anonymousSessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`Anonymous session cleanup: ${expiredSessions.length} expired sessions removed`);
    }
  }

  /**
   * Remove oldest sessions to prevent memory overflow
   */
  private cleanupOldestSessions(count: number): void {
    const sessions = Array.from(this.anonymousSessions.entries())
      .sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, count);

    sessions.forEach(([sessionId]) => {
      this.anonymousSessions.delete(sessionId);
    });

    console.log(`Anonymous session cleanup: ${sessions.length} oldest sessions removed to prevent overflow`);
  }
}