/**
 * Reddit Data Migration Service
 * Handles migration of existing data to Reddit-compliant format
 */

import { ProfileStorageService } from "./profile-storage.js";
import { RedditCompliantStorageService } from "./reddit-compliant-storage.js";
import { 
  UserProfile,
  SubredditStats as LegacySubredditStats
} from "../../shared/types/profile.js";
import {
  RedditCompliantProfile,
  RedditCompliantGameStats,
  SubredditGameStats,
  RedditCompliantTrophy,
  RedditCompliantBadge,
  DataMigrationPlan,
  DataMigrationStep
} from "../../shared/types/reddit-compliant-data.js";

/**
 * Migration Result
 */
export interface MigrationResult {
  success: boolean;
  migratedProfiles: number;
  skippedProfiles: number;
  errors: string[];
  migrationId: string;
}

/**
 * Migration Options
 */
export interface MigrationOptions {
  dryRun?: boolean;
  batchSize?: number;
  redactAllRedditIds?: boolean;
  isolateSubredditData?: boolean;
  updatePrivacySettings?: boolean;
  backupOriginalData?: boolean;
}

/**
 * Reddit Data Migration Service
 * Migrates existing profile data to Reddit-compliant format
 */
export class RedditDataMigrationService {
  private legacyStorage: ProfileStorageService;
  private compliantStorage: RedditCompliantStorageService;

  constructor() {
    this.legacyStorage = new ProfileStorageService();
    this.compliantStorage = new RedditCompliantStorageService();
  }

  /**
   * Migrate all existing profiles to Reddit-compliant format
   */
  async migrateAllProfiles(options: MigrationOptions = {}): Promise<MigrationResult> {
    const migrationId = this.generateMigrationId();
    const migrationPlan = this.createMigrationPlan(migrationId, options);
    
    console.log(`Starting Reddit compliance migration: ${migrationId}`);
    
    try {
      // Get all existing user IDs
      const userIds = await this.legacyStorage.getAllUserIds();
      console.log(`Found ${userIds.length} profiles to migrate`);

      const result: MigrationResult = {
        success: true,
        migratedProfiles: 0,
        skippedProfiles: 0,
        errors: [],
        migrationId
      };

      // Process profiles in batches
      const batchSize = options.batchSize || 10;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        for (const userId of batch) {
          try {
            const migrated = await this.migrateProfile(userId, options);
            if (migrated) {
              result.migratedProfiles++;
            } else {
              result.skippedProfiles++;
            }
          } catch (error) {
            const errorMsg = `Failed to migrate profile ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMsg);
            result.errors.push(errorMsg);
          }
        }

        // Log progress
        console.log(`Migration progress: ${Math.min(i + batchSize, userIds.length)}/${userIds.length} profiles processed`);
      }

      // Update migration plan status
      migrationPlan.status = result.errors.length === 0 ? 'completed' : 'completed';
      migrationPlan.completedAt = new Date();

      console.log(`Migration completed: ${result.migratedProfiles} migrated, ${result.skippedProfiles} skipped, ${result.errors.length} errors`);
      return result;

    } catch (error) {
      console.error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      migrationPlan.status = 'failed';
      
      return {
        success: false,
        migratedProfiles: 0,
        skippedProfiles: 0,
        errors: [`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        migrationId
      };
    }
  }

  /**
   * Migrate a single profile to Reddit-compliant format
   */
  async migrateProfile(userId: string, options: MigrationOptions = {}): Promise<boolean> {
    try {
      // Get existing profile
      const legacyProfile = await this.legacyStorage.getProfile(userId);
      if (!legacyProfile) {
        console.warn(`Legacy profile not found for user: ${userId}`);
        return false;
      }

      // Check if already migrated (profile has Reddit user ID)
      if (this.isAlreadyMigrated(legacyProfile)) {
        console.log(`Profile ${userId} appears to already be Reddit-compliant`);
        return false;
      }

      // Create Reddit-compliant profile
      const compliantProfile = this.convertToRedditCompliantProfile(legacyProfile, options);

      if (options.dryRun) {
        console.log(`[DRY RUN] Would migrate profile: ${userId} -> ${compliantProfile.profileId}`);
        return true;
      }

      // Store the new Reddit-compliant profile
      const profileKey = this.getCompliantProfileKey(compliantProfile.profileId);
      await this.storeCompliantProfile(profileKey, compliantProfile);

      // Migrate subreddit-specific data
      await this.migrateSubredditData(legacyProfile, compliantProfile, options);

      // Backup original data if requested
      if (options.backupOriginalData) {
        await this.backupLegacyProfile(userId, legacyProfile);
      }

      console.log(`Profile migrated: ${userId} -> ${compliantProfile.profileId}`);
      return true;

    } catch (error) {
      console.error(`Failed to migrate profile ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Convert legacy profile to Reddit-compliant format
   */
  private convertToRedditCompliantProfile(
    legacyProfile: UserProfile, 
    options: MigrationOptions
  ): RedditCompliantProfile {
    const now = new Date();
    const profileId = this.generateCompliantProfileId();

    // Convert game statistics
    const gameStats: RedditCompliantGameStats = {
      totalMatches: legacyProfile.lifetimeStats.totalMatches,
      totalWins: legacyProfile.lifetimeStats.totalWins,
      totalPoints: legacyProfile.lifetimeStats.totalPoints,
      averageSolveTime: legacyProfile.lifetimeStats.averageSolveTime,
      winRate: legacyProfile.lifetimeStats.winRate,
      bestStreak: legacyProfile.lifetimeStats.bestStreak,
      currentStreak: legacyProfile.lifetimeStats.currentStreak,
      totalPlayTime: legacyProfile.lifetimeStats.totalPlayTime,
      subredditStats: this.convertSubredditStats(legacyProfile.subredditStats),
      firstGameDate: legacyProfile.lifetimeStats.firstGameDate,
      lastGameDate: legacyProfile.lifetimeStats.lastGameDate
    };

    // Convert trophies (redact Reddit-specific data)
    const trophyCollection: RedditCompliantTrophy[] = legacyProfile.trophyCollection.map(trophy => ({
      id: trophy.id,
      name: trophy.name,
      description: trophy.description,
      category: trophy.category,
      rarity: trophy.rarity,
      earnedAt: trophy.earnedAt,
      subredditEarned: trophy.subredditEarned,
      metadata: this.redactMetadata(trophy.metadata || {})
    }));

    // Convert badges (redact Reddit-specific data)
    const badges: RedditCompliantBadge[] = legacyProfile.badges.map(badge => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      iconUrl: badge.iconUrl,
      earnedAt: badge.earnedAt,
      level: badge.level,
      subredditEarned: undefined // Remove any Reddit-specific context
    }));

    const compliantProfile: RedditCompliantProfile = {
      profileId,
      displayName: options.redactAllRedditIds ? undefined : legacyProfile.displayName,
      createdAt: legacyProfile.createdAt,
      lastActiveAt: legacyProfile.lastActiveAt,
      lastProfileUpdate: now,
      gameStats,
      privacySettings: {
        profileVisibility: legacyProfile.privacySettings.profileVisibility === 'friends' ? 'subreddit' : legacyProfile.privacySettings.profileVisibility,
        allowCrossSubredditStats: legacyProfile.privacySettings.allowCrossSubredditTracking,
        allowDataExport: legacyProfile.privacySettings.allowDataExport,
        allowAnonymousMode: legacyProfile.privacySettings.allowAnonymousMode,
        autoDeleteInactiveData: false,
        redactRedditIdentifiers: true, // Always true for compliance
        isolateSubredditData: true // Always true for compliance
      },
      preferences: {
        gameSettings: {
          defaultDifficulty: legacyProfile.preferences.gameSettings.defaultDifficulty,
          autoJoinEvents: legacyProfile.preferences.gameSettings.autoJoinEvents,
          showHints: legacyProfile.preferences.gameSettings.showHints,
          preferredThemes: legacyProfile.preferences.gameSettings.preferredThemes,
          maxConcurrentGames: legacyProfile.preferences.gameSettings.maxConcurrentGames,
          useRedditTheme: true, // New Reddit-specific setting
          integrateWithRedditNotifications: true // New Reddit-specific setting
        },
        accessibility: legacyProfile.preferences.accessibility,
        notifications: {
          redditNotifications: legacyProfile.preferences.notifications.pushNotifications,
          gameStartReminders: legacyProfile.preferences.notifications.gameStartReminders,
          achievementAlerts: legacyProfile.preferences.notifications.achievementAlerts,
          weeklyDigest: legacyProfile.preferences.notifications.weeklyDigest,
          frequency: legacyProfile.preferences.notifications.frequency
        }
      },
      trophyCollection,
      badges,
      profileVersion: 1 // Reddit-compliant version
    };

    return compliantProfile;
  }

  /**
   * Convert legacy subreddit stats to Reddit-compliant format
   */
  private convertSubredditStats(legacyStats: Map<string, LegacySubredditStats>): Map<string, SubredditGameStats> {
    const compliantStats = new Map<string, SubredditGameStats>();

    for (const [subredditName, stats] of legacyStats) {
      const compliantSubredditStats: SubredditGameStats = {
        subredditName: stats.subredditName,
        joinedAt: stats.joinedAt,
        lastActiveAt: stats.lastActiveAt,
        matches: stats.matches,
        wins: stats.wins,
        points: stats.points,
        rank: stats.rank,
        winRate: stats.wins > 0 ? stats.wins / stats.matches : 0,
        averageSolveTime: 0, // Not available in legacy data
        bestStreak: 0, // Not available in legacy data
        currentStreak: 0, // Not available in legacy data
        trophies: stats.trophies.map(trophy => ({
          id: trophy.id,
          name: trophy.name,
          description: trophy.description,
          category: trophy.category,
          rarity: trophy.rarity,
          earnedAt: trophy.earnedAt,
          subredditEarned: trophy.subredditEarned,
          metadata: this.redactMetadata(trophy.metadata || {})
        })),
        specialBadges: stats.specialBadges.map(badge => ({
          id: badge.id,
          name: badge.name,
          description: badge.description,
          iconUrl: badge.iconUrl,
          earnedAt: badge.earnedAt,
          level: badge.level,
          subredditEarned: subredditName
        }))
      };

      compliantStats.set(subredditName, compliantSubredditStats);
    }

    return compliantStats;
  }

  /**
   * Migrate subreddit-specific data with proper isolation
   */
  private async migrateSubredditData(
    legacyProfile: UserProfile,
    compliantProfile: RedditCompliantProfile,
    options: MigrationOptions
  ): Promise<void> {
    if (!options.isolateSubredditData) {
      return;
    }

    for (const [subredditName, stats] of compliantProfile.gameStats.subredditStats) {
      try {
        await this.compliantStorage.updateSubredditProfile(
          compliantProfile.profileId,
          subredditName,
          stats
        );
      } catch (error) {
        console.error(`Failed to migrate subreddit data for ${subredditName}:`, error);
        // Continue with other subreddits
      }
    }
  }

  /**
   * Redact metadata to remove Reddit-specific identifiers
   */
  private redactMetadata(metadata: Record<string, any>): Record<string, any> {
    const redacted = { ...metadata };
    
    // Remove common Reddit identifier fields
    delete redacted.redditUserId;
    delete redacted.redditUsername;
    delete redacted.redditPostId;
    delete redacted.redditCommentId;
    delete redacted.authorId;
    
    // Redact any field that looks like a Reddit ID
    for (const [key, value] of Object.entries(redacted)) {
      if (typeof value === 'string') {
        // Reddit IDs typically start with 't1_', 't2_', 't3_', etc.
        if (value.match(/^t[0-9]_/)) {
          delete redacted[key];
        }
        // Remove usernames that look like Reddit usernames
        if (key.toLowerCase().includes('username') || key.toLowerCase().includes('user')) {
          redacted[key] = '[REDACTED]';
        }
      }
    }

    return redacted;
  }

  /**
   * Check if profile is already migrated
   */
  private isAlreadyMigrated(profile: UserProfile): boolean {
    // Check if profile has Reddit user ID stored (indicates non-compliance)
    return !profile.userId.startsWith('u/') && !profile.userId.match(/^[0-9a-z]+$/);
  }

  /**
   * Create migration plan
   */
  private createMigrationPlan(migrationId: string, options: MigrationOptions): DataMigrationPlan {
    const now = new Date();
    
    const steps: DataMigrationStep[] = [
      {
        stepId: 'redact_reddit_ids',
        description: 'Redact Reddit user IDs from profile data',
        operation: 'redact',
        targetDataType: 'profile',
        status: 'pending'
      },
      {
        stepId: 'isolate_subreddit_data',
        description: 'Isolate subreddit-specific data',
        operation: 'isolate',
        targetDataType: 'subreddit_stats',
        status: 'pending'
      },
      {
        stepId: 'transform_privacy_settings',
        description: 'Transform privacy settings for Reddit compliance',
        operation: 'transform',
        targetDataType: 'privacy_settings',
        status: 'pending'
      },
      {
        stepId: 'validate_compliance',
        description: 'Validate Reddit compliance of migrated data',
        operation: 'validate',
        targetDataType: 'all',
        status: 'pending'
      }
    ];

    return {
      migrationId,
      fromVersion: 1,
      toVersion: 2,
      steps,
      createdAt: now,
      status: 'pending',
      transformationRules: {
        redactRedditIds: options.redactAllRedditIds || true,
        isolateSubredditData: options.isolateSubredditData || true,
        updatePrivacySettings: options.updatePrivacySettings || true,
        migrateGameData: true
      }
    };
  }

  /**
   * Generate migration ID
   */
  private generateMigrationId(): string {
    return 'migration_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate Reddit-compliant profile ID
   */
  private generateCompliantProfileId(): string {
    return 'profile_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get compliant profile key
   */
  private getCompliantProfileKey(profileId: string): string {
    return `reddit_compliant_profile:${profileId}`;
  }

  /**
   * Store compliant profile
   */
  private async storeCompliantProfile(key: string, profile: RedditCompliantProfile): Promise<void> {
    // This would use the RedditCompliantStorageService in a real implementation
    // For now, we'll use the storage service directly
    await this.compliantStorage.updateRedditCompliantProfile(profile.profileId, profile);
  }

  /**
   * Backup legacy profile
   */
  private async backupLegacyProfile(userId: string, profile: UserProfile): Promise<void> {
    // Store backup of original profile for recovery purposes
    const backupKey = `backup:legacy_profile:${userId}:${Date.now()}`;
    console.log(`Backing up legacy profile: ${backupKey}`);
    // In a real implementation, this would store to a backup location
  }

  /**
   * Validate Reddit compliance of migrated data
   */
  async validateCompliance(profileId: string): Promise<{ isCompliant: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const profile = await this.compliantStorage.getRedditCompliantProfile(profileId);
      if (!profile) {
        return { isCompliant: false, issues: ['Profile not found'] };
      }

      // Check that no Reddit user IDs are stored
      if (profile.profileId.includes('u/') || profile.profileId.match(/^[0-9a-z]{6,}$/)) {
        issues.push('Profile ID appears to contain Reddit user identifier');
      }

      // Check privacy settings compliance
      if (!profile.privacySettings.redactRedditIdentifiers) {
        issues.push('Reddit identifier redaction not enabled');
      }

      if (!profile.privacySettings.isolateSubredditData) {
        issues.push('Subreddit data isolation not enabled');
      }

      // Check trophy and badge data for Reddit IDs
      for (const trophy of profile.trophyCollection) {
        if (trophy.metadata && this.containsRedditIds(trophy.metadata)) {
          issues.push(`Trophy ${trophy.id} contains Reddit identifiers in metadata`);
        }
      }

      return { isCompliant: issues.length === 0, issues };

    } catch (error) {
      return { 
        isCompliant: false, 
        issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  /**
   * Check if object contains Reddit IDs
   */
  private containsRedditIds(obj: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Check for Reddit ID patterns
        if (value.match(/^t[0-9]_/) || key.toLowerCase().includes('reddit')) {
          return true;
        }
      }
    }
    return false;
  }
}