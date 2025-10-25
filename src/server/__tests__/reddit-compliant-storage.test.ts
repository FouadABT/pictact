/**
 * Tests for Reddit-Compliant Storage Service
 */

import { RedditCompliantStorageService } from '../core/reddit-compliant-storage.js';
import {
  RedditCompliantProfile,
  RedditCompliantSession,
  SubredditGameStats,
  RedditCompliantTrophy,
  GameStatus
} from '../../shared/types/reddit-compliant-data.js';

describe('RedditCompliantStorageService', () => {
  let storageService: RedditCompliantStorageService;

  beforeEach(() => {
    storageService = new RedditCompliantStorageService();
    // Clear all data before each test
    RedditCompliantStorageService.clearAllData();
  });

  afterEach(() => {
    // Clean up after each test
    RedditCompliantStorageService.clearAllData();
  });

  describe('Profile Management', () => {
    test('should create Reddit-compliant profile without Reddit IDs', async () => {
      const profile = await storageService.createRedditCompliantProfile(
        'TestUser',
        'testsubreddit'
      );

      expect(profile).toBeDefined();
      expect(profile.profileId).toMatch(/^profile_/);
      expect(profile.displayName).toBe('TestUser');
      expect(profile.privacySettings.redactRedditIdentifiers).toBe(true);
      expect(profile.privacySettings.isolateSubredditData).toBe(true);
      expect(profile.gameStats.subredditStats.size).toBe(1);
      expect(profile.gameStats.subredditStats.has('testsubreddit')).toBe(true);
    });

    test('should retrieve Reddit-compliant profile by ID', async () => {
      const createdProfile = await storageService.createRedditCompliantProfile('TestUser');
      const retrievedProfile = await storageService.getRedditCompliantProfile(createdProfile.profileId);

      expect(retrievedProfile).toBeDefined();
      expect(retrievedProfile!.profileId).toBe(createdProfile.profileId);
      expect(retrievedProfile!.displayName).toBe('TestUser');
    });

    test('should return null for non-existent profile', async () => {
      const profile = await storageService.getRedditCompliantProfile('non-existent-id');
      expect(profile).toBeNull();
    });

    test('should update Reddit-compliant profile', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');
      
      const updatedProfile = await storageService.updateRedditCompliantProfile(profile.profileId, {
        displayName: 'UpdatedUser'
      });

      expect(updatedProfile.displayName).toBe('UpdatedUser');
      expect(updatedProfile.profileId).toBe(profile.profileId);
      expect(updatedProfile.lastProfileUpdate.getTime()).toBeGreaterThan(profile.lastProfileUpdate.getTime());
    });

    test('should delete Reddit-compliant profile and cleanup subreddit data', async () => {
      const profile = await storageService.createRedditCompliantProfile(
        'TestUser',
        'testsubreddit'
      );

      await storageService.deleteRedditCompliantProfile(profile.profileId);

      const deletedProfile = await storageService.getRedditCompliantProfile(profile.profileId);
      expect(deletedProfile).toBeNull();

      const subredditProfile = await storageService.getSubredditProfile(profile.profileId, 'testsubreddit');
      expect(subredditProfile).toBeNull();
    });
  });

  describe('Subreddit Data Isolation', () => {
    test('should manage subreddit-specific profile data', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');
      
      const subredditStats: SubredditGameStats = {
        subredditName: 'gaming',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 5,
        wins: 3,
        points: 150,
        rank: 10,
        winRate: 0.6,
        averageSolveTime: 45.5,
        bestStreak: 3,
        currentStreak: 1,
        trophies: [],
        specialBadges: []
      };

      await storageService.updateSubredditProfile(profile.profileId, 'gaming', subredditStats);

      const retrievedStats = await storageService.getSubredditProfile(profile.profileId, 'gaming');
      expect(retrievedStats).toBeDefined();
      expect(retrievedStats!.subredditName).toBe('gaming');
      expect(retrievedStats!.matches).toBe(5);
      expect(retrievedStats!.wins).toBe(3);
      expect(retrievedStats!.winRate).toBe(0.6);

      // Verify main profile was updated
      const updatedProfile = await storageService.getRedditCompliantProfile(profile.profileId);
      expect(updatedProfile!.gameStats.subredditStats.has('gaming')).toBe(true);
    });

    test('should isolate data between different subreddits', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');
      
      const gamingStats: SubredditGameStats = {
        subredditName: 'gaming',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 5,
        wins: 3,
        points: 150,
        rank: 10,
        winRate: 0.6,
        averageSolveTime: 45.5,
        bestStreak: 3,
        currentStreak: 1,
        trophies: [],
        specialBadges: []
      };

      const photosStats: SubredditGameStats = {
        subredditName: 'photos',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 8,
        wins: 2,
        points: 80,
        rank: 25,
        winRate: 0.25,
        averageSolveTime: 60.0,
        bestStreak: 2,
        currentStreak: 0,
        trophies: [],
        specialBadges: []
      };

      await storageService.updateSubredditProfile(profile.profileId, 'gaming', gamingStats);
      await storageService.updateSubredditProfile(profile.profileId, 'photos', photosStats);

      const gamingRetrieved = await storageService.getSubredditProfile(profile.profileId, 'gaming');
      const photosRetrieved = await storageService.getSubredditProfile(profile.profileId, 'photos');

      expect(gamingRetrieved!.matches).toBe(5);
      expect(photosRetrieved!.matches).toBe(8);
      expect(gamingRetrieved!.winRate).toBe(0.6);
      expect(photosRetrieved!.winRate).toBe(0.25);

      // Verify both subreddits exist in main profile
      const updatedProfile = await storageService.getRedditCompliantProfile(profile.profileId);
      expect(updatedProfile!.gameStats.subredditStats.size).toBe(2);
      expect(updatedProfile!.gameStats.subredditStats.has('gaming')).toBe(true);
      expect(updatedProfile!.gameStats.subredditStats.has('photos')).toBe(true);
    });
  });

  describe('Session Management', () => {
    test('should create Reddit-compliant session', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');
      
      const session = await storageService.createRedditCompliantSession(
        profile.profileId,
        'testsubreddit',
        false
      );

      expect(session).toBeDefined();
      expect(session.sessionId).toMatch(/^session_/);
      expect(session.profileId).toBe(profile.profileId);
      expect(session.currentSubreddit).toBe('testsubreddit');
      expect(session.isAnonymous).toBe(false);
      expect(session.subredditContext).toBe('testsubreddit');
    });

    test('should retrieve and validate session', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');
      const createdSession = await storageService.createRedditCompliantSession(
        profile.profileId,
        'testsubreddit'
      );

      const retrievedSession = await storageService.getRedditCompliantSession(createdSession.sessionId);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession!.sessionId).toBe(createdSession.sessionId);
      expect(retrievedSession!.profileId).toBe(profile.profileId);
    });

    test('should return null for expired session', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');
      const session = await storageService.createRedditCompliantSession(
        profile.profileId,
        'testsubreddit'
      );

      // Manually expire the session
      session.expiresAt = new Date(Date.now() - 1000); // 1 second ago
      const sessionKey = `reddit_compliant_session:${session.sessionId}`;
      RedditCompliantStorageService['sessions'].set(sessionKey, JSON.stringify(session));

      const expiredSession = await storageService.getRedditCompliantSession(session.sessionId);
      expect(expiredSession).toBeNull();
    });

    test('should update session activity', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');
      const session = await storageService.createRedditCompliantSession(
        profile.profileId,
        'testsubreddit'
      );

      const originalLastActive = session.lastActiveAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await storageService.updateSessionActivity(session.sessionId);

      const updatedSession = await storageService.getRedditCompliantSession(session.sessionId);
      expect(updatedSession!.lastActiveAt.getTime()).toBeGreaterThan(originalLastActive.getTime());
    });

    test('should delete session', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');
      const session = await storageService.createRedditCompliantSession(
        profile.profileId,
        'testsubreddit'
      );

      await storageService.deleteSession(session.sessionId);

      const deletedSession = await storageService.getRedditCompliantSession(session.sessionId);
      expect(deletedSession).toBeNull();
    });
  });

  describe('Trophy Management', () => {
    test('should add trophy to Reddit-compliant profile', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');
      
      const trophy: RedditCompliantTrophy = {
        id: 'first-win',
        name: 'First Victory',
        description: 'Won your first match',
        category: 'milestone',
        rarity: 'common',
        earnedAt: new Date(),
        subredditEarned: 'gaming'
      };

      await storageService.addTrophy(profile.profileId, trophy);

      const updatedProfile = await storageService.getRedditCompliantProfile(profile.profileId);
      expect(updatedProfile!.trophyCollection).toHaveLength(1);
      expect(updatedProfile!.trophyCollection[0].id).toBe('first-win');
      expect(updatedProfile!.trophyCollection[0].name).toBe('First Victory');
    });

    test('should not add duplicate trophy', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');
      
      const trophy: RedditCompliantTrophy = {
        id: 'first-win',
        name: 'First Victory',
        description: 'Won your first match',
        category: 'milestone',
        rarity: 'common',
        earnedAt: new Date()
      };

      await storageService.addTrophy(profile.profileId, trophy);
      await storageService.addTrophy(profile.profileId, trophy); // Try to add again

      const updatedProfile = await storageService.getRedditCompliantProfile(profile.profileId);
      expect(updatedProfile!.trophyCollection).toHaveLength(1);
    });
  });

  describe('Privacy and Compliance', () => {
    test('should enforce Reddit compliance settings', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');

      expect(profile.privacySettings.redactRedditIdentifiers).toBe(true);
      expect(profile.privacySettings.isolateSubredditData).toBe(true);
      expect(profile.profileId).not.toMatch(/^u\//); // Should not start with Reddit username pattern
      expect(profile.profileId).not.toMatch(/^[0-9a-z]{6,}$/); // Should not look like Reddit user ID
    });

    test('should generate app-specific profile IDs', async () => {
      const profile1 = await storageService.createRedditCompliantProfile('User1');
      const profile2 = await storageService.createRedditCompliantProfile('User2');

      expect(profile1.profileId).toMatch(/^profile_/);
      expect(profile2.profileId).toMatch(/^profile_/);
      expect(profile1.profileId).not.toBe(profile2.profileId);
    });

    test('should maintain subreddit context isolation', async () => {
      const profile = await storageService.createRedditCompliantProfile('TestUser');
      
      // Add data for multiple subreddits
      const subreddit1Stats: SubredditGameStats = {
        subredditName: 'subreddit1',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 5,
        wins: 3,
        points: 150,
        rank: 10,
        winRate: 0.6,
        averageSolveTime: 45.5,
        bestStreak: 3,
        currentStreak: 1,
        trophies: [],
        specialBadges: []
      };

      const subreddit2Stats: SubredditGameStats = {
        subredditName: 'subreddit2',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 10,
        wins: 1,
        points: 50,
        rank: 50,
        winRate: 0.1,
        averageSolveTime: 90.0,
        bestStreak: 1,
        currentStreak: 0,
        trophies: [],
        specialBadges: []
      };

      await storageService.updateSubredditProfile(profile.profileId, 'subreddit1', subreddit1Stats);
      await storageService.updateSubredditProfile(profile.profileId, 'subreddit2', subreddit2Stats);

      // Verify data isolation
      const sub1Data = await storageService.getSubredditProfile(profile.profileId, 'subreddit1');
      const sub2Data = await storageService.getSubredditProfile(profile.profileId, 'subreddit2');

      expect(sub1Data!.matches).toBe(5);
      expect(sub2Data!.matches).toBe(10);
      expect(sub1Data!.winRate).toBe(0.6);
      expect(sub2Data!.winRate).toBe(0.1);

      // Verify no cross-contamination
      expect(sub1Data!.subredditName).toBe('subreddit1');
      expect(sub2Data!.subredditName).toBe('subreddit2');
    });
  });

  describe('Error Handling', () => {
    test('should handle profile not found errors gracefully', async () => {
      await expect(
        storageService.updateRedditCompliantProfile('non-existent', { displayName: 'Test' })
      ).rejects.toThrow('Profile not found: non-existent');
    });

    test('should handle trophy addition to non-existent profile', async () => {
      const trophy: RedditCompliantTrophy = {
        id: 'test-trophy',
        name: 'Test Trophy',
        description: 'Test description',
        category: 'milestone',
        rarity: 'common',
        earnedAt: new Date()
      };

      await expect(
        storageService.addTrophy('non-existent', trophy)
      ).rejects.toThrow('Profile not found: non-existent');
    });
  });
});