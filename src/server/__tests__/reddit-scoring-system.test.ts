import {
  RedditScoringSystem,
  ScoringConfig,
  LeaderboardDisplayConfig,
  TrophyConfig,
  PlayerScore,
  RoundScore,
  Achievement
} from '../core/reddit-scoring-system';
import { RedditComplianceService } from '../core/reddit-compliance-service';
import { RedditPostCommentService } from '../core/reddit-post-comment-service';
import { DevvitContext, GameThread, LeaderboardData } from '../../shared/types/reddit-compliance';

// Mock the dependencies
jest.mock('../core/reddit-compliance-service');
jest.mock('../core/reddit-post-comment-service');

describe('RedditScoringSystem', () => {
  let scoringSystem: RedditScoringSystem;
  let mockComplianceService: jest.Mocked<RedditComplianceService>;
  let mockPostCommentService: jest.Mocked<RedditPostCommentService>;

  const mockContext: DevvitContext = {
    postId: 'test_post_123',
    subreddit: 'test_subreddit',
    userId: 'test_user_123',
    moderatorPermissions: {
      canManagePosts: true,
      canManageComments: true,
      canManageUsers: true,
      canManageSettings: true,
      canViewModLog: true
    }
  };

  const mockGameThread: GameThread = {
    postId: 'test_post_123',
    gameCommentId: 'game_comment_123',
    rulesCommentId: 'rules_comment_123',
    statusCommentId: 'status_comment_123',
    leaderboardCommentId: 'leaderboard_comment_123',
    roundCommentIds: ['round1_comment', 'round2_comment'],
    submissionCommentIds: ['sub1_comment', 'sub2_comment'],
    lastUpdateTime: new Date()
  };

  const testScoringConfig: Partial<ScoringConfig> = {
    roundWinPoints: 15,
    participationPoints: 2,
    creativityBonusPoints: 8,
    speedBonusPoints: 5,
    difficultyMultipliers: {
      easy: 1.0,
      medium: 1.5,
      hard: 2.0
    },
    upvoteBonus: 1.0,
    commentEngagementBonus: 0.5
  };

  const testLeaderboardConfig: Partial<LeaderboardDisplayConfig> = {
    maxEntries: 5,
    showAchievements: true,
    redditCommentFormat: 'table'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mocked instances
    mockComplianceService = new RedditComplianceService() as jest.Mocked<RedditComplianceService>;
    mockPostCommentService = new RedditPostCommentService() as jest.Mocked<RedditPostCommentService>;

    // Create scoring system with test config
    scoringSystem = new RedditScoringSystem(testScoringConfig, testLeaderboardConfig);

    // Replace the private services with mocks
    (scoringSystem as any).complianceService = mockComplianceService;
    (scoringSystem as any).postCommentService = mockPostCommentService;
  });

  describe('calculateSubmissionScore', () => {
    const gameId = 'test_game_123';
    const playerId = 'player_456';
    const roundNumber = 1;

    it('should calculate score for winning submission', async () => {
      const submissionData = {
        submissionTime: new Date(),
        isWinner: true,
        difficulty: 'medium' as const,
        submissionUrl: 'https://reddit.com/media/test.jpg',
        commentId: 'submission_comment_123'
      };

      const result = await scoringSystem.calculateSubmissionScore(
        gameId,
        playerId,
        roundNumber,
        submissionData,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        // Base points: (participation + win) * difficulty multiplier
        // (2 + 15) * 1.5 = 25.5 -> 25 (rounded down)
        expect(result.data.basePoints).toBe(25.5);
        expect(result.data.isWinner).toBe(true);
        expect(result.data.roundNumber).toBe(roundNumber);
        expect(result.data.totalPoints).toBeGreaterThan(result.data.basePoints);
        expect(result.data.speedBonus).toBeGreaterThanOrEqual(0);
        expect(result.data.creativityBonus).toBeGreaterThanOrEqual(0);
        expect(result.data.upvoteBonus).toBeGreaterThanOrEqual(0);
      }
    });

    it('should calculate score for participation-only submission', async () => {
      const submissionData = {
        submissionTime: new Date(),
        isWinner: false,
        difficulty: 'easy' as const,
        submissionUrl: 'https://reddit.com/media/test2.jpg'
      };

      const result = await scoringSystem.calculateSubmissionScore(
        gameId,
        playerId,
        roundNumber,
        submissionData,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        // Base points: participation only * difficulty multiplier
        // 2 * 1.0 = 2
        expect(result.data.basePoints).toBe(2);
        expect(result.data.isWinner).toBe(false);
        expect(result.data.totalPoints).toBeGreaterThanOrEqual(result.data.basePoints);
      }
    });

    it('should apply difficulty multipliers correctly', async () => {
      const easySubmission = {
        submissionTime: new Date(),
        isWinner: true,
        difficulty: 'easy' as const,
        submissionUrl: 'https://reddit.com/media/easy.jpg'
      };

      const hardSubmission = {
        submissionTime: new Date(),
        isWinner: true,
        difficulty: 'hard' as const,
        submissionUrl: 'https://reddit.com/media/hard.jpg'
      };

      const easyResult = await scoringSystem.calculateSubmissionScore(
        gameId,
        'player_easy',
        1,
        easySubmission,
        mockContext
      );

      const hardResult = await scoringSystem.calculateSubmissionScore(
        gameId,
        'player_hard',
        1,
        hardSubmission,
        mockContext
      );

      expect(easyResult.success).toBe(true);
      expect(hardResult.success).toBe(true);

      if (easyResult.data && hardResult.data) {
        // Hard should have 2x the base points of easy
        expect(hardResult.data.basePoints).toBe(easyResult.data.basePoints * 2);
      }
    });

    it('should update player score and statistics', async () => {
      const submissionData = {
        submissionTime: new Date(),
        isWinner: true,
        difficulty: 'medium' as const,
        submissionUrl: 'https://reddit.com/media/winner.jpg'
      };

      await scoringSystem.calculateSubmissionScore(
        gameId,
        playerId,
        roundNumber,
        submissionData,
        mockContext
      );

      const playerScore = scoringSystem.getPlayerScore(gameId, playerId);
      expect(playerScore).toBeDefined();

      if (playerScore) {
        expect(playerScore.playerId).toBe(playerId);
        expect(playerScore.totalScore).toBeGreaterThan(0);
        expect(playerScore.roundScores).toHaveLength(1);
        expect(playerScore.statistics.totalSubmissions).toBe(1);
        expect(playerScore.statistics.totalWins).toBe(1);
        expect(playerScore.statistics.winRate).toBe(1);
        expect(playerScore.statistics.currentWinStreak).toBe(1);
      }
    });
  });

  describe('updateLeaderboardDisplay', () => {
    const gameId = 'test_game_456';

    beforeEach(async () => {
      // Set up some player scores
      await scoringSystem.calculateSubmissionScore(
        gameId,
        'player1',
        1,
        { submissionTime: new Date(), isWinner: true, difficulty: 'hard', submissionUrl: 'url1' },
        mockContext
      );

      await scoringSystem.calculateSubmissionScore(
        gameId,
        'player2',
        1,
        { submissionTime: new Date(), isWinner: false, difficulty: 'medium', submissionUrl: 'url2' },
        mockContext
      );

      await scoringSystem.calculateSubmissionScore(
        gameId,
        'player3',
        1,
        { submissionTime: new Date(), isWinner: false, difficulty: 'easy', submissionUrl: 'url3' },
        mockContext
      );
    });

    it('should update leaderboard display with Reddit comment formatting', async () => {
      mockPostCommentService.postLeaderboardUpdate.mockResolvedValue({
        success: true,
        data: 'leaderboard_comment_456'
      });

      const result = await scoringSystem.updateLeaderboardDisplay(gameId, mockGameThread, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('leaderboard_comment_456');

      expect(mockPostCommentService.postLeaderboardUpdate).toHaveBeenCalledWith(
        mockGameThread,
        expect.objectContaining({
          gameId,
          entries: expect.arrayContaining([
            expect.objectContaining({
              rank: expect.any(Number),
              playerId: expect.any(String),
              score: expect.any(Number)
            })
          ])
        })
      );
    });

    it('should fail when leaderboard generation fails', async () => {
      // Clear game scores to simulate failure
      (scoringSystem as any).gameScores.delete(gameId);

      const result = await scoringSystem.updateLeaderboardDisplay(gameId, mockGameThread, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate leaderboard data');
    });

    it('should fail when comment update fails', async () => {
      mockPostCommentService.postLeaderboardUpdate.mockResolvedValue({
        success: false,
        error: 'Comment update failed'
      });

      const result = await scoringSystem.updateLeaderboardDisplay(gameId, mockGameThread, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Comment update failed');
    });
  });

  describe('awardTrophy', () => {
    const gameId = 'test_game_789';
    const playerId = 'player_trophy';
    const trophyId = 'winner_trophy';

    beforeEach(() => {
      // Set up trophy configuration
      const trophyConfig = (scoringSystem as any).trophyConfig as TrophyConfig;
      trophyConfig.customTrophies.set(trophyId, {
        id: trophyId,
        name: 'Winner Trophy',
        description: 'Awarded for winning the game',
        icon: '🏆',
        rarity: 'gold',
        redditAwardId: 'reddit_gold_award',
        criteria: {
          type: 'score',
          threshold: 100
        }
      });
    });

    it('should award trophy and integrate with Reddit achievements', async () => {
      const result = await scoringSystem.awardTrophy(playerId, trophyId, gameId, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.name).toBe('Winner Trophy');
        expect(result.data.description).toBe('Awarded for winning the game');
        expect(result.data.rarity).toBe('epic'); // gold maps to epic
        expect(result.data.redditBadgeId).toBe('reddit_gold_award');
        expect(result.data.points).toBeGreaterThan(0);
      }

      // Check that achievement was added to player
      const achievements = scoringSystem.getPlayerAchievements(playerId);
      expect(achievements).toHaveLength(1);
      expect(achievements[0].name).toBe('Winner Trophy');
    });

    it('should fail when trophy definition not found', async () => {
      const result = await scoringSystem.awardTrophy(playerId, 'nonexistent_trophy', gameId, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trophy definition not found');
    });
  });

  describe('announceGameResults', () => {
    const gameId = 'test_game_results';

    beforeEach(async () => {
      // Set up game with multiple players and scores
      await scoringSystem.calculateSubmissionScore(
        gameId,
        'winner_player',
        1,
        { submissionTime: new Date(), isWinner: true, difficulty: 'hard', submissionUrl: 'winner_url' },
        mockContext
      );

      await scoringSystem.calculateSubmissionScore(
        gameId,
        'second_player',
        1,
        { submissionTime: new Date(), isWinner: false, difficulty: 'medium', submissionUrl: 'second_url' },
        mockContext
      );

      await scoringSystem.calculateSubmissionScore(
        gameId,
        'third_player',
        1,
        { submissionTime: new Date(), isWinner: false, difficulty: 'easy', submissionUrl: 'third_url' },
        mockContext
      );
    });

    it('should announce game results with Reddit-native formatting', async () => {
      mockPostCommentService.submitGameComment.mockResolvedValue({
        success: true,
        data: {
          commentId: 'results_comment_123',
          commentUrl: 'https://reddit.com/comments/results',
          parentId: mockGameThread.gameCommentId,
          text: 'Game results',
          author: 'GameBot',
          createdAt: new Date()
        }
      });

      const result = await scoringSystem.announceGameResults(gameId, mockGameThread, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('results_comment_123');

      expect(mockPostCommentService.submitGameComment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system_update',
          text: expect.stringContaining('GAME COMPLETED'),
          parentId: mockGameThread.gameCommentId,
          distinguish: true,
          sticky: true
        })
      );

      // Verify the results text contains expected elements
      const call = mockPostCommentService.submitGameComment.mock.calls[0][0];
      expect(call.text).toContain('WINNER:');
      expect(call.text).toContain('TOP PLAYERS:');
      expect(call.text).toContain('GAME STATISTICS:');
      expect(call.text).toContain('🥇');
      expect(call.text).toContain('🥈');
      expect(call.text).toContain('🥉');
    });

    it('should award trophies to top players', async () => {
      mockPostCommentService.submitGameComment.mockResolvedValue({
        success: true,
        data: {
          commentId: 'results_comment_456',
          commentUrl: 'https://reddit.com/comments/results',
          parentId: mockGameThread.gameCommentId,
          text: 'Game results',
          author: 'GameBot',
          createdAt: new Date()
        }
      });

      await scoringSystem.announceGameResults(gameId, mockGameThread, mockContext);

      // Check that trophies were awarded
      const winnerAchievements = scoringSystem.getPlayerAchievements('winner_player');
      const secondAchievements = scoringSystem.getPlayerAchievements('second_player');
      const thirdAchievements = scoringSystem.getPlayerAchievements('third_player');

      expect(winnerAchievements.length).toBeGreaterThan(0);
      expect(secondAchievements.length).toBeGreaterThan(0);
      expect(thirdAchievements.length).toBeGreaterThan(0);

      // Winner should have gold trophy
      const goldTrophy = winnerAchievements.find(a => a.name === 'Gold Medal');
      expect(goldTrophy).toBeDefined();
    });

    it('should fail when leaderboard generation fails', async () => {
      // Clear game scores
      (scoringSystem as any).gameScores.delete(gameId);

      const result = await scoringSystem.announceGameResults(gameId, mockGameThread, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate final leaderboard');
    });
  });

  describe('leaderboard formatting', () => {
    const gameId = 'format_test_game';

    beforeEach(async () => {
      // Set up players with different scores
      const players = [
        { id: 'player1', score: 100, wins: 5 },
        { id: 'player2', score: 80, wins: 3 },
        { id: 'player3', score: 60, wins: 2 }
      ];

      for (const player of players) {
        for (let i = 0; i < player.wins; i++) {
          await scoringSystem.calculateSubmissionScore(
            gameId,
            player.id,
            i + 1,
            { submissionTime: new Date(), isWinner: true, difficulty: 'medium', submissionUrl: `url_${i}` },
            mockContext
          );
        }
      }
    });

    it('should format leaderboard as table', async () => {
      const leaderboard = await scoringSystem.getGameLeaderboard(gameId);
      expect(leaderboard.success).toBe(true);

      if (leaderboard.data) {
        const formatted = (scoringSystem as any).formatLeaderboardForReddit(leaderboard.data);
        
        expect(formatted).toContain('LEADERBOARD');
        expect(formatted).toContain('| Rank | Player | Score |');
        expect(formatted).toContain('|------|--------|-------|');
        expect(formatted).toContain('player1');
        expect(formatted).toContain('player2');
        expect(formatted).toContain('player3');
      }
    });

    it('should format leaderboard as list', async () => {
      // Update config to use list format
      scoringSystem.updateLeaderboardConfig({ redditCommentFormat: 'list' });

      const leaderboard = await scoringSystem.getGameLeaderboard(gameId);
      expect(leaderboard.success).toBe(true);

      if (leaderboard.data) {
        const formatted = (scoringSystem as any).formatLeaderboardForReddit(leaderboard.data);
        
        expect(formatted).toContain('LEADERBOARD');
        expect(formatted).toContain('🥇');
        expect(formatted).toContain('🥈');
        expect(formatted).toContain('🥉');
        expect(formatted).toContain('1. player1');
        expect(formatted).toContain('Score:');
        expect(formatted).toContain('Wins:');
      }
    });

    it('should format leaderboard in compact format', async () => {
      // Update config to use compact format
      scoringSystem.updateLeaderboardConfig({ redditCommentFormat: 'compact' });

      const leaderboard = await scoringSystem.getGameLeaderboard(gameId);
      expect(leaderboard.success).toBe(true);

      if (leaderboard.data) {
        const formatted = (scoringSystem as any).formatLeaderboardForReddit(leaderboard.data);
        
        expect(formatted).toContain('LEADERBOARD');
        expect(formatted).toContain('🥇player1');
        expect(formatted).toContain('🥈player2');
        expect(formatted).toContain('🥉player3');
        expect(formatted).toContain('|');
        expect(formatted).toContain('Updated:');
      }
    });
  });

  describe('configuration management', () => {
    it('should update scoring configuration', () => {
      const newConfig: Partial<ScoringConfig> = {
        roundWinPoints: 20,
        participationPoints: 3,
        upvoteBonus: 2.0
      };

      scoringSystem.updateScoringConfig(newConfig);

      // Test that new config is applied
      const currentConfig = (scoringSystem as any).scoringConfig;
      expect(currentConfig.roundWinPoints).toBe(20);
      expect(currentConfig.participationPoints).toBe(3);
      expect(currentConfig.upvoteBonus).toBe(2.0);
      // Other values should remain unchanged
      expect(currentConfig.creativityBonusPoints).toBe(8);
    });

    it('should update leaderboard configuration', () => {
      const newConfig: Partial<LeaderboardDisplayConfig> = {
        maxEntries: 15,
        redditCommentFormat: 'compact',
        showAchievements: false
      };

      scoringSystem.updateLeaderboardConfig(newConfig);

      const currentConfig = (scoringSystem as any).leaderboardConfig;
      expect(currentConfig.maxEntries).toBe(15);
      expect(currentConfig.redditCommentFormat).toBe('compact');
      expect(currentConfig.showAchievements).toBe(false);
    });
  });

  describe('data management', () => {
    const gameId = 'data_test_game';

    beforeEach(async () => {
      // Set up some test data
      await scoringSystem.calculateSubmissionScore(
        gameId,
        'test_player',
        1,
        { submissionTime: new Date(), isWinner: true, difficulty: 'medium', submissionUrl: 'test_url' },
        mockContext
      );
    });

    it('should get player score', () => {
      const playerScore = scoringSystem.getPlayerScore(gameId, 'test_player');
      expect(playerScore).toBeDefined();
      expect(playerScore?.playerId).toBe('test_player');
      expect(playerScore?.totalScore).toBeGreaterThan(0);
    });

    it('should get player achievements', () => {
      const achievements = scoringSystem.getPlayerAchievements('test_player');
      expect(Array.isArray(achievements)).toBe(true);
      // Should have first submission achievement
      expect(achievements.some(a => a.name === 'First Steps')).toBe(true);
    });

    it('should clear game data', () => {
      // Verify data exists
      expect(scoringSystem.getPlayerScore(gameId, 'test_player')).toBeDefined();

      // Clear data
      scoringSystem.clearGameData(gameId);

      // Verify data is cleared
      expect(scoringSystem.getPlayerScore(gameId, 'test_player')).toBeUndefined();
    });
  });
});