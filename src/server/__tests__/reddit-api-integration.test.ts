import { RedditComplianceService } from '../core/reddit-compliance-service';
import { RedditPostCommentService } from '../core/reddit-post-comment-service';
import { RedditRealTimeService } from '../core/reddit-realtime-service';
import {
  GamePostConfig,
  GameCommentConfig,
  GameCommentType,
  GameThread,
  RoundUpdate,
  LeaderboardData,
  LeaderboardEntry
} from '../../shared/types/reddit-compliance';

// Mock the Devvit web server module
jest.mock('@devvit/web/server', () => ({
  reddit: {
    submitPost: jest.fn(),
    submitComment: jest.fn(),
    getCurrentUsername: jest.fn(),
    getPostById: jest.fn(),
    getComments: jest.fn(),
    uploadMedia: jest.fn()
  },
  context: {
    postId: 't3_integration_test',
    subredditName: 'test_integration'
  }
}));

/**
 * Reddit API Integration Tests
 * Comprehensive tests for Reddit API integration covering all requirements:
 * - 2.1: Reddit post creation for match creation
 * - 2.2: Reddit comment submission for game interactions
 * - 2.3: Structured comment threading for game organization
 * - 2.4: Reddit comment formatting for leaderboards and results
 * - 2.5: Comment polling mechanism for real-time updates
 */
describe('Reddit API Integration Tests', () => {
  let complianceService: RedditComplianceService;
  let postCommentService: RedditPostCommentService;
  let realTimeService: RedditRealTimeService;
  let mockReddit: any;

  beforeEach(() => {
    complianceService = new RedditComplianceService();
    postCommentService = new RedditPostCommentService();
    realTimeService = new RedditRealTimeService();
    
    mockReddit = require('@devvit/web/server').reddit;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockReddit.getCurrentUsername.mockResolvedValue('integration_test_user');
    mockReddit.submitPost.mockResolvedValue({
      id: 'integration_post_123',
      url: 'https://reddit.com/r/test_integration/comments/integration_post_123',
      authorName: 'integration_test_user'
    });
    mockReddit.submitComment.mockResolvedValue({
      id: 'integration_comment_123',
      permalink: 'https://reddit.com/r/test_integration/comments/integration_post_123/integration_comment_123',
      authorName: 'integration_test_user'
    });
    mockReddit.getPostById.mockResolvedValue({
      id: 'integration_post_123',
      createdAt: new Date(),
      title: 'Integration Test Post'
    });
    mockReddit.getComments.mockResolvedValue([]);
  });

  afterEach(() => {
    // Clean up any active polling
    realTimeService.stopAllPolling();
  });

  describe('End-to-End Game Flow Integration', () => {
    it('should complete full game creation and management flow', async () => {
      // Step 1: Create game post (Requirement 2.1)
      const gameConfig: GamePostConfig = {
        title: 'Integration Test PicTact Game',
        description: 'Full integration test of Reddit API functionality',
        gameType: 'pictact',
        duration: 30,
        difficulty: 'medium',
        rules: ['Take original photos', 'Follow prompts exactly', 'Be creative'],
        prizes: ['Winner gets Reddit Gold!']
      };

      const postResult = await postCommentService.createGamePost(gameConfig);
      expect(postResult.success).toBe(true);
      expect(postResult.data?.postId).toBe('integration_post_123');

      // Step 2: Create game thread structure (Requirement 2.3)
      mockReddit.submitComment
        .mockResolvedValueOnce({
          id: 'game_info_comment',
          permalink: '/comment/game_info',
          authorName: 'integration_test_user'
        })
        .mockResolvedValueOnce({
          id: 'rules_comment',
          permalink: '/comment/rules',
          authorName: 'integration_test_user'
        })
        .mockResolvedValueOnce({
          id: 'status_comment',
          permalink: '/comment/status',
          authorName: 'integration_test_user'
        });

      const threadResult = await postCommentService.createGameThread(
        postResult.data!.postId,
        'integration_game_456'
      );
      expect(threadResult.success).toBe(true);
      expect(threadResult.data?.gameCommentId).toBe('game_info_comment');

      // Step 3: Post round update (Requirement 2.2)
      const roundUpdate: RoundUpdate = {
        roundNumber: 1,
        prompt: 'Find a red object in your kitchen',
        timeRemaining: 300,
        submissions: 0,
        status: 'active'
      };

      mockReddit.submitComment.mockResolvedValue({
        id: 'round_comment_123',
        permalink: '/comment/round',
        authorName: 'integration_test_user'
      });

      const roundResult = await postCommentService.postRoundUpdate(
        threadResult.data!,
        roundUpdate
      );
      expect(roundResult.success).toBe(true);
      expect(threadResult.data!.roundCommentIds).toContain('round_comment_123');

      // Step 4: Initialize real-time polling (Requirement 2.5)
      const updateCallback = jest.fn();
      const pollingResult = await realTimeService.initializeGamePolling(
        threadResult.data!,
        updateCallback
      );
      expect(pollingResult.success).toBe(true);

      // Step 5: Post leaderboard update (Requirement 2.4)
      const leaderboardEntries: LeaderboardEntry[] = [
        {
          rank: 1,
          playerId: 'player1',
          username: 'TestPlayer1',
          score: 100,
          wins: 1,
          submissions: 2,
          lastActive: new Date()
        }
      ];

      const leaderboard: LeaderboardData = {
        gameId: 'integration_game_456',
        entries: leaderboardEntries,
        lastUpdated: new Date(),
        totalRounds: 3,
        currentRound: 1
      };

      mockReddit.submitComment.mockResolvedValue({
        id: 'leaderboard_comment_123',
        permalink: '/comment/leaderboard',
        authorName: 'integration_test_user'
      });

      const leaderboardResult = await postCommentService.postLeaderboardUpdate(
        threadResult.data!,
        leaderboard
      );
      expect(leaderboardResult.success).toBe(true);

      // Verify all Reddit API calls were made correctly
      expect(mockReddit.submitPost).toHaveBeenCalledTimes(1);
      expect(mockReddit.submitComment).toHaveBeenCalledTimes(5); // game info, rules, status, round, leaderboard
    });

    it('should handle player submission flow correctly', async () => {
      // Setup game thread
      const gameThread: GameThread = {
        postId: 'integration_post_123',
        gameCommentId: 'game_comment',
        rulesCommentId: 'rules_comment',
        statusCommentId: 'status_comment',
        roundCommentIds: ['round_comment_1'],
        submissionCommentIds: [],
        lastUpdateTime: new Date()
      };

      // Mock player submission
      mockReddit.submitComment.mockResolvedValue({
        id: 'submission_comment_123',
        permalink: '/comment/submission',
        authorName: 'integration_test_user'
      });

      const submissionResult = await postCommentService.handlePlayerSubmission(
        gameThread,
        'player1',
        'https://example.com/red-kitchen-object.jpg',
        1
      );

      expect(submissionResult.success).toBe(true);
      expect(gameThread.submissionCommentIds).toContain('submission_comment_123');

      // Verify comment formatting
      const submittedText = mockReddit.submitComment.mock.calls[0][0].text;
      expect(submittedText).toContain('📸 **Player Submission - Round 1**');
      expect(submittedText).toContain('https://example.com/red-kitchen-object.jpg');
      expect(submittedText).toContain('Player: player1');
    });
  });

  describe('Reddit API Error Handling Integration', () => {
    it('should handle cascading failures gracefully', async () => {
      // Simulate Reddit API being down
      mockReddit.submitPost.mockRejectedValue(new Error('Reddit API unavailable'));
      mockReddit.submitComment.mockRejectedValue(new Error('Reddit API unavailable'));

      const gameConfig: GamePostConfig = {
        title: 'Error Test Game',
        description: 'Testing error handling',
        gameType: 'pictact',
        duration: 30,
        difficulty: 'easy',
        rules: ['Rule 1']
      };

      // Post creation should fail
      const postResult = await postCommentService.createGamePost(gameConfig);
      expect(postResult.success).toBe(false);
      expect(postResult.error).toContain('Reddit API unavailable');

      // Thread creation should also fail
      const threadResult = await postCommentService.createGameThread('fake_post', 'fake_game');
      expect(threadResult.success).toBe(false);
    });

    it('should handle partial failures in game thread creation', async () => {
      // Mock successful post creation but failed comment creation
      mockReddit.submitPost.mockResolvedValue({
        id: 'partial_post_123',
        url: 'https://reddit.com/r/test/comments/partial_post_123',
        authorName: 'test_user'
      });

      // First comment succeeds, second fails
      mockReddit.submitComment
        .mockResolvedValueOnce({
          id: 'game_info_comment',
          permalink: '/comment/game_info',
          authorName: 'test_user'
        })
        .mockRejectedValueOnce(new Error('Comment creation failed'));

      const gameConfig: GamePostConfig = {
        title: 'Partial Failure Test',
        description: 'Testing partial failure handling',
        gameType: 'pictact',
        duration: 30,
        difficulty: 'easy',
        rules: ['Rule 1']
      };

      // Post should succeed
      const postResult = await postCommentService.createGamePost(gameConfig);
      expect(postResult.success).toBe(true);

      // Thread creation should fail at the rules comment
      const threadResult = await postCommentService.createGameThread(
        postResult.data!.postId,
        'partial_game'
      );
      expect(threadResult.success).toBe(false);
      expect(threadResult.error).toContain('Failed to create rules comment');
    });

    it('should handle rate limiting across multiple services', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      // Mock rate limiting for all Reddit API calls
      mockReddit.submitPost.mockRejectedValue(rateLimitError);
      mockReddit.submitComment.mockRejectedValue(rateLimitError);
      mockReddit.getCurrentUsername.mockRejectedValue(rateLimitError);

      // All services should handle rate limiting consistently
      const gameConfig: GamePostConfig = {
        title: 'Rate Limit Test',
        description: 'Testing rate limit handling',
        gameType: 'pictact',
        duration: 30,
        difficulty: 'easy',
        rules: ['Rule 1']
      };

      const postResult = await postCommentService.createGamePost(gameConfig);
      expect(postResult.success).toBe(false);
      expect(postResult.rateLimited).toBe(true);

      const userResult = await complianceService.getCurrentRedditUser();
      expect(userResult.success).toBe(false);
      expect(userResult.error).toContain('Rate limit exceeded');
    });
  });

  describe('Reddit API Response Validation', () => {
    it('should validate Reddit post responses correctly', async () => {
      // Test with missing required fields
      mockReddit.submitPost.mockResolvedValue({
        id: 'incomplete_post',
        // Missing url and authorName
      });

      const gameConfig: GamePostConfig = {
        title: 'Validation Test',
        description: 'Testing response validation',
        gameType: 'pictact',
        duration: 30,
        difficulty: 'easy',
        rules: ['Rule 1']
      };

      const result = await postCommentService.createGamePost(gameConfig);
      expect(result.success).toBe(true); // Should still succeed with partial data
      expect(result.data?.postId).toBe('incomplete_post');
    });

    it('should validate Reddit comment responses correctly', async () => {
      // Test with missing required fields
      mockReddit.submitComment.mockResolvedValue({
        id: 'incomplete_comment',
        // Missing permalink and authorName
      });

      const commentConfig: GameCommentConfig = {
        type: GameCommentType.GAME_INFO,
        text: 'Test comment',
        parentId: 'test_post'
      };

      const result = await postCommentService.submitGameComment(commentConfig);
      expect(result.success).toBe(true); // Should still succeed with partial data
      expect(result.data?.commentId).toBe('incomplete_comment');
    });

    it('should handle null/undefined Reddit API responses', async () => {
      mockReddit.submitPost.mockResolvedValue(null);
      mockReddit.submitComment.mockResolvedValue(undefined);

      const gameConfig: GamePostConfig = {
        title: 'Null Response Test',
        description: 'Testing null response handling',
        gameType: 'pictact',
        duration: 30,
        difficulty: 'easy',
        rules: ['Rule 1']
      };

      const postResult = await postCommentService.createGamePost(gameConfig);
      expect(postResult.success).toBe(false);
      expect(postResult.error).toContain('Failed to create Reddit post');

      const commentConfig: GameCommentConfig = {
        type: GameCommentType.GAME_INFO,
        text: 'Test comment',
        parentId: 'test_post'
      };

      const commentResult = await postCommentService.submitGameComment(commentConfig);
      expect(commentResult.success).toBe(false);
      expect(commentResult.error).toContain('Failed to submit Reddit comment');
    });
  });

  describe('Real-Time Polling Integration', () => {
    it('should integrate polling with comment processing', async () => {
      const gameThread: GameThread = {
        postId: 'polling_test_post',
        gameCommentId: 'game_comment',
        rulesCommentId: 'rules_comment',
        statusCommentId: 'status_comment',
        roundCommentIds: ['round_1'],
        submissionCommentIds: [],
        lastUpdateTime: new Date()
      };

      const mockComments = [
        {
          id: 'new_submission_1',
          text: 'Here is my photo submission!',
          authorName: 'Player1',
          parentId: 'round_1',
          createdUtc: Date.now() / 1000,
          score: 1,
          permalink: '/r/test/comments/123/submission1'
        },
        {
          id: 'status_update_1',
          text: '⏱️ **Game Status**: ACTIVE\n**Round:** 1\n**Submissions:** 1',
          authorName: 'GameBot',
          parentId: 'game_comment',
          createdUtc: Date.now() / 1000,
          score: 1,
          permalink: '/r/test/comments/123/status'
        }
      ];

      mockReddit.getComments.mockResolvedValue(mockComments);

      const updateCallback = jest.fn();
      const pollingResult = await realTimeService.initializeGamePolling(gameThread, updateCallback);
      expect(pollingResult.success).toBe(true);

      // Simulate polling cycle
      jest.useFakeTimers();
      jest.advanceTimersByTime(5000);

      // Verify polling is active
      const status = realTimeService.getPollingStatus(`game_${gameThread.postId}`);
      expect(status?.isActive).toBe(true);

      jest.useRealTimers();
    });

    it('should handle timer synchronization correctly', async () => {
      const gameThread: GameThread = {
        postId: 'timer_test_post',
        gameCommentId: 'game_comment',
        rulesCommentId: 'rules_comment',
        statusCommentId: 'status_comment',
        roundCommentIds: ['round_1'],
        submissionCommentIds: [],
        lastUpdateTime: new Date()
      };

      const syncResult = await realTimeService.synchronizeClientTimer(gameThread);
      expect(syncResult.success).toBe(true);
      expect(syncResult.data?.serverTime).toBeInstanceOf(Date);
      expect(syncResult.data?.gameStartTime).toBeInstanceOf(Date);
    });

    it('should post game state changes correctly', async () => {
      const gameThread: GameThread = {
        postId: 'state_test_post',
        gameCommentId: 'game_comment',
        rulesCommentId: 'rules_comment',
        statusCommentId: 'status_comment',
        roundCommentIds: [],
        submissionCommentIds: [],
        lastUpdateTime: new Date()
      };

      mockReddit.submitComment.mockResolvedValue({
        id: 'state_comment_123',
        permalink: '/comment/state',
        authorName: 'integration_test_user'
      });

      const stateResult = await realTimeService.postGameStateChange(
        gameThread,
        'game_started',
        { roundNumber: 1 }
      );

      expect(stateResult.success).toBe(true);
      expect(stateResult.data).toBe('state_comment_123');

      // Verify comment formatting
      const submittedText = mockReddit.submitComment.mock.calls[0][0].text;
      expect(submittedText).toContain('🎮 **Game Started!**');
      expect(submittedText).toContain('Updated at');
    });
  });

  describe('Content Policy and Permissions Integration', () => {
    it('should validate content before posting', async () => {
      // Mock content validation failure
      const mockComplianceService = {
        getDevvitContext: jest.fn().mockResolvedValue({
          success: true,
          data: {
            postId: 'test_post',
            subreddit: 'test_subreddit',
            userId: 'test_user'
          }
        }),
        validateSubredditPermissions: jest.fn().mockResolvedValue({
          success: true,
          data: true
        }),
        validateContent: jest.fn().mockResolvedValue({
          success: false,
          error: 'Content violates policy'
        })
      };

      const originalService = postCommentService['complianceService'];
      postCommentService['complianceService'] = mockComplianceService as any;

      const commentConfig: GameCommentConfig = {
        type: GameCommentType.GAME_INFO,
        text: 'Inappropriate content',
        parentId: 'test_post'
      };

      const result = await postCommentService.submitGameComment(commentConfig);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Comment content violates Reddit policies');

      postCommentService['complianceService'] = originalService;
    });

    it('should check permissions before creating posts', async () => {
      // Mock permission check failure
      const mockComplianceService = {
        getDevvitContext: jest.fn().mockResolvedValue({
          success: true,
          data: {
            postId: 'test_post',
            subreddit: 'test_subreddit',
            userId: 'test_user'
          }
        }),
        validateSubredditPermissions: jest.fn().mockResolvedValue({
          success: false,
          error: 'Insufficient permissions'
        })
      };

      const originalService = postCommentService['complianceService'];
      postCommentService['complianceService'] = mockComplianceService as any;

      const gameConfig: GamePostConfig = {
        title: 'Permission Test',
        description: 'Testing permission validation',
        gameType: 'pictact',
        duration: 30,
        difficulty: 'easy',
        rules: ['Rule 1']
      };

      const result = await postCommentService.createGamePost(gameConfig);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');

      postCommentService['complianceService'] = originalService;
    });
  });
});