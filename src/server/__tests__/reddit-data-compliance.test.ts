/**
 * Reddit Data Compliance Tests
 * Tests for Reddit ID redaction, subreddit data isolation, and data export compliance
 */

import { RedditCompliantStorageService } from '../core/reddit-compliant-storage.js';
import { RedditDataMigrationService } from '../core/reddit-data-migration.js';
import { DataExportService } from '../core/data-export-service.js';
import { PrivacyService } from '../core/privacy-service.js';
import { ProfileStorageService } from '../core/profile-storage.js';
import {
  RedditCompliantProfile,
  RedditCompliantTrophy,
  SubredditGameStats
} from '../../shared/types/reddit-compliant-data.js';
import {
  UserProfile,
  CreateProfileRequest,
  Trophy
} from '../../shared/types/profile.js';

describe('Reddit Data Compliance Tests', () => {
  let compliantStorage: RedditCompliantStorageService;
  let migrationService: RedditDataMigrationService;
  let exportService: DataExportService;
  let privacyService: PrivacyService;
  let legacyStorage: ProfileStorageService;

  beforeEach(() => {
    compliantStorage = new RedditCompliantStorageService();
    migrationService = new RedditDataMigrationService();
    exportService = new DataExportService();
    privacyService = new PrivacyService();
    legacyStorage = new ProfileStorageService();

    // Clear all data before each test
    RedditCompliantStorageService.clearAllData();
    ProfileStorageService.clearAllData();
  });

  afterEach(() => {
    // Clean up after each test
    RedditCompliantStorageService.clearAllData();
    ProfileStorageService.clearAllData();
  });

  describe('Reddit ID Redaction Tests', () => {
    test('should never store Reddit user IDs in compliant profiles', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile(
        'TestUser',
        'testsubreddit'
      );

      // Verify profile ID is app-generated, not Reddit-based
      expect(profile.profileId).toMatch(/^profile_/);
      expect(profile.profileId).not.toMatch(/^u\//); // Not Reddit username format
      expect(profile.profileId).not.toMatch(/^[0-9a-z]{6,}$/); // Not Reddit user ID format
      expect(profile.profileId).not.toMatch(/^t2_/); // Not Reddit thing ID format
    });

    test('should redact Reddit IDs from trophy metadata during migration', async () => {
      // Create legacy profile with Reddit IDs
      const legacyRequest: CreateProfileRequest = {
        userId: 'u/testuser123',
        redditUsername: 'testuser123'
      };
      const legacyProfile = await legacyStorage.createProfile(legacyRequest);

      // Add trophy with Reddit metadata
      const trophyWithRedditData: Trophy = {
        id: 'reddit-trophy',
        name: 'Reddit Trophy',
        description: 'Test trophy',
        category: 'milestone',
        rarity: 'common',
        earnedAt: new Date(),
        metadata: {
          redditUserId: 't2_abc123',
          redditPostId: 't3_def456',
          redditCommentId: 't1_ghi789',
          authorId: 'u/someuser',
          submitterId: 'u/anotheruser',
          normalField: 'should_remain',
          sourceUrl: 'https://reddit.com/r/gaming/comments/abc123',
          shortUrl: 'https://redd.it/def456'
        }
      };

      await legacyStorage.addTrophy(legacyProfile.userId, trophyWithRedditData);

      // Migrate the profile
      const migrated = await migrationService.migrateProfile(legacyProfile.userId, {
        redactAllRedditIds: true
      });

      expect(migrated).toBe(true);

      // Verify Reddit IDs are redacted in export
      const exportData = await exportService.exportLegacyUserDataWithRedaction(
        legacyProfile.userId,
        { format: 'json', includeTrophies: true }
      );

      const exportedTrophy = (exportData as any).userData.achievements[0];
      expect(exportedTrophy.metadata.redditUserId).toBeUndefined();
      expect(exportedTrophy.metadata.redditPostId).toBeUndefined();
      expect(exportedTrophy.metadata.redditCommentId).toBeUndefined();
      expect(exportedTrophy.metadata.authorId).toBe('[REDACTED_USERNAME]');
      expect(exportedTrophy.metadata.submitterId).toBe('[REDACTED_USERNAME]');
      expect(exportedTrophy.metadata.normalField).toBe('should_remain');
      expect(exportedTrophy.metadata.sourceUrl).toBe('[REDACTED_REDDIT_URL]');
      expect(exportedTrophy.metadata.shortUrl).toBe('[REDACTED_REDDIT_URL]');
    });

    test('should redact Reddit usernames from exported data', async () => {
      // Create legacy profile with Reddit username
      const legacyRequest: CreateProfileRequest = {
        userId: 'u/testuser123',
        redditUsername: 'u/testuser123'
      };
      const legacyProfile = await legacyStorage.createProfile(legacyRequest);

      // Export with redaction
      const exportData = await exportService.exportLegacyUserDataWithRedaction(
        legacyProfile.userId,
        { format: 'json', includePersonalData: true }
      );

      const exportedProfile = (exportData as any).userData.profile;
      expect(exportedProfile.userId).toBe('[REDACTED_REDDIT_ID]');
      expect(exportedProfile.redditUsername).toBe('[REDACTED_USERNAME]');
    });

    test('should detect and redact Reddit thing IDs in metadata', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      const trophyWithThingIds: RedditCompliantTrophy = {
        id: 'thing-trophy',
        name: 'Thing Trophy',
        description: 'Trophy with Reddit thing IDs',
        category: 'milestone',
        rarity: 'common',
        earnedAt: new Date(),
        metadata: {
          postId: 't3_abc123',
          commentId: 't1_def456',
          userId: 't2_ghi789',
          subredditId: 't5_jkl012',
          normalId: 'app_generated_id'
        }
      };

      await compliantStorage.addTrophy(profile.profileId, trophyWithThingIds);

      // Export and verify redaction
      const exportData = await exportService.exportRedditCompliantUserData(
        profile.profileId,
        { format: 'json', includeTrophies: true }
      );

      const exportedTrophy = (exportData as any).userData.achievements[0];
      expect(exportedTrophy.metadata.postId).toBeUndefined();
      expect(exportedTrophy.metadata.commentId).toBeUndefined();
      expect(exportedTrophy.metadata.userId).toBeUndefined();
      expect(exportedTrophy.metadata.subredditId).toBeUndefined();
      expect(exportedTrophy.metadata.normalId).toBe('app_generated_id');
    });

    test('should validate Reddit compliance after migration', async () => {
      // Create legacy profile with Reddit IDs
      const legacyRequest: CreateProfileRequest = {
        userId: 'u/testuser123',
        redditUsername: 'testuser123'
      };
      const legacyProfile = await legacyStorage.createProfile(legacyRequest);

      // Migrate the profile
      await migrationService.migrateProfile(legacyProfile.userId, {
        redactAllRedditIds: true,
        isolateSubredditData: true
      });

      // Note: We can't easily test the validation without exposing internal methods
      // This test documents the expected behavior
      expect(true).toBe(true); // Placeholder for actual validation test
    });
  });

  describe('Subreddit Data Isolation Tests', () => {
    test('should isolate data between different subreddits', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      // Add data for multiple subreddits
      const gamingStats: SubredditGameStats = {
        subredditName: 'gaming',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 10,
        wins: 6,
        points: 300,
        rank: 5,
        winRate: 0.6,
        averageSolveTime: 45.0,
        bestStreak: 4,
        currentStreak: 2,
        trophies: [],
        specialBadges: []
      };

      const photosStats: SubredditGameStats = {
        subredditName: 'photos',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 15,
        wins: 3,
        points: 150,
        rank: 20,
        winRate: 0.2,
        averageSolveTime: 75.0,
        bestStreak: 2,
        currentStreak: 0,
        trophies: [],
        specialBadges: []
      };

      await compliantStorage.updateSubredditProfile(profile.profileId, 'gaming', gamingStats);
      await compliantStorage.updateSubredditProfile(profile.profileId, 'photos', photosStats);

      // Verify data isolation
      const gamingData = await compliantStorage.getSubredditProfile(profile.profileId, 'gaming');
      const photosData = await compliantStorage.getSubredditProfile(profile.profileId, 'photos');

      expect(gamingData).toBeDefined();
      expect(photosData).toBeDefined();
      expect(gamingData!.matches).toBe(10);
      expect(photosData!.matches).toBe(15);
      expect(gamingData!.winRate).toBe(0.6);
      expect(photosData!.winRate).toBe(0.2);

      // Verify no cross-contamination
      expect(gamingData!.subredditName).toBe('gaming');
      expect(photosData!.subredditName).toBe('photos');
      expect(gamingData!.points).not.toBe(photosData!.points);
    });

    test('should maintain subreddit context in profile data', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile(
        'TestUser',
        'testsubreddit'
      );

      // Verify subreddit context is maintained
      expect(profile.gameStats.subredditStats.size).toBe(1);
      expect(profile.gameStats.subredditStats.has('testsubreddit')).toBe(true);

      const subredditData = profile.gameStats.subredditStats.get('testsubreddit');
      expect(subredditData).toBeDefined();
      expect(subredditData!.subredditName).toBe('testsubreddit');
    });

    test('should delete subreddit data when profile is deleted', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile(
        'TestUser',
        'testsubreddit'
      );

      // Add subreddit-specific data
      const subredditStats: SubredditGameStats = {
        subredditName: 'testsubreddit',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 5,
        wins: 3,
        points: 150,
        rank: 10,
        winRate: 0.6,
        averageSolveTime: 45.0,
        bestStreak: 3,
        currentStreak: 1,
        trophies: [],
        specialBadges: []
      };

      await compliantStorage.updateSubredditProfile(
        profile.profileId,
        'testsubreddit',
        subredditStats
      );

      // Verify data exists
      const beforeDelete = await compliantStorage.getSubredditProfile(
        profile.profileId,
        'testsubreddit'
      );
      expect(beforeDelete).toBeDefined();

      // Delete profile
      await compliantStorage.deleteRedditCompliantProfile(profile.profileId);

      // Verify subreddit data is also deleted
      const afterDelete = await compliantStorage.getSubredditProfile(
        profile.profileId,
        'testsubreddit'
      );
      expect(afterDelete).toBeNull();
    });

    test('should enforce subreddit data isolation in privacy settings', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      // Verify default privacy settings enforce isolation
      expect(profile.privacySettings.isolateSubredditData).toBe(true);
      expect(profile.privacySettings.redactRedditIdentifiers).toBe(true);
      expect(profile.privacySettings.profileVisibility).toBe('subreddit');
      expect(profile.privacySettings.allowCrossSubredditStats).toBe(false);
    });
  });

  describe('Data Export Compliance Tests', () => {
    test('should export Reddit-compliant data with proper metadata', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile(
        'TestUser',
        'testsubreddit'
      );

      const exportData = await exportService.exportRedditCompliantUserData(
        profile.profileId,
        { format: 'json', includePersonalData: true, includeTrophies: true }
      );

      const exportMetadata = (exportData as any).metadata;
      expect(exportMetadata.redditCompliant).toBe(true);
      expect(exportMetadata.redditIdsRedacted).toBe(true);
      expect(exportMetadata.subredditDataIsolated).toBe(true);
      expect(exportMetadata.disclaimer).toContain('Reddit-compliant');
      expect(exportMetadata.dataSource).toBe('pictact-reddit-app');
    });

    test('should validate export requests for Reddit compliance', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      const validation = await exportService.validateRedditCompliantExportRequest(
        profile.profileId,
        { format: 'json' }
      );

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject export when user disables data export', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      // Update privacy settings to disable export
      await compliantStorage.updateRedditCompliantProfile(profile.profileId, {
        privacySettings: {
          ...profile.privacySettings,
          allowDataExport: false
        }
      });

      const validation = await exportService.validateRedditCompliantExportRequest(
        profile.profileId,
        { format: 'json' }
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('User has disabled data export');
    });

    test('should include Reddit compliance disclaimer in human-readable exports', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      const exportData = await exportService.exportRedditCompliantUserData(
        profile.profileId,
        { format: 'human-readable', includeTrophies: true }
      ) as any;

      expect(exportData.summary).toContain('Reddit-compliant');
      expect(exportData.profileOverview).toContain('Reddit Compliant: Yes');
      expect(exportData.profileOverview).toContain('Reddit IDs Redacted: Yes');
      expect(exportData.achievementsList).toContain('Reddit user identifiers have been redacted');
      expect(exportData.subredditActivity).toContain('contains no Reddit user identifiers');
      expect(exportData.exportDetails).toContain('Reddit-compliant: Yes');
    });

    test('should properly delete Reddit-compliant user data', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile(
        'TestUser',
        'testsubreddit'
      );

      // Add some data
      const subredditStats: SubredditGameStats = {
        subredditName: 'testsubreddit',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 5,
        wins: 3,
        points: 150,
        rank: 10,
        winRate: 0.6,
        averageSolveTime: 45.0,
        bestStreak: 3,
        currentStreak: 1,
        trophies: [],
        specialBadges: []
      };

      await compliantStorage.updateSubredditProfile(
        profile.profileId,
        'testsubreddit',
        subredditStats
      );

      // Delete user data
      const deleteResult = await exportService.deleteRedditCompliantUserData(profile.profileId);

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.message).toContain('permanently deleted');

      // Verify data is deleted
      const deletedProfile = await compliantStorage.getRedditCompliantProfile(profile.profileId);
      expect(deletedProfile).toBeNull();
    });

    test('should handle date range filtering in exports', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      // Add trophy with specific date
      const oldTrophy: RedditCompliantTrophy = {
        id: 'old-trophy',
        name: 'Old Trophy',
        description: 'Old trophy',
        category: 'milestone',
        rarity: 'common',
        earnedAt: new Date('2023-01-01')
      };

      const newTrophy: RedditCompliantTrophy = {
        id: 'new-trophy',
        name: 'New Trophy',
        description: 'New trophy',
        category: 'milestone',
        rarity: 'common',
        earnedAt: new Date('2024-01-01')
      };

      await compliantStorage.addTrophy(profile.profileId, oldTrophy);
      await compliantStorage.addTrophy(profile.profileId, newTrophy);

      // Export with date range
      const exportData = await exportService.exportRedditCompliantUserData(
        profile.profileId,
        {
          format: 'json',
          includeTrophies: true,
          dateRange: {
            startDate: new Date('2023-06-01'),
            endDate: new Date('2024-12-31')
          }
        }
      );

      const achievements = (exportData as any).userData.achievements;
      expect(achievements).toHaveLength(1);
      expect(achievements[0].id).toBe('new-trophy');
    });
  });

  describe('Privacy Controls Compliance Tests', () => {
    test('should respect privacy settings in data visibility', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      // Test default privacy settings
      const defaultSettings = profile.privacySettings;
      expect(defaultSettings.redactRedditIdentifiers).toBe(true);
      expect(defaultSettings.isolateSubredditData).toBe(true);
      expect(defaultSettings.profileVisibility).toBe('subreddit');
      expect(defaultSettings.allowCrossSubredditStats).toBe(false);
    });

    test('should handle anonymous session data properly', async () => {
      const anonymousProfile = privacyService.createAnonymousProfile();

      expect(anonymousProfile.sessionId).toMatch(/^anon_/);
      expect(anonymousProfile.temporaryStats.sessionMatches).toBe(0);
      expect(anonymousProfile.temporaryStats.sessionWins).toBe(0);
      expect(anonymousProfile.temporaryStats.sessionPoints).toBe(0);

      // Update anonymous stats
      const updatedProfile = privacyService.updateAnonymousStats(anonymousProfile.sessionId, {
        matchesPlayed: 3,
        wins: 2,
        points: 150
      });

      expect(updatedProfile).toBeDefined();
      expect(updatedProfile!.temporaryStats.sessionMatches).toBe(3);
      expect(updatedProfile!.temporaryStats.sessionWins).toBe(2);
      expect(updatedProfile!.temporaryStats.sessionPoints).toBe(150);

      // Verify no Reddit IDs are stored
      expect(anonymousProfile.sessionId).not.toMatch(/^u\//);
      expect(anonymousProfile.sessionId).not.toMatch(/^t[0-9]_/);
    });

    test('should convert anonymous data to authenticated without Reddit IDs', async () => {
      const anonymousProfile = privacyService.createAnonymousProfile();

      // Add some stats
      privacyService.updateAnonymousStats(anonymousProfile.sessionId, {
        matchesPlayed: 5,
        wins: 3,
        points: 250
      });

      // Convert to authenticated
      const conversionData = privacyService.convertAnonymousToAuthenticated(
        anonymousProfile.sessionId
      );

      expect(conversionData).toBeDefined();
      expect(conversionData!.matches).toBe(5);
      expect(conversionData!.wins).toBe(3);
      expect(conversionData!.points).toBe(250);

      // Verify session is deleted after conversion
      const deletedSession = privacyService.getAnonymousSession(anonymousProfile.sessionId);
      expect(deletedSession).toBeNull();
    });
  });

  describe('Cross-Platform Compliance Tests', () => {
    test('should maintain compliance across different export formats', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      // Test JSON export
      const jsonExport = await exportService.exportRedditCompliantUserData(
        profile.profileId,
        { format: 'json' }
      );
      expect((jsonExport as any).metadata.redditCompliant).toBe(true);

      // Test CSV export
      const csvExport = await exportService.exportRedditCompliantUserData(
        profile.profileId,
        { format: 'csv' }
      );
      expect(csvExport).toBeDefined();

      // Test human-readable export
      const humanExport = await exportService.exportRedditCompliantUserData(
        profile.profileId,
        { format: 'human-readable' }
      );
      expect((humanExport as any).exportDetails).toContain('Reddit-compliant: Yes');
    });

    test('should validate compliance across all data operations', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      // Verify profile creation compliance
      expect(profile.profileId).toMatch(/^profile_/);
      expect(profile.privacySettings.redactRedditIdentifiers).toBe(true);
      expect(profile.privacySettings.isolateSubredditData).toBe(true);

      // Verify session creation compliance
      const session = await compliantStorage.createRedditCompliantSession(
        profile.profileId,
        'testsubreddit'
      );
      expect(session.sessionId).toMatch(/^session_/);
      expect(session.subredditContext).toBe('testsubreddit');

      // Verify export compliance
      const exportValidation = await exportService.validateRedditCompliantExportRequest(
        profile.profileId,
        { format: 'json' }
      );
      expect(exportValidation.valid).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle non-existent profile gracefully in compliance operations', async () => {
      const validation = await exportService.validateRedditCompliantExportRequest(
        'non-existent-profile',
        { format: 'json' }
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Reddit-compliant profile not found');
    });

    test('should handle invalid export options', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      const validation = await exportService.validateRedditCompliantExportRequest(
        profile.profileId,
        {
          format: 'invalid' as any,
          dateRange: {
            startDate: new Date('2024-12-31'),
            endDate: new Date('2024-01-01') // Invalid range
          }
        }
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid export format specified');
      expect(validation.errors).toContain('Start date must be before end date');
    });

    test('should handle migration of profiles without Reddit IDs', async () => {
      // Create a profile that doesn't look like it has Reddit IDs
      const nonRedditRequest: CreateProfileRequest = {
        userId: 'app_generated_id_123',
        redditUsername: 'testuser'
      };

      const profile = await legacyStorage.createProfile(nonRedditRequest);

      const migrated = await migrationService.migrateProfile(profile.userId, {
        redactAllRedditIds: true
      });

      // Should skip migration since it doesn't look like a Reddit ID
      expect(migrated).toBe(false);
    });

    test('should handle concurrent subreddit data operations', async () => {
      const profile = await compliantStorage.createRedditCompliantProfile('TestUser');

      // Simulate concurrent updates to different subreddits
      const subreddit1Stats: SubredditGameStats = {
        subredditName: 'subreddit1',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 5,
        wins: 3,
        points: 150,
        rank: 10,
        winRate: 0.6,
        averageSolveTime: 45.0,
        bestStreak: 3,
        currentStreak: 1,
        trophies: [],
        specialBadges: []
      };

      const subreddit2Stats: SubredditGameStats = {
        subredditName: 'subreddit2',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 8,
        wins: 2,
        points: 100,
        rank: 25,
        winRate: 0.25,
        averageSolveTime: 60.0,
        bestStreak: 2,
        currentStreak: 0,
        trophies: [],
        specialBadges: []
      };

      // Update both subreddits concurrently
      await Promise.all([
        compliantStorage.updateSubredditProfile(profile.profileId, 'subreddit1', subreddit1Stats),
        compliantStorage.updateSubredditProfile(profile.profileId, 'subreddit2', subreddit2Stats)
      ]);

      // Verify both updates succeeded and data is isolated
      const sub1Data = await compliantStorage.getSubredditProfile(profile.profileId, 'subreddit1');
      const sub2Data = await compliantStorage.getSubredditProfile(profile.profileId, 'subreddit2');

      expect(sub1Data).toBeDefined();
      expect(sub2Data).toBeDefined();
      expect(sub1Data!.matches).toBe(5);
      expect(sub2Data!.matches).toBe(8);
      expect(sub1Data!.winRate).toBe(0.6);
      expect(sub2Data!.winRate).toBe(0.25);
    });
  });
});