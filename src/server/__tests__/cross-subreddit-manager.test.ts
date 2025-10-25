// Tests for CrossSubredditManager

import { CrossSubredditManager } from '../core/cross-subreddit-manager';
import { SubredditStats } from '../../shared/types/profile';

describe('CrossSubredditManager', () => {
  let manager: CrossSubredditManager;

  beforeEach(() => {
    manager = new CrossSubredditManager();
  });

  describe('getGlobalProfile', () => {
    it('should return null for non-existent user', async () => {
      const result = await manager.getGlobalProfile('non-existent-user');
      expect(result).toBeNull();
    });
  });

  describe('getSubredditProfile', () => {
    it('should return null for non-existent subreddit profile', async () => {
      const result = await manager.getSubredditProfile('user123', 'test-subreddit');
      expect(result).toBeNull();
    });
  });

  describe('createOrUpdateSubredditProfile', () => {
    it('should create new subreddit profile with default values', async () => {
      const userId = 'test-user-123';
      const subredditName = 'test-subreddit';
      const stats: Partial<SubredditStats> = {
        matches: 5,
        wins: 3,
        points: 150
      };

      const result = await manager.createOrUpdateSubredditProfile(userId, subredditName, stats);

      expect(result).toBeDefined();
      expect(result.subredditName).toBe(subredditName);
      expect(result.matches).toBe(5);
      expect(result.wins).toBe(3);
      expect(result.points).toBe(150);
      expect(result.rank).toBe(0); // Default value
      expect(result.trophies).toEqual([]); // Default value
      expect(result.specialBadges).toEqual([]); // Default value
      expect(result.joinedAt).toBeInstanceOf(Date);
      expect(result.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should update existing subreddit profile', async () => {
      const userId = 'test-user-456';
      const subredditName = 'test-subreddit-2';
      
      // Create initial profile
      const initialStats: Partial<SubredditStats> = {
        matches: 2,
        wins: 1,
        points: 50
      };
      
      await manager.createOrUpdateSubredditProfile(userId, subredditName, initialStats);

      // Update the profile
      const updateStats: Partial<SubredditStats> = {
        matches: 5,
        wins: 4,
        points: 200,
        rank: 1
      };

      const result = await manager.createOrUpdateSubredditProfile(userId, subredditName, updateStats);

      expect(result.matches).toBe(5);
      expect(result.wins).toBe(4);
      expect(result.points).toBe(200);
      expect(result.rank).toBe(1);
    });
  });

  describe('recordSubredditActivity', () => {
    it('should record activity for new user in subreddit', async () => {
      const userId = 'activity-user-123';
      const subredditName = 'activity-subreddit';
      const activity = {
        matchesPlayed: 3,
        wins: 2,
        points: 120,
        newRank: 5
      };

      await manager.recordSubredditActivity(userId, subredditName, activity);

      const profile = await manager.getSubredditProfile(userId, subredditName);
      expect(profile).toBeDefined();
      expect(profile!.matches).toBe(3);
      expect(profile!.wins).toBe(2);
      expect(profile!.points).toBe(120);
      expect(profile!.rank).toBe(5);
    });

    it('should accumulate activity for existing user', async () => {
      const userId = 'activity-user-456';
      const subredditName = 'activity-subreddit-2';
      
      // Record initial activity
      await manager.recordSubredditActivity(userId, subredditName, {
        matchesPlayed: 2,
        wins: 1,
        points: 50
      });

      // Record additional activity
      await manager.recordSubredditActivity(userId, subredditName, {
        matchesPlayed: 3,
        wins: 2,
        points: 100
      });

      const profile = await manager.getSubredditProfile(userId, subredditName);
      expect(profile).toBeDefined();
      expect(profile!.matches).toBe(5); // 2 + 3
      expect(profile!.wins).toBe(3); // 1 + 2
      expect(profile!.points).toBe(150); // 50 + 100
    });
  });

  describe('getCrossSubredditLeaderboard', () => {
    it('should return empty array when no users exist', async () => {
      const leaderboard = await manager.getCrossSubredditLeaderboard(10);
      expect(leaderboard).toEqual([]);
    });
  });
});