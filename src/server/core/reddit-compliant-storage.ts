/**
 * Reddit-Compliant Storage Service
 * Handles data storage that complies with Reddit's privacy and platform requirements
 */

import {
  RedditCompliantProfile,
  RedditCompliantSession,
  RedditGameData,
  SubredditGameStats,
  RedditCompliantTrophy,
  RedditCompliantBadge,
  SubredditDataKeys,
  GameStatus,
  RedditCompliantPrivacySettings,
  RedditCompliantPreferences,
  RedditCompliantGameStats
} from "../../shared/types/reddit-compliant-data.js";

/**
 * Reddit-Compliant Profile Storage Service
 * Implements subreddit-isolated data storage with Reddit ID redaction
 */
export class RedditCompliantStorageService {
  // In-memory storage (placeholder for Devvit KV store)
  private static profiles: Map<string, string> = new Map();
  private static sessions: Map<string, string> = new Map();
  private static gameData: Map<string, string> = new Map();
  private static subredditData: Map<string, string> = new Map();
  private static profileIndex: string[] = [];

  // Storage version for data migration
  private static readonly STORAGE_VERSION = 2;
  private static readonly REDDIT_COMPLIANT_VERSION = 1;

  // Key patterns for subreddit data isolation
  private static readonly keyPatterns: SubredditDataKeys = {
    subredditProfile: (subreddit: string, profileId: string) => 
      `subreddit:${subreddit}:profile:${profileId}`,
    subredditGame: (subreddit: string, gameId: string) => 
      `subreddit:${subreddit}:game:${gameId}`,
    subredditStats: (subreddit: string, profileId: string) => 
      `subreddit:${subreddit}:stats:${profileId}`,
    subredditLeaderboard: (subreddit: string) => 
      `subreddit:${subreddit}:leaderboard`,
    subredditSettings: (subreddit: string) => 
      `subreddit:${subreddit}:settings`
  };

  /**
   * Clear all storage (for testing)
   */
  static clearAllData(): void {
    RedditCompliantStorageService.profiles.clear();
    RedditCompliantStorageService.sessions.clear();
    RedditCompliantStorageService.gameData.clear();
    RedditCompliantStorageService.subredditData.clear();
    RedditCompliantStorageService.profileIndex.length = 0;
  }

  /**
   * Create a Reddit-compliant profile
   * Never stores Reddit user IDs or personal information
   */
  async createRedditCompliantProfile(
    displayName?: string,
    subredditContext?: string
  ): Promise<RedditCompliantProfile> {
    const now = new Date();
    const profileId = this.generateProfileId(); // App-generated UUID

    const profile: RedditCompliantProfile = {
      profileId,
      displayName,
      createdAt: now,
      lastActiveAt: now,
      lastProfileUpdate: now,
      gameStats: this.createDefaultGameStats(),
      privacySettings: this.createDefaultRedditCompliantPrivacySettings(),
      preferences: this.createDefaultRedditCompliantPreferences(),
      trophyCollection: [],
      badges: [],
      profileVersion: RedditCompliantStorageService.REDDIT_COMPLIANT_VERSION
    };

    try {
      // Store the profile
      const profileKey = this.getProfileKey(profileId);
      this.storeProfileAtomic(profileKey, profile);

      // Add to profile index
      this.addToProfileIndex(profileId);

      // If subreddit context provided, initialize subreddit-specific data
      if (subredditContext) {
        await this.initializeSubredditData(profileId, subredditContext);
      }

      console.log(`Reddit-compliant profile created: ${profileId}`);
      return profile;
    } catch (error) {
      console.error(`Failed to create Reddit-compliant profile:`, error);
      throw new Error(`Profile creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get Reddit-compliant profile by profile ID
   */
  async getRedditCompliantProfile(profileId: string): Promise<RedditCompliantProfile | null> {
    try {
      const profileKey = this.getProfileKey(profileId);
      const profileData = RedditCompliantStorageService.profiles.get(profileKey);
      
      if (!profileData) {
        return null;
      }

      return this.deserializeProfile(profileData);
    } catch (error) {
      console.error(`Failed to get Reddit-compliant profile ${profileId}:`, error);
      return null;
    }
  }

  /**
   * Update Reddit-compliant profile
   */
  async updateRedditCompliantProfile(
    profileId: string,
    updates: Partial<RedditCompliantProfile>
  ): Promise<RedditCompliantProfile> {
    try {
      const existingProfile = await this.getRedditCompliantProfile(profileId);
      if (!existingProfile) {
        throw new Error(`Profile not found: ${profileId}`);
      }

      const updatedProfile: RedditCompliantProfile = {
        ...existingProfile,
        ...updates,
        profileId: existingProfile.profileId, // Never allow profileId changes
        lastProfileUpdate: new Date(),
        // Merge nested objects properly
        gameStats: updates.gameStats ? 
          { ...existingProfile.gameStats, ...updates.gameStats } :
          existingProfile.gameStats,
        privacySettings: updates.privacySettings ?
          { ...existingProfile.privacySettings, ...updates.privacySettings } :
          existingProfile.privacySettings,
        preferences: updates.preferences ?
          { ...existingProfile.preferences, ...updates.preferences } :
          existingProfile.preferences
      };

      // Store the updated profile
      const profileKey = this.getProfileKey(profileId);
      this.storeProfileAtomic(profileKey, updatedProfile);

      console.log(`Reddit-compliant profile updated: ${profileId}`);
      return updatedProfile;
    } catch (error) {
      console.error(`Failed to update Reddit-compliant profile ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Delete Reddit-compliant profile with proper data cleanup
   */
  async deleteRedditCompliantProfile(profileId: string): Promise<void> {
    try {
      const profile = await this.getRedditCompliantProfile(profileId);
      if (!profile) {
        console.warn(`Profile not found for deletion: ${profileId}`);
        return;
      }

      // Delete subreddit-specific data
      for (const subredditName of profile.gameStats.subredditStats.keys()) {
        await this.deleteSubredditData(profileId, subredditName);
      }

      // Delete main profile
      const profileKey = this.getProfileKey(profileId);
      RedditCompliantStorageService.profiles.delete(profileKey);

      // Remove from profile index
      this.removeFromProfileIndex(profileId);

      console.log(`Reddit-compliant profile deleted: ${profileId}`);
    } catch (error) {
      console.error(`Failed to delete Reddit-compliant profile ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Get subreddit-specific profile data
   */
  async getSubredditProfile(profileId: string, subreddit: string): Promise<SubredditGameStats | null> {
    try {
      const subredditKey = RedditCompliantStorageService.keyPatterns.subredditProfile(subreddit, profileId);
      const subredditData = RedditCompliantStorageService.subredditData.get(subredditKey);
      
      if (!subredditData) {
        return null;
      }

      return JSON.parse(subredditData) as SubredditGameStats;
    } catch (error) {
      console.error(`Failed to get subreddit profile for ${profileId} in ${subreddit}:`, error);
      return null;
    }
  }

  /**
   * Update subreddit-specific profile data
   */
  async updateSubredditProfile(
    profileId: string, 
    subreddit: string, 
    stats: SubredditGameStats
  ): Promise<void> {
    try {
      // Store subreddit-specific data
      const subredditKey = RedditCompliantStorageService.keyPatterns.subredditProfile(subreddit, profileId);
      RedditCompliantStorageService.subredditData.set(subredditKey, JSON.stringify(stats));

      // Update main profile's subreddit stats
      const profile = await this.getRedditCompliantProfile(profileId);
      if (profile) {
        profile.gameStats.subredditStats.set(subreddit, stats);
        profile.lastActiveAt = new Date();
        
        const profileKey = this.getProfileKey(profileId);
        this.storeProfileAtomic(profileKey, profile);
      }

      console.log(`Subreddit profile updated for ${profileId} in ${subreddit}`);
    } catch (error) {
      console.error(`Failed to update subreddit profile for ${profileId} in ${subreddit}:`, error);
      throw error;
    }
  }

  /**
   * Create Reddit-compliant session
   */
  async createRedditCompliantSession(
    profileId: string,
    subredditContext: string,
    isAnonymous: boolean = false
  ): Promise<RedditCompliantSession> {
    const now = new Date();
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

    const session: RedditCompliantSession = {
      sessionId,
      profileId,
      currentSubreddit: subredditContext,
      createdAt: now,
      lastActiveAt: now,
      expiresAt,
      temporaryStats: {
        sessionMatches: 0,
        sessionWins: 0,
        sessionPoints: 0
      },
      isAnonymous,
      subredditContext
    };

    try {
      const sessionKey = this.getSessionKey(sessionId);
      RedditCompliantStorageService.sessions.set(sessionKey, JSON.stringify(session));

      console.log(`Reddit-compliant session created: ${sessionId}`);
      return session;
    } catch (error) {
      console.error(`Failed to create Reddit-compliant session:`, error);
      throw error;
    }
  }

  /**
   * Get Reddit-compliant session
   */
  async getRedditCompliantSession(sessionId: string): Promise<RedditCompliantSession | null> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const sessionData = RedditCompliantStorageService.sessions.get(sessionKey);
      
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData) as RedditCompliantSession;
      
      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        await this.deleteSession(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      console.error(`Failed to get Reddit-compliant session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const session = await this.getRedditCompliantSession(sessionId);
      if (!session) {
        return;
      }

      session.lastActiveAt = new Date();
      
      const sessionKey = this.getSessionKey(sessionId);
      RedditCompliantStorageService.sessions.set(sessionKey, JSON.stringify(session));
    } catch (error) {
      console.error(`Failed to update session activity for ${sessionId}:`, error);
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      RedditCompliantStorageService.sessions.delete(sessionKey);
      console.log(`Session deleted: ${sessionId}`);
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);
    }
  }

  /**
   * Store Reddit-compliant game data with subreddit isolation
   */
  async storeGameData(gameData: RedditGameData): Promise<void> {
    try {
      const gameKey = RedditCompliantStorageService.keyPatterns.subredditGame(
        gameData.subredditContext, 
        gameData.gameId
      );
      
      RedditCompliantStorageService.gameData.set(gameKey, JSON.stringify(gameData));
      console.log(`Game data stored: ${gameData.gameId} in ${gameData.subredditContext}`);
    } catch (error) {
      console.error(`Failed to store game data for ${gameData.gameId}:`, error);
      throw error;
    }
  }

  /**
   * Get Reddit-compliant game data
   */
  async getGameData(subreddit: string, gameId: string): Promise<RedditGameData | null> {
    try {
      const gameKey = RedditCompliantStorageService.keyPatterns.subredditGame(subreddit, gameId);
      const gameDataStr = RedditCompliantStorageService.gameData.get(gameKey);
      
      if (!gameDataStr) {
        return null;
      }

      return JSON.parse(gameDataStr) as RedditGameData;
    } catch (error) {
      console.error(`Failed to get game data for ${gameId} in ${subreddit}:`, error);
      return null;
    }
  }

  /**
   * Add trophy to Reddit-compliant profile
   */
  async addTrophy(profileId: string, trophy: RedditCompliantTrophy): Promise<void> {
    try {
      const profile = await this.getRedditCompliantProfile(profileId);
      if (!profile) {
        throw new Error(`Profile not found: ${profileId}`);
      }

      // Check if trophy already exists
      const existingTrophy = profile.trophyCollection.find(t => t.id === trophy.id);
      if (existingTrophy) {
        console.warn(`Trophy ${trophy.id} already exists for profile ${profileId}`);
        return;
      }

      profile.trophyCollection.push(trophy);
      profile.lastProfileUpdate = new Date();

      const profileKey = this.getProfileKey(profileId);
      this.storeProfileAtomic(profileKey, profile);

      // If trophy is subreddit-specific, also update subreddit data
      if (trophy.subredditEarned) {
        const subredditStats = profile.gameStats.subredditStats.get(trophy.subredditEarned);
        if (subredditStats) {
          subredditStats.trophies.push(trophy);
          await this.updateSubredditProfile(profileId, trophy.subredditEarned, subredditStats);
        }
      }

      console.log(`Trophy ${trophy.id} added to profile ${profileId}`);
    } catch (error) {
      console.error(`Failed to add trophy to profile ${profileId}:`, error);
      throw error;
    }
  }

  // Private helper methods

  private generateProfileId(): string {
    // Generate a UUID-like identifier that's not based on Reddit user ID
    return 'profile_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateSessionId(): string {
    return 'session_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private getProfileKey(profileId: string): string {
    return `reddit_compliant_profile:${profileId}`;
  }

  private getSessionKey(sessionId: string): string {
    return `reddit_compliant_session:${sessionId}`;
  }

  private storeProfileAtomic(key: string, profile: RedditCompliantProfile): void {
    const serializedProfile = this.serializeProfile(profile);
    RedditCompliantStorageService.profiles.set(key, serializedProfile);
  }

  private serializeProfile(profile: RedditCompliantProfile): string {
    // Convert Map to object for JSON serialization
    const serializable = {
      ...profile,
      gameStats: {
        ...profile.gameStats,
        subredditStats: Object.fromEntries(profile.gameStats.subredditStats)
      }
    };
    return JSON.stringify(serializable);
  }

  private deserializeProfile(data: string): RedditCompliantProfile {
    const parsed = JSON.parse(data);
    
    // Convert dates back to Date objects and restore Maps
    const profile: RedditCompliantProfile = {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      lastActiveAt: new Date(parsed.lastActiveAt),
      lastProfileUpdate: new Date(parsed.lastProfileUpdate),
      gameStats: {
        ...parsed.gameStats,
        firstGameDate: new Date(parsed.gameStats.firstGameDate),
        lastGameDate: new Date(parsed.gameStats.lastGameDate),
        subredditStats: new Map(Object.entries(parsed.gameStats.subredditStats || {}))
      },
      trophyCollection: parsed.trophyCollection.map((trophy: any) => ({
        ...trophy,
        earnedAt: new Date(trophy.earnedAt)
      })),
      badges: parsed.badges.map((badge: any) => ({
        ...badge,
        earnedAt: new Date(badge.earnedAt)
      }))
    };

    return profile;
  }

  private createDefaultGameStats(): RedditCompliantGameStats {
    const now = new Date();
    return {
      totalMatches: 0,
      totalWins: 0,
      totalPoints: 0,
      averageSolveTime: 0,
      winRate: 0,
      bestStreak: 0,
      currentStreak: 0,
      totalPlayTime: 0,
      subredditStats: new Map<string, SubredditGameStats>(),
      firstGameDate: now,
      lastGameDate: now
    };
  }

  private createDefaultRedditCompliantPrivacySettings(): RedditCompliantPrivacySettings {
    return {
      profileVisibility: 'subreddit',
      allowCrossSubredditStats: false,
      allowDataExport: true,
      allowAnonymousMode: true,
      autoDeleteInactiveData: false,
      redactRedditIdentifiers: true, // Always true for compliance
      isolateSubredditData: true // Always true for compliance
    };
  }

  private createDefaultRedditCompliantPreferences(): RedditCompliantPreferences {
    return {
      gameSettings: {
        defaultDifficulty: 'medium',
        autoJoinEvents: false,
        showHints: true,
        preferredThemes: [],
        maxConcurrentGames: 3,
        useRedditTheme: true,
        integrateWithRedditNotifications: true
      },
      accessibility: {
        reducedMotion: false,
        highContrast: false,
        largeText: false,
        screenReaderOptimized: false,
        colorBlindFriendly: false
      },
      notifications: {
        redditNotifications: true,
        gameStartReminders: true,
        achievementAlerts: true,
        weeklyDigest: false,
        frequency: 'immediate'
      }
    };
  }

  private async initializeSubredditData(profileId: string, subreddit: string): Promise<void> {
    const now = new Date();
    const subredditStats: SubredditGameStats = {
      subredditName: subreddit,
      joinedAt: now,
      lastActiveAt: now,
      matches: 0,
      wins: 0,
      points: 0,
      rank: 0,
      winRate: 0,
      averageSolveTime: 0,
      bestStreak: 0,
      currentStreak: 0,
      trophies: [],
      specialBadges: []
    };

    await this.updateSubredditProfile(profileId, subreddit, subredditStats);
  }

  private async deleteSubredditData(profileId: string, subreddit: string): Promise<void> {
    const subredditKey = RedditCompliantStorageService.keyPatterns.subredditProfile(subreddit, profileId);
    RedditCompliantStorageService.subredditData.delete(subredditKey);
    
    const statsKey = RedditCompliantStorageService.keyPatterns.subredditStats(subreddit, profileId);
    RedditCompliantStorageService.subredditData.delete(statsKey);
  }

  private addToProfileIndex(profileId: string): void {
    if (!RedditCompliantStorageService.profileIndex.includes(profileId)) {
      RedditCompliantStorageService.profileIndex.push(profileId);
    }
  }

  private removeFromProfileIndex(profileId: string): void {
    RedditCompliantStorageService.profileIndex = 
      RedditCompliantStorageService.profileIndex.filter(id => id !== profileId);
  }
}