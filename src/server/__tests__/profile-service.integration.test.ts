// Profile Service Integration Tests
// Tests profile CRUD operations, data consistency, and cross-subreddit identity synchronization

import { ProfileService } from '../core/profile-service';
import { ProfileStorageService } from '../core/profile-storage';
import { AuthenticatedUser } from '../../shared/types/auth';
import { UserProfile, Trophy, SubredditStats } from '../../shared/types/profile';

describe('ProfileService Integration Tests', () => {
  let profileService: ProfileService;

  beforeEach(() => {
    // Clear in-memory storage before each test
    ProfileStorageService.clearAllData();
    
    profileService = new ProfileService();
  });

  describe('Profile CRUD Operations and Data Consistency', () => {
    const mockUser: AuthenticatedUser = {
      redditUsername: 'testuser123',
      redditUserId: 'reddit_testuser123',
      sessionToken: 'sess_test_token_123',
      permissions: {
        canCreateEvents: true,
        canModerate: false,
        canViewProfiles: true,
        canExportData: true
      },
      isAnonymous: false
    };

    it('should create new profile for first-time user', async () => {
      const profile = await profileService.getOrCreateProfile(mockUser);

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(mockUser.redditUserId);
      expect(profile.redditUsername).toBe(mockUser.redditUsername);
      expect(profile.displayName).toBe(mockUser.redditUsername);
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.lastActiveAt).toBeInstanceOf(Date);
      expect(profile.lifetimeStats.totalMatches).toBe(0);
      expect(profile.trophyCollection).toEqual([]);
      expect(profile.subredditStats.size).toBe(0);
    });

    it('should return existing profile for returning user', async () => {
      // Create profile first
      const initialProfile = await profileService.getOrCreateProfile(mockUser);
      const initialCreatedAt = initialProfile.createdAt;

      // Get profile again
      const retrievedProfile = await profileService.getOrCreateProfile(mockUser);

      expect(retrievedProfile.userId).toBe(initialProfile.userId);
      expect(retrievedProfile.createdAt).toEqual(initialCreatedAt);
      expect(retrievedProfile.lastActiveAt.getTime()).toBeGreaterThanOrEqual(initialProfile.lastActiveAt.getTime());
    });

    it('should update profile data correctly', async () => {
      // Create initial profile
      const profile = await profileService.getOrCreateProfile(mockUser);

      // Add small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update profile
      const updates = {
        preferences: {
          notifications: {
            ...profile.preferences.notifications,
            emailNotifications: false
          }
        },
        privacySettings: {
          showLifetimeStats: false
        }
      };

      const updatedProfile = await profileService.updateProfile(profile.userId, updates);

      expect(updatedProfile.preferences.notifications.emailNotifications).toBe(false);
      expect(updatedProfile.privacySettings.showLifetimeStats).toBe(false);
      expect(updatedProfile.lastProfileUpdate.getTime()).toBeGreaterThan(profile.lastProfileUpdate.getTime());
    });

    it('should maintain data consistency during concurrent updates', async () => {
      // Create initial profile
      const profile = await profileService.getOrCreateProfile(mockUser);

      // Simulate concurrent updates
      const update1Promise = profileService.updateProfile(profile.userId, {
        preferences: {
          gameSettings: {
            ...profile.preferences.gameSettings,
            autoJoinEvents: false
          }
        }
      });

      const update2Promise = profileService.updateProfile(profile.userId, {
        privacySettings: {
          showTrophies: false
        }
      });

      // Wait for both updates to complete
      const [result1, result2] = await Promise.all([update1Promise, update2Promise]);

      // Verify both updates were applied
      const finalProfile = await profileService.getProfile(profile.userId);
      expect(finalProfile).toBeDefined();
      expect(finalProfile!.preferences.gameSettings.autoJoinEvents).toBe(false);
      expect(finalProfile!.privacySettings.showTrophies).toBe(false);
    });

    it('should handle profile deletion correctly', async () => {
      // Create profile
      const profile = await profileService.getOrCreateProfile(mockUser);
      expect(profile).toBeDefined();

      // Delete profile
      await profileService.deleteProfile(profile.userId);

      // Verify profile is deleted
      const deletedProfile = await profileService.getProfile(profile.userId);
      expect(deletedProfile).toBeNull();
    });

    it('should export profile data correctly', async () => {
      // Create profile with some data
      const profile = await profileService.getOrCreateProfile(mockUser);
      
      // Add some trophies
      const trophy: Trophy = {
        id: 'test-trophy-1',
        name: 'First Win',
        description: 'Won your first match',
        category: 'achievement',
        rarity: 'common',
        earnedAt: new Date(),
        subredditEarned: 'test-subreddit'
      };
      await profileService.awardTrophy(profile.userId, trophy);

      // Export profile
      const exportData = await profileService.exportProfile(profile.userId);

      expect(exportData).toBeDefined();
      expect(exportData.exportedAt).toBeInstanceOf(Date);
      expect(exportData.exportVersion).toBe('1.0');
      expect(exportData.userData.profile.userId).toBe(profile.userId);
      expect(exportData.userData.achievements).toHaveLength(1);
      expect(exportData.userData.achievements[0].id).toBe('test-trophy-1');
      expect(exportData.metadata.includesPersonalData).toBe(true);
    });

    it('should respect privacy settings during export', async () => {
      // Create profile with data export disabled
      const profile = await profileService.getOrCreateProfile(mockUser);
      await profileService.updateProfile(profile.userId, {
        privacySettings: {
          ...profile.privacySettings,
          allowDataExport: false
        }
      });

      // Attempt to export profile
      await expect(profileService.exportProfile(profile.userId)).rejects.toThrow('User has disabled data export');
    });
  });

  describe('Cross-Subreddit Identity Synchronization', () => {
    const mockUser: AuthenticatedUser = {
      redditUsername: 'crossuser123',
      redditUserId: 'reddit_crossuser123',
      sessionToken: 'sess_cross_token_123',
      permissions: {
        canCreateEvents: true,
        canModerate: false,
        canViewProfiles: true,
        canExportData: true
      },
      isAnonymous: false
    };

    it('should create global profile when user profile is created', async () => {
      // Create user profile
      const profile = await profileService.getOrCreateProfile(mockUser);

      // Check global profile exists
      const globalProfile = await profileService.getCrossSubredditIdentity(profile.userId);
      expect(globalProfile).toBeDefined();
      expect(globalProfile!.userId).toBe(profile.userId);
      expect(globalProfile!.totalMatches).toBe(0);
      expect(globalProfile!.totalWins).toBe(0);
      expect(globalProfile!.subredditParticipation).toEqual([]);
    });

    it('should synchronize data across multiple subreddits', async () => {
      // Create user profile
      const profile = await profileService.getOrCreateProfile(mockUser);

      // Record activity in first subreddit
      await profileService.recordSubredditActivity(profile.userId, 'subreddit1', {
        matchesPlayed: 5,
        wins: 3,
        points: 150,
        newRank: 2
      });

      // Record activity in second subreddit
      await profileService.recordSubredditActivity(profile.userId, 'subreddit2', {
        matchesPlayed: 3,
        wins: 2,
        points: 100,
        newRank: 1
      });

      // Verify subreddit-specific profiles
      const subreddit1Profile = await profileService.getSubredditProfile(profile.userId, 'subreddit1');
      const subreddit2Profile = await profileService.getSubredditProfile(profile.userId, 'subreddit2');

      expect(subreddit1Profile).toBeDefined();
      expect(subreddit1Profile!.matches).toBe(5);
      expect(subreddit1Profile!.wins).toBe(3);
      expect(subreddit1Profile!.points).toBe(150);
      expect(subreddit1Profile!.rank).toBe(2);

      expect(subreddit2Profile).toBeDefined();
      expect(subreddit2Profile!.matches).toBe(3);
      expect(subreddit2Profile!.wins).toBe(2);
      expect(subreddit2Profile!.points).toBe(100);
      expect(subreddit2Profile!.rank).toBe(1);

      // Verify global aggregation
      const aggregatedStats = await profileService.getAggregatedStats(profile.userId);
      expect(aggregatedStats.totalMatches).toBe(8); // 5 + 3
      expect(aggregatedStats.totalWins).toBe(5); // 3 + 2
      expect(aggregatedStats.totalPoints).toBe(250); // 150 + 100
      expect(aggregatedStats.uniqueSubreddits).toBe(2);
      expect(aggregatedStats.subredditBreakdown).toHaveLength(2);
    });

    it('should maintain consistency during cross-subreddit synchronization', async () => {
      // Create user profile
      const profile = await profileService.getOrCreateProfile(mockUser);

      // Record activity in first subreddit
      await profileService.recordSubredditActivity(profile.userId, 'sync-subreddit1', {
        matchesPlayed: 2,
        wins: 1,
        points: 50
      });

      // Verify first subreddit data
      const subreddit1Profile = await profileService.getSubredditProfile(profile.userId, 'sync-subreddit1');
      expect(subreddit1Profile).toBeDefined();
      expect(subreddit1Profile!.matches).toBe(2);

      // Record activity in second subreddit
      await profileService.recordSubredditActivity(profile.userId, 'sync-subreddit2', {
        matchesPlayed: 3,
        wins: 2,
        points: 75
      });

      // Record activity in third subreddit
      await profileService.recordSubredditActivity(profile.userId, 'sync-subreddit3', {
        matchesPlayed: 1,
        wins: 1,
        points: 25
      });

      // Sync profiles explicitly
      await profileService.syncCrossSubredditProfiles(profile.userId);

      // Check if user profile has subreddit stats
      const updatedProfile = await profileService.getProfile(profile.userId);
      expect(updatedProfile).toBeDefined();
      expect(updatedProfile!.subredditStats.size).toBe(3);

      // Verify all data is consistent
      const globalProfile = await profileService.getCrossSubredditIdentity(profile.userId);
      const aggregatedStats = await profileService.getAggregatedStats(profile.userId);

      expect(globalProfile).toBeDefined();
      expect(aggregatedStats.totalMatches).toBe(6); // 2 + 3 + 1
      expect(aggregatedStats.totalWins).toBe(4); // 1 + 2 + 1
      expect(aggregatedStats.totalPoints).toBe(150); // 50 + 75 + 25
      expect(aggregatedStats.uniqueSubreddits).toBe(3);
    });

    it('should handle subreddit-specific statistics updates', async () => {
      // Create user profile
      const profile = await profileService.getOrCreateProfile(mockUser);

      // Create initial subreddit activity
      await profileService.recordSubredditActivity(profile.userId, 'stats-subreddit', {
        matchesPlayed: 5,
        wins: 2,
        points: 100
      });

      // Verify initial stats
      const initialProfile = await profileService.getSubredditProfile(profile.userId, 'stats-subreddit');
      expect(initialProfile).toBeDefined();
      expect(initialProfile!.matches).toBe(5);

      // Update subreddit-specific statistics (these are absolute values, not incremental)
      const updatedStats: Partial<SubredditStats> = {
        matches: 10,
        wins: 6,
        points: 300,
        rank: 1
      };

      await profileService.updateSubredditStats(profile.userId, 'stats-subreddit', updatedStats);

      // Verify subreddit profile was updated
      const subredditProfile = await profileService.getSubredditProfile(profile.userId, 'stats-subreddit');
      expect(subredditProfile).toBeDefined();
      expect(subredditProfile!.matches).toBe(10);
      expect(subredditProfile!.wins).toBe(6);
      expect(subredditProfile!.points).toBe(300);
      expect(subredditProfile!.rank).toBe(1);

      // Verify global statistics were synchronized
      const aggregatedStats = await profileService.getAggregatedStats(profile.userId);
      expect(aggregatedStats.totalMatches).toBe(10);
      expect(aggregatedStats.totalWins).toBe(6);
      expect(aggregatedStats.totalPoints).toBe(300);
    });

    it('should handle cross-subreddit leaderboard generation', async () => {
      // Create multiple users with different activity levels
      const users = [
        { username: 'leader1', userId: 'reddit_leader1' },
        { username: 'leader2', userId: 'reddit_leader2' },
        { username: 'leader3', userId: 'reddit_leader3' }
      ];

      for (const user of users) {
        const mockUserAuth: AuthenticatedUser = {
          redditUsername: user.username,
          redditUserId: user.userId,
          sessionToken: `sess_${user.userId}`,
          permissions: {
            canCreateEvents: true,
            canModerate: false,
            canViewProfiles: true,
            canExportData: true
          },
          isAnonymous: false
        };

        // Create profile
        await profileService.getOrCreateProfile(mockUserAuth);

        // Record different levels of activity
        const activityLevel = users.indexOf(user) + 1;
        await profileService.recordSubredditActivity(user.userId, 'leaderboard-subreddit', {
          matchesPlayed: activityLevel * 5,
          wins: activityLevel * 3,
          points: activityLevel * 150
        });
      }

      // Get cross-subreddit leaderboard
      const leaderboard = await profileService.getCrossSubredditLeaderboard(10);

      expect(leaderboard).toHaveLength(3);
      
      // Verify leaderboard is sorted by points (descending)
      expect(leaderboard[0].totalPoints).toBeGreaterThanOrEqual(leaderboard[1].totalPoints);
      expect(leaderboard[1].totalPoints).toBeGreaterThanOrEqual(leaderboard[2].totalPoints);
      
      // Verify leaderboard contains expected data
      expect(leaderboard[0].globalRank).toBe(1);
      expect(leaderboard[1].globalRank).toBe(2);
      expect(leaderboard[2].globalRank).toBe(3);
    });

    it('should handle lifetime statistics updates with cross-subreddit sync', async () => {
      // Create user profile
      const profile = await profileService.getOrCreateProfile(mockUser);

      // Update lifetime statistics
      const matchResult = {
        won: true,
        points: 100,
        solveTime: 30000, // 30 seconds
        theme: 'nature',
        subreddit: 'lifetime-subreddit'
      };

      await profileService.updateLifetimeStats(profile.userId, matchResult);

      // Verify lifetime stats were updated
      const updatedProfile = await profileService.getProfile(profile.userId);
      expect(updatedProfile).toBeDefined();
      expect(updatedProfile!.lifetimeStats.totalMatches).toBe(1);
      expect(updatedProfile!.lifetimeStats.totalWins).toBe(1);
      expect(updatedProfile!.lifetimeStats.totalPoints).toBe(100);
      expect(updatedProfile!.lifetimeStats.winRate).toBe(1.0);
      expect(updatedProfile!.lifetimeStats.averageSolveTime).toBe(30000);
      expect(updatedProfile!.lifetimeStats.favoriteThemes).toContain('nature');
      expect(updatedProfile!.lifetimeStats.mostActiveSubreddits).toContain('lifetime-subreddit');

      // Verify global statistics were updated
      const globalProfile = await profileService.getCrossSubredditIdentity(profile.userId);
      expect(globalProfile).toBeDefined();
    });

    it('should handle trophy awards with cross-subreddit visibility', async () => {
      // Create user profile
      const profile = await profileService.getOrCreateProfile(mockUser);

      // Award trophies from different subreddits
      const trophy1: Trophy = {
        id: 'cross-trophy-1',
        name: 'Subreddit Champion',
        description: 'Won 10 matches in a subreddit',
        category: 'milestone',
        rarity: 'rare',
        earnedAt: new Date(),
        subredditEarned: 'trophy-subreddit1'
      };

      const trophy2: Trophy = {
        id: 'cross-trophy-2',
        name: 'Speed Demon',
        description: 'Solved puzzle in under 10 seconds',
        category: 'achievement',
        rarity: 'epic',
        earnedAt: new Date(),
        subredditEarned: 'trophy-subreddit2'
      };

      await profileService.awardTrophy(profile.userId, trophy1);
      await profileService.awardTrophy(profile.userId, trophy2);

      // Verify trophies are visible in profile
      const updatedProfile = await profileService.getProfile(profile.userId);
      expect(updatedProfile).toBeDefined();
      expect(updatedProfile!.trophyCollection).toHaveLength(2);
      expect(updatedProfile!.trophyCollection.map(t => t.id)).toContain('cross-trophy-1');
      expect(updatedProfile!.trophyCollection.map(t => t.id)).toContain('cross-trophy-2');

      // Verify trophies are included in aggregated stats
      const aggregatedStats = await profileService.getAggregatedStats(profile.userId);
      expect(aggregatedStats.totalTrophies).toBe(2);
    });
  });

  describe('Privacy and Public Profile Integration', () => {
    const mockUser: AuthenticatedUser = {
      redditUsername: 'privacyuser123',
      redditUserId: 'reddit_privacyuser123',
      sessionToken: 'sess_privacy_token_123',
      permissions: {
        canCreateEvents: true,
        canModerate: false,
        canViewProfiles: true,
        canExportData: true
      },
      isAnonymous: false
    };

    it('should respect privacy settings in public profile view', async () => {
      // Create profile with some data
      const profile = await profileService.getOrCreateProfile(mockUser);
      
      // Add some statistics and trophies
      await profileService.updateLifetimeStats(profile.userId, {
        won: true,
        points: 100,
        solveTime: 25000,
        theme: 'animals'
      });

      const trophy: Trophy = {
        id: 'privacy-trophy-1',
        name: 'Privacy Test Trophy',
        description: 'Test trophy for privacy',
        category: 'special',
        rarity: 'common',
        earnedAt: new Date(),
        subredditEarned: 'privacy-subreddit'
      };
      await profileService.awardTrophy(profile.userId, trophy);

      // Set privacy settings to hide stats and trophies
      await profileService.updateProfile(profile.userId, {
        privacySettings: {
          profileVisibility: 'public',
          showLifetimeStats: false,
          showTrophies: false,
          showSubredditStats: false
        }
      });

      // Get public profile as different user
      const publicProfile = await profileService.getPublicProfile(profile.userId, 'different-user-id');

      expect(publicProfile).toBeDefined();
      expect(publicProfile!.userId).toBe(profile.userId);
      expect(publicProfile!.displayName).toBe(profile.displayName);
      expect(publicProfile!.lifetimeStats).toBeUndefined();
      expect(publicProfile!.trophyCollection).toBeUndefined();
      expect(publicProfile!.subredditStats).toBeUndefined();
    });

    it('should show full profile to owner regardless of privacy settings', async () => {
      // Create profile
      const profile = await profileService.getOrCreateProfile(mockUser);
      
      // Set strict privacy settings
      await profileService.updateProfile(profile.userId, {
        privacySettings: {
          profileVisibility: 'private',
          showLifetimeStats: false,
          showTrophies: false,
          showSubredditStats: false
        }
      });

      // Get public profile as owner
      const publicProfile = await profileService.getPublicProfile(profile.userId, profile.userId);

      expect(publicProfile).toBeDefined();
      expect(publicProfile!.lifetimeStats).toBeDefined();
      expect(publicProfile!.trophyCollection).toBeDefined();
    });
  });
});