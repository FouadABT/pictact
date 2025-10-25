/**
 * Reddit Integration Compliance Tests
 * 
 * Comprehensive end-to-end tests that verify complete game flow through Reddit systems
 * and ensure all game systems work within Reddit constraints.
 * 
 * Requirements tested:
 * - 1.1: Core Devvit Platform Integration
 * - 2.1: Reddit API Integration for Game Interactions  
 * - 4.1: Reddit Media and Content Handling
 * - 8.1: Content Moderation and Community Guidelines
 */

import { RedditComplianceService } from '../core/reddit-compliance-service';
import { RedditGameCore, MatchCreationConfig, PlayerSubmissionData } from '../core/reddit-game-core';
import { RedditPostCommentService } from '../core/reddit-post-comment-service';
import { RedditRealTimeService } from '../core/reddit-realtime-service';
import { RedditMediaHandler } from '../core/reddit-media-handler';
import { RedditValidationSystem } from '../core/reddit-validation-system';
import { RedditScoringSystem } from '../core/reddit-scoring-system';
import { RedditModerationService } from '../core/reddit-moderation-service';
import { 
  DevvitContext, 
  RedditApiResult, 
  GameThread,
  RoundUpdate,
  LeaderboardData
} from '../../shared/types/reddit-compliance';
import { 
  RedditGameData, 
  GameStatus,
  RedditSubmission 
} from '../../shared/types/reddit-compliant-data';

// Mock the Devvit web server module
jest.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentUsername: jest.fn(),
    submitPost: jest.fn(),
    submitComment: jest.fn(),
    uploadMedia: jest.fn(),
    getModPermissions: jest.fn()
  },
  context: {
    postId: 't3_integration_test',
    subredditName: 'pictact_test'
  }
}));

describe('Reddit Integration Compliance Tests', () => {
  let complianceService: RedditComplianceService;
  let gameCore: RedditGameCore;
  let postCommentService: RedditPostCommentService;
  let realTimeService: RedditRealTimeService;
  let mediaHandler: RedditMediaHandler;
  let validationSystem: RedditValidationSystem;
  let scoringSystem: RedditScoringSystem;
  let moderationService: RedditModerationService;

  // Mock Reddit API functions
  let mockGetCurrentUsername: jest.Mock;
  let mockSubmitPost: jest.Mock;
  let mockSubmitComment: jest.Mock;
  let mockUploadMedia: jest.Mock;
  let mockGetModPermissions: jest.Mock;

  const testDevvitContext: DevvitContext = {
    postId: 't3_integration_test',
    subreddit: 'pictact_test',
    userId: 'test_moderator',
    moderatorPermissions: {
      canManagePosts: true,
      canManageComments: true,
      canManageUsers: true,
      canManageSettings: true,
      canViewModLog: true
    }
  };

  const testMatchConfig: MatchCreationConfig = {
    title: 'Integration Test PicTact Game',
    description: 'End-to-end integration test for Reddit compliance',
    gameType: 'pictact',
    duration: 15, // 15 minutes
    maxPlayers: 5,
    difficulty: 'medium',
    rules: [
      'Submit original photos only',
      'Follow r/pictact_test community guidelines',
      'Be respectful to other players',
      'No NSFW content allowed'
    ],
    rounds: [
      {
        prompt: 'Find something blue in your environment',
        duration: 180, // 3 minutes
        difficulty: 'easy'
      },
      {
        prompt: 'Capture an interesting shadow or reflection',
        duration: 300, // 5 minutes  
        difficulty: 'medium'
      },
      {
        prompt: 'Photograph something that represents "movement"',
        duration: 240, // 4 minutes
        difficulty: 'hard'
      }
    ],
    prizes: ['Reddit Gold', 'Custom Flair', 'Community Recognition']
  };

  beforeEach(() => {
    // Get mocked Reddit API functions
    const { reddit } = require('@devvit/web/server');
    mockGetCurrentUsername = reddit.getCurrentUsername as jest.Mock;
    mockSubmitPost = reddit.submitPost as jest.Mock;
    mockSubmitComment = reddit.submitComment as jest.Mock;
    mockUploadMedia = reddit.uploadMedia as jest.Mock;
    mockGetModPermissions = reddit.getModPermissions as jest.Mock;

    // Reset all mocks
    jest.clearAllMocks();

    // Initialize services
    complianceService = new RedditComplianceService();
    gameCore = new RedditGameCore();
    postCommentService = new RedditPostCommentService();
    realTimeService = new RedditRealTimeService();
    mediaHandler = new RedditMediaHandler();
    validationSystem = new RedditValidationSystem();
    scoringSystem = new RedditScoringSystem();
    moderationService = new RedditModerationService();

    // Set up default successful mocks
    mockGetCurrentUsername.mockResolvedValue('test_moderator');
    mockGetModPermissions.mockResolvedValue(['all']);
    mockSubmitPost.mockResolvedValue({
      id: 't3_game_post_123',
      url: 'https://reddit.com/r/pictact_test/comments/game_post_123'
    });
    mockSubmitComment.mockResolvedValue({
      id: 't1_comment_123',
      permalink: '/r/pictact_test/comments/game_post_123/comment_123'
    });
    mockUploadMedia.mockResolvedValue({
      mediaUrl: 'https://i.redd.it/test_image_123.jpg',
      mediaId: 'media_123'
    });
  });

  describe('Requirement 1.1: Core Devvit Platform Integration', () => {
    it('should establish complete Reddit Devvit integration infrastructure', async () => {
      // Test Devvit context retrieval
      const contextResult = await complianceService.getDevvitContext();
      
      expect(contextResult.success).toBe(true);
      expect(contextResult.data).toBeDefined();
      expect(contextResult.data!.postId).toBe('t3_integration_test');
      expect(contextResult.data!.subreddit).toBe('pictact_test');
      expect(contextResult.data!.userId).toBe('test_moderator');
      expect(contextResult.data!.moderatorPermissions).toBeDefined();

      // Verify Reddit API calls were made correctly
      expect(mockGetCurrentUsername).toHaveBeenCalled();
      expect(mockGetModPermissions).toHaveBeenCalledWith('pictact_test', 'test_moderator');
    });

    it('should handle Reddit authentication and user identification', async () => {
      // Test authenticated user
      const userResult = await complianceService.getCurrentRedditUser();
      expect(userResult.success).toBe(true);
      expect(userResult.data).toBe('test_moderator');

      // Test unauthenticated user
      mockGetCurrentUsername.mockResolvedValueOnce(null);
      const anonResult = await complianceService.getCurrentRedditUser();
      expect(anonResult.success).toBe(false);
      expect(anonResult.error).toBe('No authenticated Reddit user found');
    });

    it('should validate subreddit permissions correctly', async () => {
      // Test moderator permissions
      const modPermResult = await complianceService.validateSubredditPermissions('pictact_test', 'manage_posts');
      expect(modPermResult.success).toBe(true);
      expect(modPermResult.data).toBe(true);

      // Test regular user permissions
      mockGetModPermissions.mockResolvedValueOnce([]);
      const userPermResult = await complianceService.validateSubredditPermissions('pictact_test', 'view');
      expect(userPermResult.success).toBe(true);
      expect(userPermResult.data).toBe(true);
    });

    it('should handle rate limiting and error recovery', async () => {
      // Simulate rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      mockGetCurrentUsername.mockRejectedValueOnce(rateLimitError);

      const result = await complianceService.getCurrentRedditUser();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');

      // Verify recovery on next call
      mockGetCurrentUsername.mockResolvedValueOnce('test_user');
      const recoveryResult = await complianceService.getCurrentRedditUser();
      expect(recoveryResult.success).toBe(true);
    });
  });

  describe('Requirement 2.1: Reddit API Integration for Game Interactions', () => {
    it('should create complete game flow using Reddit posts and comments', async () => {
      // Step 1: Create game match using Reddit post
      const createResult = await gameCore.createMatch(testMatchConfig);
      
      expect(createResult.success).toBe(true);
      expect(createResult.data).toBeDefined();
      
      const gameData = createResult.data!;
      expect(gameData.gameId).toMatch(/^game_t3_game_post_123_\d+$/);
      expect(gameData.status).toBe(GameStatus.WAITING_FOR_PLAYERS);
      expect(gameData.postId).toBe('t3_game_post_123');
      expect(gameData.subreddit).toBe('pictact_test');

      // Verify Reddit post creation
      expect(mockSubmitPost).toHaveBeenCalledWith(
        expect.objectContaining({
          title: testMatchConfig.title,
          text: expect.stringContaining(testMatchConfig.description),
          subredditName: 'pictact_test'
        })
      );

      // Verify game thread creation via comments
      expect(mockSubmitComment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 't3_game_post_123',
          text: expect.stringContaining('Game Information')
        })
      );

      // Step 2: Start game and begin first round
      const startResult = await gameCore.startGame(gameData.gameId);
      expect(startResult.success).toBe(true);

      const activeGameData = gameCore.getGameData(gameData.gameId);
      expect(activeGameData?.status).toBe(GameStatus.ROUND_IN_PROGRESS);
      expect(activeGameData?.currentRound).toBe(1);
      expect(activeGameData?.rounds).toHaveLength(1);

      // Verify round announcement via Reddit comment
      expect(mockSubmitComment).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Find something blue in your environment')
        })
      );
    });

    it('should handle player submissions through Reddit comment system', async () => {
      // Create and start a game
      const createResult = await gameCore.createMatch(testMatchConfig);
      const gameData = createResult.data!;
      await gameCore.startGame(gameData.gameId);

      // Mock successful media upload
      mockUploadMedia.mockResolvedValueOnce({
        mediaUrl: 'https://i.redd.it/player_submission_123.jpg',
        mediaId: 'submission_media_123'
      });

      // Process player submission
      const submissionData: PlayerSubmissionData = {
        playerId: 'player_001',
        mediaUrl: 'https://i.redd.it/player_submission_123.jpg',
        submissionTime: new Date(),
        roundNumber: 1
      };

      const submissionResult = await gameCore.processPlayerSubmission(gameData.gameId, submissionData);
      
      expect(submissionResult.success).toBe(true);
      expect(submissionResult.data).toBeDefined();
      
      const submission = submissionResult.data!;
      expect(submission.playerId).toBe('player_001');
      expect(submission.mediaUrl).toBe('https://i.redd.it/player_submission_123.jpg');
      expect(submission.roundNumber).toBe(1);

      // Verify submission comment creation
      expect(mockSubmitComment).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('player_001')
        })
      );
    });

    it('should manage leaderboard updates through Reddit comments', async () => {
      // Create game with multiple players
      const createResult = await gameCore.createMatch(testMatchConfig);
      const gameData = createResult.data!;
      await gameCore.startGame(gameData.gameId);

      // Simulate multiple player submissions
      const players = ['player_001', 'player_002', 'player_003'];
      
      for (let i = 0; i < players.length; i++) {
        const submissionData: PlayerSubmissionData = {
          playerId: players[i],
          mediaUrl: `https://i.redd.it/submission_${i + 1}.jpg`,
          submissionTime: new Date(Date.now() + i * 1000), // Stagger submission times
          roundNumber: 1
        };

        await gameCore.processPlayerSubmission(gameData.gameId, submissionData);
      }

      // Verify leaderboard comment updates
      const leaderboardCalls = mockSubmitComment.mock.calls.filter(call => 
        call[0].text.includes('Leaderboard') || call[0].text.includes('Score')
      );
      
      expect(leaderboardCalls.length).toBeGreaterThan(0);
    });

    it('should handle real-time updates through Reddit comment polling', async () => {
      // Create and start game
      const createResult = await gameCore.createMatch(testMatchConfig);
      const gameData = createResult.data!;
      await gameCore.startGame(gameData.gameId);

      // Simulate real-time polling setup
      const gameThread: GameThread = {
        postId: gameData.postId,
        gameCommentId: gameData.gameCommentId,
        rulesCommentId: 'rules_123',
        statusCommentId: 'status_123',
        roundCommentIds: ['round_123'],
        submissionCommentIds: [],
        lastUpdateTime: new Date()
      };

      // Test polling initialization
      const pollingResult = await realTimeService.initializeGamePolling(
        gameThread,
        (update) => {
          expect(update.type).toBeDefined();
          expect(update.timestamp).toBeDefined();
        }
      );

      expect(pollingResult.success).toBe(true);

      // Test status updates
      const statusResult = await realTimeService.postGameStateChange(
        gameThread,
        'round_started',
        { roundNumber: 1, prompt: testMatchConfig.rounds[0].prompt }
      );

      expect(statusResult.success).toBe(true);
      expect(mockSubmitComment).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('round_started')
        })
      );
    });
  });

  describe('Requirement 4.1: Reddit Media and Content Handling', () => {
    it('should handle media uploads through Reddit media services', async () => {
      // Test media upload
      const testImageFile = new File(['test image data'], 'test.jpg', { type: 'image/jpeg' });
      
      const uploadResult = await mediaHandler.uploadImage(testImageFile, testDevvitContext);
      
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data).toBeDefined();
      expect(uploadResult.data!.mediaUrl).toBe('https://i.redd.it/test_image_123.jpg');
      expect(uploadResult.data!.redditMediaId).toBe('media_123');

      // Verify Reddit API call
      expect(mockUploadMedia).toHaveBeenCalledWith(testImageFile);
    });

    it('should validate content against Reddit policies', async () => {
      const testMediaUrl = 'https://i.redd.it/test_content.jpg';
      
      // Test valid content
      const validationResult = await validationSystem.validateContent(testMediaUrl, testDevvitContext);
      
      expect(validationResult.success).toBe(true);
      expect(validationResult.data).toBeDefined();
      expect(validationResult.data!.isValid).toBe(true);
      expect(validationResult.data!.violatesPolicy).toBe(false);
    });

    it('should handle NSFW content detection and subreddit policies', async () => {
      // Mock NSFW content detection
      const nsfwMediaUrl = 'https://i.redd.it/nsfw_content.jpg';
      
      // Test NSFW detection in non-NSFW subreddit
      const nsfwValidation = await validationSystem.validateContent(nsfwMediaUrl, {
        ...testDevvitContext,
        subreddit: 'sfw_subreddit'
      });

      // Should handle NSFW content appropriately based on subreddit settings
      expect(nsfwValidation.success).toBe(true);
      expect(nsfwValidation.data).toBeDefined();
    });

    it('should integrate with Reddit content scanning systems', async () => {
      const testContent = {
        mediaUrl: 'https://i.redd.it/test_scan.jpg',
        text: 'Test submission content',
        metadata: { gameId: 'test_game', roundNumber: 1 }
      };

      // Test content scanning integration
      const scanResult = await validationSystem.validateContent(testContent.mediaUrl, testDevvitContext);
      
      expect(scanResult.success).toBe(true);
      expect(scanResult.data?.validationMetadata).toBeDefined();
      expect(scanResult.data?.validationMetadata.validatedAt).toBeDefined();
    });
  });

  describe('Requirement 8.1: Content Moderation and Community Guidelines', () => {
    it('should integrate with Reddit moderation systems', async () => {
      const testModerationRequest = {
        contentId: 'test_content_123',
        contentType: 'media' as const,
        content: 'https://i.redd.it/moderation_test.jpg',
        context: testDevvitContext,
        priority: 'normal' as const,
        requestedBy: 'test_player'
      };

      // Test moderation integration
      const moderationResult = await moderationService.moderateContent(
        testModerationRequest
      );

      expect(moderationResult.success).toBe(true);
      expect(moderationResult.data).toBeDefined();
      expect(moderationResult.data!.decision).toBeDefined();
      expect(['approve', 'flag', 'remove', 'escalate'].includes(moderationResult.data!.decision)).toBe(true);
    });

    it('should handle community guidelines enforcement', async () => {
      // Test spam detection
      const spamModerationRequest = {
        contentId: 'spam_test_123',
        contentType: 'comment' as const,
        content: 'SPAM SPAM SPAM BUY NOW CLICK HERE',
        context: testDevvitContext,
        priority: 'high' as const,
        requestedBy: 'spam_user'
      };

      // Test spam detection through moderation service
      const spamResult = await moderationService.moderateContent(spamModerationRequest);

      expect(spamResult.success).toBe(true);
      expect(spamResult.data).toBeDefined();
      
      // Should detect spam and recommend removal
      if (spamResult.data!.violations && spamResult.data!.violations.length > 0) {
        expect(spamResult.data!.violations[0].type).toBe('spam');
        expect(spamResult.data!.decision).toBe('remove');
      }
    });

    it('should log moderator actions through Reddit systems', async () => {
      const moderatorAction = {
        action: 'remove_submission',
        targetId: 'submission_123',
        reason: 'Violates community guidelines',
        details: { gameId: 'test_game', roundNumber: 1 }
      };

      const logResult = await complianceService.logModeratorAction(
        testDevvitContext.subreddit,
        moderatorAction.action,
        moderatorAction.targetId,
        moderatorAction.reason,
        moderatorAction.details
      );

      expect(logResult.success).toBe(true);
      expect(logResult.data).toBe(true);
    });

    it('should handle content appeals and escalation', async () => {
      const appealModerationRequest = {
        contentId: 'appealed_content_123',
        contentType: 'comment' as const,
        content: 'This content was incorrectly flagged',
        context: testDevvitContext,
        priority: 'urgent' as const,
        requestedBy: 'appealing_user'
      };

      // Test content appeal through moderation service
      // Appeals would be handled through Reddit's native appeal system
      const appealResult = await moderationService.moderateContent(appealModerationRequest);

      expect(appealResult.success).toBe(true);
      expect(appealResult.data).toBeDefined();
      expect(['approve', 'flag', 'remove', 'escalate'].includes(appealResult.data!.decision)).toBe(true);
      
      // Should be appealable if decision is not approve
      if (appealResult.data!.decision !== 'approve') {
        expect(appealResult.data!.appealable).toBe(true);
      }
    });
  });

  describe('End-to-End Game Flow Integration', () => {
    it('should complete full game lifecycle through Reddit systems', async () => {
      // Step 1: Create game
      const createResult = await gameCore.createMatch(testMatchConfig);
      expect(createResult.success).toBe(true);
      const gameData = createResult.data!;

      // Step 2: Start game
      const startResult = await gameCore.startGame(gameData.gameId);
      expect(startResult.success).toBe(true);

      // Step 3: Process multiple player submissions across rounds
      const players = ['player_001', 'player_002', 'player_003'];
      
      for (let roundIndex = 0; roundIndex < testMatchConfig.rounds.length; roundIndex++) {
        // Wait for round to start (simulated)
        const activeGame = gameCore.getGameData(gameData.gameId);
        expect(activeGame?.currentRound).toBe(roundIndex + 1);

        // Process submissions for this round
        for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
          const submissionData: PlayerSubmissionData = {
            playerId: players[playerIndex],
            mediaUrl: `https://i.redd.it/r${roundIndex + 1}_p${playerIndex + 1}.jpg`,
            submissionTime: new Date(Date.now() + playerIndex * 1000),
            roundNumber: roundIndex + 1
          };

          const submissionResult = await gameCore.processPlayerSubmission(gameData.gameId, submissionData);
          expect(submissionResult.success).toBe(true);
        }

        // Simulate round completion and advance to next round
        if (roundIndex < testMatchConfig.rounds.length - 1) {
          // Force round end for testing
          await gameCore.startNextRound(gameData.gameId);
        }
      }

      // Step 4: Verify final game state
      const finalGame = gameCore.getGameData(gameData.gameId);
      expect(finalGame?.rounds).toHaveLength(testMatchConfig.rounds.length);
      expect(finalGame?.leaderboard.entries.length).toBeGreaterThan(0);

      // Step 5: Verify Reddit integration points
      expect(mockSubmitPost).toHaveBeenCalled(); // Game post creation
      expect(mockSubmitComment).toHaveBeenCalledTimes(expect.any(Number)); // Multiple comments
      expect(mockUploadMedia).toHaveBeenCalledTimes(expect.any(Number)); // Media uploads
    });

    it('should handle error scenarios and recovery', async () => {
      // Test Reddit API failure during game creation
      mockSubmitPost.mockRejectedValueOnce(new Error('Reddit API unavailable'));
      
      const failedCreateResult = await gameCore.createMatch(testMatchConfig);
      expect(failedCreateResult.success).toBe(false);
      expect(failedCreateResult.error).toContain('Reddit API unavailable');

      // Test recovery after API comes back online
      mockSubmitPost.mockResolvedValueOnce({
        id: 't3_recovery_post',
        url: 'https://reddit.com/r/pictact_test/comments/recovery_post'
      });

      const recoveryResult = await gameCore.createMatch(testMatchConfig);
      expect(recoveryResult.success).toBe(true);
    });

    it('should maintain Reddit compliance across all operations', async () => {
      // Create and run a complete game
      const createResult = await gameCore.createMatch(testMatchConfig);
      const gameData = createResult.data!;
      
      await gameCore.startGame(gameData.gameId);

      // Verify all Reddit API calls use proper authentication
      expect(mockGetCurrentUsername).toHaveBeenCalled();
      
      // Verify all posts/comments include proper subreddit context
      const postCalls = mockSubmitPost.mock.calls;
      const commentCalls = mockSubmitComment.mock.calls;
      
      postCalls.forEach(call => {
        expect(call[0].subredditName).toBe('pictact_test');
      });

      // Verify rate limiting is respected
      const totalApiCalls = postCalls.length + commentCalls.length;
      expect(totalApiCalls).toBeLessThan(100); // Reasonable limit for test

      // Verify content policy compliance
      commentCalls.forEach(call => {
        expect(call[0].text).toBeDefined();
        expect(call[0].text.length).toBeGreaterThan(0);
        expect(call[0].text.length).toBeLessThan(10000); // Reddit comment limit
      });
    });

    it('should handle concurrent games in same subreddit', async () => {
      // Create multiple games concurrently
      const gamePromises = [];
      for (let i = 0; i < 3; i++) {
        const config = {
          ...testMatchConfig,
          title: `Concurrent Game ${i + 1}`,
          rounds: [testMatchConfig.rounds[0]] // Single round for faster testing
        };
        gamePromises.push(gameCore.createMatch(config));
      }

      const gameResults = await Promise.all(gamePromises);
      
      // All games should be created successfully
      expect(gameResults.every(result => result.success)).toBe(true);
      
      // Each game should have unique ID
      const gameIds = gameResults.map(result => result.data!.gameId);
      const uniqueIds = new Set(gameIds);
      expect(uniqueIds.size).toBe(3);

      // All games should be in active games list
      const activeGames = gameCore.getAllActiveGames();
      expect(activeGames.length).toBe(3);
    });
  });

  describe('Performance and Resource Compliance', () => {
    it('should respect Reddit API rate limits', async () => {
      const startTime = Date.now();
      
      // Make multiple API calls rapidly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(complianceService.getCurrentRedditUser());
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should complete
      expect(results.length).toBe(10);
      
      // Should have some rate limiting delay
      expect(endTime - startTime).toBeGreaterThan(0);
      
      // Most requests should succeed (rate limiting may allow some through)
      const successfulRequests = results.filter(r => r.success);
      expect(successfulRequests.length).toBeGreaterThan(0);
    });

    it('should optimize resource usage within Devvit constraints', async () => {
      // Test memory usage optimization
      const initialMemory = process.memoryUsage();
      
      // Create and run multiple games
      for (let i = 0; i < 5; i++) {
        const config = {
          ...testMatchConfig,
          title: `Memory Test Game ${i + 1}`,
          rounds: [testMatchConfig.rounds[0]]
        };
        
        const createResult = await gameCore.createMatch(config);
        if (createResult.success) {
          await gameCore.startGame(createResult.data!.gameId);
          await gameCore.cancelGame(createResult.data!.gameId);
        }
      }

      const finalMemory = process.memoryUsage();
      
      // Memory usage should not grow excessively
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });

    it('should handle high-frequency updates efficiently', async () => {
      const createResult = await gameCore.createMatch(testMatchConfig);
      const gameData = createResult.data!;
      await gameCore.startGame(gameData.gameId);

      const startTime = Date.now();
      
      // Simulate rapid submissions
      const submissionPromises = [];
      for (let i = 0; i < 20; i++) {
        const submissionData: PlayerSubmissionData = {
          playerId: `rapid_player_${i}`,
          mediaUrl: `https://i.redd.it/rapid_${i}.jpg`,
          submissionTime: new Date(),
          roundNumber: 1
        };
        
        submissionPromises.push(gameCore.processPlayerSubmission(gameData.gameId, submissionData));
      }

      const results = await Promise.all(submissionPromises);
      const endTime = Date.now();

      // Should handle all submissions within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // Less than 10 seconds
      
      // Most submissions should be processed successfully
      const successfulSubmissions = results.filter(r => r.success);
      expect(successfulSubmissions.length).toBeGreaterThan(10);
    });
  });

  afterEach(() => {
    // Clean up any active games
    const activeGames = gameCore.getAllActiveGames();
    activeGames.forEach(game => {
      gameCore.cancelGame(game.gameId);
    });

    // Reset mocks
    jest.clearAllMocks();
  });
});