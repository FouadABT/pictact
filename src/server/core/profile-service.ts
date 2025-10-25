// Profile service - high-level profile management

import { ProfileStorageService } from "./profile-storage.js";
import { RedditCompliantStorageService } from "./reddit-compliant-storage.js";
import { RedditDataMigrationService } from "./reddit-data-migration.js";
import { CrossSubredditManager, AggregatedStats } from "./cross-subreddit-manager.js";
import { PrivacyService } from "./privacy-service.js";
import { 
  UserProfile, 
  CreateProfileRequest, 
  ProfileUpdates, 
  PublicProfile,
  AnonymousProfile,
  ProfileExport,
  GlobalProfile,
  SubredditStats,
  Trophy,
  LifetimeStatistics,
  PrivacySettings
} from "../../shared/types/profile.js";
import {
  RedditCompliantProfile,
  RedditCompliantSession,
  SubredditGameStats,
  RedditCompliantExport
} from "../../shared/types/reddit-compliant-data.js";
import { AuthenticatedUser } from "../../shared/types/auth.js";

/**
 * Profile Service
 * High-level service for managing user profiles with business logic
 */
export class ProfileService {
  private storage: ProfileStorageService;
  private redditCompliantStorage: RedditCompliantStorageService;
  private migrationService: RedditDataMigrationService;
  private crossSubredditManager: CrossSubredditManager;
  private privacyService: PrivacyService;

  constructor() {
    this.storage = new ProfileStorageService();
    this.redditCompliantStorage = new RedditCompliantStorageService();
    this.migrationService = new RedditDataMigrationService();
    this.crossSubredditManager = new CrossSubredditManager();
    this.privacyService = new PrivacyService();
  }

  /**
   * Get or create profile for authenticated user
   */
  async getOrCreateProfile(user: AuthenticatedUser): Promise<UserProfile> {
    try {
      // Try to get existing profile
      let profile = await this.storage.getProfile(user.redditUserId);
      
      if (!profile) {
        // Create new profile for first-time user
        const createRequest: CreateProfileRequest = {
          userId: user.redditUserId,
          redditUsername: user.redditUsername
        };
        
        profile = await this.storage.createProfile(createRequest);
        console.log(`New profile created for user: ${user.redditUsername}`);
      } else {
        // Update last active time
        profile.lastActiveAt = new Date();
        await this.storage.updateProfile(user.redditUserId, { 
          preferences: profile.preferences 
        });
      }

      return profile;
    } catch (error) {
      console.error(`Failed to get or create profile for user ${user.redditUsername}:`, error);
      throw new Error(`Profile service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.storage.getProfile(userId);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: ProfileUpdates): Promise<UserProfile> {
    // Validate privacy settings if they're being updated
    if (updates.privacySettings) {
      updates.privacySettings = this.privacyService.validatePrivacySettings(updates.privacySettings);
    }
    
    return this.storage.updateProfile(userId, updates);
  }

  /**
   * Update privacy settings for a user
   */
  async updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<UserProfile> {
    const validatedSettings = this.privacyService.validatePrivacySettings(settings);
    return this.storage.updateProfile(userId, { privacySettings: validatedSettings });
  }

  /**
   * Get public profile (filtered based on privacy settings)
   */
  async getPublicProfile(userId: string, viewerId?: string): Promise<PublicProfile | null> {
    try {
      const profile = await this.storage.getProfile(userId);
      if (!profile) {
        return null;
      }

      // Apply privacy filtering using PrivacyService
      return this.privacyService.getVisibleProfile(userId, profile, viewerId);
    } catch (error) {
      console.error(`Failed to get public profile for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Create anonymous profile for temporary users
   */
  createAnonymousProfile(sessionId?: string): AnonymousProfile {
    return this.privacyService.createAnonymousProfile(sessionId);
  }

  /**
   * Get anonymous session by ID
   */
  getAnonymousSession(sessionId: string): AnonymousProfile | null {
    return this.privacyService.getAnonymousSession(sessionId);
  }

  /**
   * Update anonymous session statistics
   */
  updateAnonymousStats(
    sessionId: string, 
    updates: { matchesPlayed?: number; wins?: number; points?: number }
  ): AnonymousProfile | null {
    return this.privacyService.updateAnonymousStats(sessionId, updates);
  }

  /**
   * Record match result for anonymous user
   */
  recordAnonymousMatchResult(
    sessionId: string,
    matchResult: { won: boolean; points: number }
  ): AnonymousProfile | null {
    return this.privacyService.recordAnonymousMatchResult(sessionId, matchResult);
  }

  /**
   * Check if user can participate anonymously
   */
  canParticipateAnonymously(userId?: string): boolean {
    // If no user ID provided, anonymous participation is allowed
    if (!userId) {
      return true;
    }

    // For authenticated users, check their privacy settings
    // This would need to be implemented when we have access to user's privacy settings
    return true; // Default to allowing anonymous participation
  }

  /**
   * Convert anonymous session to authenticated profile
   * Used when anonymous user decides to create an account
   */
  async convertAnonymousToAuthenticated(
    sessionId: string, 
    user: AuthenticatedUser
  ): Promise<UserProfile | null> {
    try {
      // Get anonymous session data
      const conversionData = this.privacyService.convertAnonymousToAuthenticated(sessionId);
      
      if (!conversionData) {
        console.warn(`No anonymous session found for conversion: ${sessionId}`);
        return null;
      }

      // Create new authenticated profile
      const profile = await this.getOrCreateProfile(user);

      // Add anonymous session stats to the new profile
      if (conversionData.matches > 0) {
        await this.updateLifetimeStats(profile.userId, {
          won: conversionData.wins > 0,
          points: conversionData.points,
          solveTime: 0, // We don't track solve time for anonymous users
        });
      }

      console.log(`Anonymous session converted to authenticated profile for user: ${user.redditUsername}`);
      return profile;
    } catch (error) {
      console.error(`Failed to convert anonymous session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Export user profile data
   */
  async exportProfile(userId: string): Promise<ProfileExport> {
    try {
      const profile = await this.storage.getProfile(userId);
      if (!profile) {
        throw new Error(`Profile not found for user: ${userId}`);
      }

      // Check if user allows data export
      if (!profile.privacySettings.allowDataExport) {
        throw new Error('User has disabled data export');
      }

      const exportData: ProfileExport = {
        exportedAt: new Date(),
        exportVersion: '1.0',
        userData: {
          profile,
          matchHistory: [], // Will be populated when match system is implemented
          achievements: profile.trophyCollection,
          badges: profile.badges
        },
        metadata: {
          totalDataSize: JSON.stringify(profile).length,
          exportFormat: 'json',
          includesPersonalData: true
        }
      };

      return exportData;
    } catch (error) {
      console.error(`Failed to export profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete user profile and all associated data
   */
  async deleteProfile(userId: string): Promise<void> {
    try {
      const profile = await this.storage.getProfile(userId);
      if (!profile) {
        console.warn(`Attempted to delete non-existent profile for user: ${userId}`);
        return;
      }

      await this.storage.deleteProfile(userId);
      console.log(`Profile and all associated data deleted for user: ${userId}`);
    } catch (error) {
      console.error(`Failed to delete profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get cross-subreddit identity information
   */
  async getCrossSubredditIdentity(userId: string): Promise<GlobalProfile | null> {
    return this.crossSubredditManager.getGlobalProfile(userId);
  }

  /**
   * Get subreddit-specific profile data
   */
  async getSubredditProfile(userId: string, subredditName: string): Promise<SubredditStats | null> {
    return this.crossSubredditManager.getSubredditProfile(userId, subredditName);
  }

  /**
   * Get aggregated statistics across all subreddits
   */
  async getAggregatedStats(userId: string): Promise<AggregatedStats> {
    return this.crossSubredditManager.aggregateStats(userId);
  }

  /**
   * Synchronize user profiles across all subreddits
   */
  async syncCrossSubredditProfiles(userId: string): Promise<void> {
    return this.crossSubredditManager.syncProfiles(userId);
  }

  /**
   * Record user activity in a specific subreddit
   */
  async recordSubredditActivity(
    userId: string, 
    subredditName: string, 
    activity: { matchesPlayed?: number; wins?: number; points?: number; newRank?: number }
  ): Promise<void> {
    return this.crossSubredditManager.recordSubredditActivity(userId, subredditName, activity);
  }

  /**
   * Get cross-subreddit leaderboard
   */
  async getCrossSubredditLeaderboard(limit: number = 10) {
    return this.crossSubredditManager.getCrossSubredditLeaderboard(limit);
  }

  /**
   * Update subreddit-specific statistics
   */
  async updateSubredditStats(userId: string, subredditName: string, stats: Partial<SubredditStats>): Promise<void> {
    try {
      await this.crossSubredditManager.createOrUpdateSubredditProfile(userId, subredditName, stats);
      
      // Sync global profile statistics
      await this.crossSubredditManager.syncProfiles(userId);
    } catch (error) {
      console.error(`Failed to update subreddit stats for user ${userId} in ${subredditName}:`, error);
      throw error;
    }
  }

  /**
   * Award trophy to user
   */
  async awardTrophy(userId: string, trophy: Trophy): Promise<void> {
    try {
      await this.storage.addTrophy(userId, trophy);
      
      // Update global statistics
      await this.updateGlobalStatistics(userId);
      
      console.log(`Trophy ${trophy.name} awarded to user ${userId}`);
    } catch (error) {
      console.error(`Failed to award trophy to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update lifetime statistics after a match
   */
  async updateLifetimeStats(userId: string, matchResult: {
    won: boolean;
    points: number;
    solveTime: number;
    theme?: string;
    subreddit?: string;
  }): Promise<void> {
    try {
      const profile = await this.storage.getProfile(userId);
      if (!profile) {
        throw new Error(`Profile not found for user: ${userId}`);
      }

      const stats = profile.lifetimeStats;
      const newTotalMatches = stats.totalMatches + 1;
      const newTotalWins = matchResult.won ? stats.totalWins + 1 : stats.totalWins;
      const newTotalPoints = stats.totalPoints + matchResult.points;

      // Calculate new averages
      const newWinRate = newTotalWins / newTotalMatches;
      const newAverageSolveTime = ((stats.averageSolveTime * stats.totalMatches) + matchResult.solveTime) / newTotalMatches;

      // Update streaks
      let newCurrentStreak = matchResult.won ? stats.currentStreak + 1 : 0;
      let newBestStreak = Math.max(stats.bestStreak, newCurrentStreak);

      // Update favorite themes
      const favoriteThemes = [...stats.favoriteThemes];
      if (matchResult.theme && !favoriteThemes.includes(matchResult.theme)) {
        favoriteThemes.push(matchResult.theme);
      }

      // Update most active subreddits
      const mostActiveSubreddits = [...stats.mostActiveSubreddits];
      if (matchResult.subreddit && !mostActiveSubreddits.includes(matchResult.subreddit)) {
        mostActiveSubreddits.push(matchResult.subreddit);
      }

      const updatedStats: Partial<LifetimeStatistics> = {
        totalMatches: newTotalMatches,
        totalWins: newTotalWins,
        totalPoints: newTotalPoints,
        winRate: newWinRate,
        averageSolveTime: newAverageSolveTime,
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak,
        favoriteThemes,
        mostActiveSubreddits,
        lastGameDate: new Date()
      };

      await this.storage.updateLifetimeStats(userId, updatedStats);
      
      // Update global statistics
      await this.updateGlobalStatistics(userId);
      
      console.log(`Lifetime stats updated for user ${userId}`);
    } catch (error) {
      console.error(`Failed to update lifetime stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user profiles for leaderboard (respects privacy settings)
   */
  async getLeaderboardProfiles(limit: number = 10): Promise<PublicProfile[]> {
    try {
      const allUserIds = await this.storage.getAllUserIds();
      const profiles: PublicProfile[] = [];

      for (const userId of allUserIds) {
        const publicProfile = await this.getPublicProfile(userId);
        if (publicProfile && publicProfile.lifetimeStats) {
          profiles.push(publicProfile);
        }
      }

      // Sort by total points and return top profiles
      return profiles
        .sort((a, b) => (b.lifetimeStats?.totalPoints || 0) - (a.lifetimeStats?.totalPoints || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get leaderboard profiles:', error);
      return [];
    }
  }

  // Private helper methods



  /**
   * Update global statistics by aggregating from all subreddits
   */
  private async updateGlobalStatistics(userId: string): Promise<void> {
    try {
      const profile = await this.storage.getProfile(userId);
      if (!profile) {
        return;
      }

      // Aggregate statistics from all subreddits
      let totalMatches = 0;
      let totalWins = 0;
      const subredditParticipation: SubredditStats[] = [];

      for (const [, stats] of profile.subredditStats) {
        totalMatches += stats.matches;
        totalWins += stats.wins;
        subredditParticipation.push(stats);
      }

      // Use lifetime stats if no subreddit-specific data
      if (totalMatches === 0) {
        totalMatches = profile.lifetimeStats.totalMatches;
        totalWins = profile.lifetimeStats.totalWins;
      }

      const globalUpdate: Partial<GlobalProfile> = {
        totalMatches,
        totalWins,
        subredditParticipation,
        // Global ranking would be calculated separately in a real system
        globalRanking: 0
      };

      await this.storage.updateGlobalProfile(userId, globalUpdate);
    } catch (error) {
      console.error(`Failed to update global statistics for user ${userId}:`, error);
      // Don't throw - this is not critical
    }
  }

  // Reddit-Compliant Profile Methods

  /**
   * Create a Reddit-compliant profile
   * Does not store Reddit user IDs or personal information
   */
  async createRedditCompliantProfile(
    displayName?: string,
    subredditContext?: string
  ): Promise<RedditCompliantProfile> {
    try {
      const profile = await this.redditCompliantStorage.createRedditCompliantProfile(
        displayName,
        subredditContext
      );

      console.log(`Reddit-compliant profile created: ${profile.profileId}`);
      return profile;
    } catch (error) {
      console.error('Failed to create Reddit-compliant profile:', error);
      throw error;
    }
  }

  /**
   * Get Reddit-compliant profile by profile ID
   */
  async getRedditCompliantProfile(profileId: string): Promise<RedditCompliantProfile | null> {
    try {
      return await this.redditCompliantStorage.getRedditCompliantProfile(profileId);
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
      return await this.redditCompliantStorage.updateRedditCompliantProfile(profileId, updates);
    } catch (error) {
      console.error(`Failed to update Reddit-compliant profile ${profileId}:`, error);
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
    try {
      return await this.redditCompliantStorage.createRedditCompliantSession(
        profileId,
        subredditContext,
        isAnonymous
      );
    } catch (error) {
      console.error('Failed to create Reddit-compliant session:', error);
      throw error;
    }
  }

  /**
   * Get subreddit-specific profile data
   */
  async getSubredditProfile(profileId: string, subreddit: string): Promise<SubredditGameStats | null> {
    try {
      return await this.redditCompliantStorage.getSubredditProfile(profileId, subreddit);
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
      await this.redditCompliantStorage.updateSubredditProfile(profileId, subreddit, stats);
    } catch (error) {
      console.error(`Failed to update subreddit profile for ${profileId} in ${subreddit}:`, error);
      throw error;
    }
  }

  /**
   * Migrate existing profile to Reddit-compliant format
   */
  async migrateToRedditCompliant(userId: string): Promise<boolean> {
    try {
      return await this.migrationService.migrateProfile(userId, {
        redactAllRedditIds: true,
        isolateSubredditData: true,
        updatePrivacySettings: true,
        backupOriginalData: true
      });
    } catch (error) {
      console.error(`Failed to migrate profile ${userId} to Reddit-compliant format:`, error);
      throw error;
    }
  }

  /**
   * Migrate all profiles to Reddit-compliant format
   */
  async migrateAllToRedditCompliant(): Promise<{ success: boolean; migratedCount: number; errors: string[] }> {
    try {
      const result = await this.migrationService.migrateAllProfiles({
        redactAllRedditIds: true,
        isolateSubredditData: true,
        updatePrivacySettings: true,
        backupOriginalData: true,
        batchSize: 10
      });

      return {
        success: result.success,
        migratedCount: result.migratedProfiles,
        errors: result.errors
      };
    } catch (error) {
      console.error('Failed to migrate all profiles to Reddit-compliant format:', error);
      throw error;
    }
  }

  /**
   * Validate Reddit compliance of a profile
   */
  async validateRedditCompliance(profileId: string): Promise<{ isCompliant: boolean; issues: string[] }> {
    try {
      return await this.migrationService.validateCompliance(profileId);
    } catch (error) {
      console.error(`Failed to validate Reddit compliance for profile ${profileId}:`, error);
      return { isCompliant: false, issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`] };
    }
  }

  /**
   * Export Reddit-compliant profile data
   */
  async exportRedditCompliantProfile(
    profileId: string,
    format: 'json' | 'csv' | 'human-readable' = 'json'
  ): Promise<RedditCompliantExport | string> {
    try {
      const profile = await this.redditCompliantStorage.getRedditCompliantProfile(profileId);
      if (!profile) {
        throw new Error(`Profile not found: ${profileId}`);
      }

      // Check privacy settings
      if (!profile.privacySettings.allowDataExport) {
        throw new Error('User has disabled data export');
      }

      const exportData: RedditCompliantExport = {
        exportedAt: new Date(),
        exportVersion: '2.0',
        userData: {
          profile,
          gameHistory: [], // TODO: Implement when game history is available
          achievements: profile.trophyCollection,
          badges: profile.badges
        },
        metadata: {
          totalDataSize: 0, // Will be calculated after serialization
          exportFormat: format,
          redditCompliant: true,
          redditIdsRedacted: true,
          subredditDataIsolated: profile.privacySettings.isolateSubredditData,
          disclaimer: 'This export contains Reddit-compliant data with all Reddit user identifiers redacted.',
          dataSource: 'pictact-reddit-app'
        }
      };

      if (format === 'json') {
        const serialized = JSON.stringify(exportData, null, 2);
        exportData.metadata.totalDataSize = serialized.length;
        return exportData;
      } else if (format === 'human-readable') {
        return this.generateHumanReadableRedditCompliantExport(profile);
      } else {
        // CSV format
        return this.generateCSVRedditCompliantExport(profile);
      }
    } catch (error) {
      console.error(`Failed to export Reddit-compliant profile ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Generate human-readable export for Reddit-compliant profile
   */
  private generateHumanReadableRedditCompliantExport(profile: RedditCompliantProfile): string {
    const exportDate = new Date().toLocaleDateString();
    const memberSince = profile.createdAt.toLocaleDateString();
    
    let export_text = `PicTact Reddit-Compliant Profile Export\n`;
    export_text += `Generated: ${exportDate}\n\n`;
    
    export_text += `Profile Information:\n`;
    export_text += `- Profile ID: ${profile.profileId}\n`;
    export_text += `- Display Name: ${profile.displayName || 'Not set'}\n`;
    export_text += `- Member Since: ${memberSince}\n`;
    export_text += `- Last Active: ${profile.lastActiveAt.toLocaleDateString()}\n\n`;
    
    export_text += `Game Statistics:\n`;
    export_text += `- Total Matches: ${profile.gameStats.totalMatches}\n`;
    export_text += `- Total Wins: ${profile.gameStats.totalWins}\n`;
    export_text += `- Win Rate: ${(profile.gameStats.winRate * 100).toFixed(1)}%\n`;
    export_text += `- Total Points: ${profile.gameStats.totalPoints}\n`;
    export_text += `- Best Streak: ${profile.gameStats.bestStreak}\n\n`;
    
    export_text += `Subreddit Activity (${profile.gameStats.subredditStats.size} communities):\n`;
    for (const [subreddit, stats] of profile.gameStats.subredditStats) {
      export_text += `- r/${subreddit}: ${stats.matches} matches, ${stats.wins} wins, ${stats.points} points\n`;
    }
    
    export_text += `\nAchievements: ${profile.trophyCollection.length} trophies, ${profile.badges.length} badges\n\n`;
    
    export_text += `Privacy & Compliance:\n`;
    export_text += `- Reddit IDs Redacted: Yes\n`;
    export_text += `- Subreddit Data Isolated: ${profile.privacySettings.isolateSubredditData ? 'Yes' : 'No'}\n`;
    export_text += `- Profile Visibility: ${profile.privacySettings.profileVisibility}\n`;
    export_text += `- Cross-Subreddit Stats: ${profile.privacySettings.allowCrossSubredditStats ? 'Enabled' : 'Disabled'}\n\n`;
    
    export_text += `This export is Reddit-compliant and contains no Reddit user identifiers.\n`;
    
    return export_text;
  }

  /**
   * Generate CSV export for Reddit-compliant profile
   */
  private generateCSVRedditCompliantExport(profile: RedditCompliantProfile): string {
    let csv = 'Field,Value\n';
    csv += `Profile ID,${profile.profileId}\n`;
    csv += `Display Name,${profile.displayName || 'Not set'}\n`;
    csv += `Created At,${profile.createdAt.toISOString()}\n`;
    csv += `Last Active,${profile.lastActiveAt.toISOString()}\n`;
    csv += `Total Matches,${profile.gameStats.totalMatches}\n`;
    csv += `Total Wins,${profile.gameStats.totalWins}\n`;
    csv += `Win Rate,${(profile.gameStats.winRate * 100).toFixed(2)}%\n`;
    csv += `Total Points,${profile.gameStats.totalPoints}\n`;
    csv += `Best Streak,${profile.gameStats.bestStreak}\n`;
    csv += `Trophies Count,${profile.trophyCollection.length}\n`;
    csv += `Badges Count,${profile.badges.length}\n`;
    csv += `Subreddits Count,${profile.gameStats.subredditStats.size}\n`;
    csv += `Reddit Compliant,Yes\n`;
    csv += `Reddit IDs Redacted,Yes\n`;
    
    return csv;
  }
}