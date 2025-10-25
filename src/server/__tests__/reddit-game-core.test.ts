import { RedditGameCore, GameStatus, MatchCreationConfig, PlayerSubmissionData } from '../core/reddit-game-core';
import { RedditComplianceService } from '../core/reddit-compliance-service';
import { RedditPostCommentService } from '../core/reddit-post-comment-service';
import { RedditRealTimeService } from '../core/reddit-realtime-service';
import { RedditMediaHandler } from '../core/reddit-media-handler';
import { DevvitContext, RedditApiResult } from '../../shared/types/reddit-compliance';
import { RedditGameData } from '../../shared/types/reddit-compliant-data';

// Mock the dependencies
jest.mock('../core/reddit-compliance-service');
jest.mock('../core/reddit-post-comment-service');
jest.mock('../core/reddit-realtime-service');
jest.mock('../core/reddit-media-handler');

describe('RedditGameCore', () => {
  let gameCore: RedditGameCore;
  let mockComplianceService: jest.Mocked<RedditComplianceService>;
  let mockPostCommentService: jest.Mocked<RedditPostCommentService>;
  let mockRealTimeService: jest.Mocked<RedditRealTimeService>;
  let mockMediaHandler: jest.Mocked<RedditMediaHandler>;

  const mockDevvitContext: DevvitContext = {
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

  const mockMatchConfig: MatchCreationConfig = {
    title: 'Test PicTact Game',
    description: 'A test game for unit testing',
    gameType: 'pictact',
    duration: 30,
    maxPlayers: 10,
    difficulty: 'medium',
    rules: [
      'Submit original photos only',
      'Follow subreddit rules',
      'Be respectful to other players'
    ],
    rounds: [
      {
        prompt: 'Find something red',
        duration: 300,
        difficulty: 'easy'
      },
      {
        prompt: 'Capture a sunset',
        duration: 600,
        difficulty: 'medium'
      }
    ],
    prizes: ['Gold Award', 'Silver Award']
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mocked instances
    mockComplianceService = new RedditComplianceService() as jest.Mocked<RedditComplianceService>;
    mockPostCommentService = new RedditPostCommentService() as jest.Mocked<RedditPostCommentService>;
    mockRealTimeService = new RedditRealTimeService() as jest.Mocked<RedditRealTimeService>;
    mockMediaHandler = new RedditMediaHandler() as jest.Mocked<RedditMediaHandler>;

    // Create game core instance
    gameCore = new RedditGameCore();

    // Replace the private services with mocks
    (gameCore as any).complianceService = mockComplianceService;
    (gameCore as any).postCommentService = mockPostCommentService;
    (gameCore as any).realTimeService = mockRealTimeService;
    (gameCore as any).mediaHandler = mockMediaHandler;
  });

  describe('createMatch', () => {
    it('should create a match successfully with Reddit post creation', async () => {
      // Mock successful responses
      mockComplianceService.getDevvitContext.mockResolvedValue({
        success: true,
        data: mockDevvitContext
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      mockPostCommentService.createGamePost.mockResolvedValue({
        success: true,
        data: {
          postId: 'game_post_123',
          postUrl: 'https://reddit.com/r/test_subreddit/comments/game_post_123',
          title: mockMatchConfig.title,
          subreddit: mockDevvitContext.subreddit,
          createdAt: new Date(),
          author: 'test_moderator'
        }
      });

      mockPostCommentService.createGameThread.mockResolvedValue({
        success: true,
        data: {
          postId: 'game_post_123',
          gameCommentId: 'game_comment_123',
          rulesCommentId: 'rules_comment_123',
          statusCommentId: 'status_comment_123',
          roundCommentIds: [],
          submissionCommentIds: [],
          lastUpdateTime: new Date()
        }
      });

      mockRealTimeService.initializeGamePolling.mockResolvedValue({
        success: true
      });

      mockRealTimeService.postGameStateChange.mockResolvedValue({
        success: true,
        data: 'state_comment_123'
      });

      // Execute the test
      const result = await gameCore.createMatch(mockMatchConfig);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        expect(result.data.gameId).toMatch(/^game_game_post_123_\d+$/);
        expect(result.data.status).toBe(GameStatus.WAITING_FOR_PLAYERS);
        expect(result.data.configuration.title).toBe(mockMatchConfig.title);
        expect(result.data.configuration.rounds).toHaveLength(2);
        expect(result.data.totalRounds).toBe(2);
        expect(result.data.currentRound).toBe(0);
        expect(result.data.postId).toBe('game_post_123');
        expect(result.data.subreddit).toBe(mockDevvitContext.subreddit);
      }

      // Verify service calls
      expect(mockComplianceService.getDevvitContext).toHaveBeenCalledTimes(1);
      expect(mockComplianceService.validateSubredditPermissions).toHaveBeenCalledWith(
        mockDevvitContext.subreddit,
        'manage_posts'
      );
      expect(mockPostCommentService.createGamePost).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockMatchConfig.title,
          description: mockMatchConfig.description,
          gameType: mockMatchConfig.gameType
        })
      );
      expect(mockPostCommentService.createGameThread).toHaveBeenCalledWith(
        'game_post_123',
        expect.stringMatching(/^game_game_post_123_\d+$/)
      );
    });

    it('should fail when Reddit context is invalid', async () => {
      mockComplianceService.getDevvitContext.mockResolvedValue({
        success: false,
        error: 'Invalid context'
      });

      const result = await gameCore.createMatch(mockMatchConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Reddit context - cannot create match outside Reddit environment');
    });

    it('should fail when insufficient permissions', async () => {
      mockComplianceService.getDevvitContext.mockResolvedValue({
        success: true,
        data: mockDevvitContext
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: false,
        data: false
      });

      const result = await gameCore.createMatch(mockMatchConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to create matches in this subreddit');
    });

    it('should fail when Reddit post creation fails', async () => {
      mockComplianceService.getDevvitContext.mockResolvedValue({
        success: true,
        data: mockDevvitContext
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      mockPostCommentService.createGamePost.mockResolvedValue({
        success: false,
        error: 'Failed to create post'
      });

      const result = await gameCore.createMatch(mockMatchConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create post');
    });
  });

  describe('startGame', () => {
    let gameData: RedditGameData;

    beforeEach(async () => {
      // Set up a created game
      mockComplianceService.getDevvitContext.mockResolvedValue({
        success: true,
        data: mockDevvitContext
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      mockPostCommentService.createGamePost.mockResolvedValue({
        success: true,
        data: {
          postId: 'game_post_123',
          postUrl: 'https://reddit.com/r/test_subreddit/comments/game_post_123',
          title: mockMatchConfig.title,
          subreddit: mockDevvitContext.subreddit,
          createdAt: new Date(),
          author: 'test_moderator'
        }
      });

      mockPostCommentService.createGameThread.mockResolvedValue({
        success: true,
        data: {
          postId: 'game_post_123',
          gameCommentId: 'game_comment_123',
          rulesCommentId: 'rules_comment_123',
          statusCommentId: 'status_comment_123',
          roundCommentIds: [],
          submissionCommentIds: [],
          lastUpdateTime: new Date()
        }
      });

      mockRealTimeService.initializeGamePolling.mockResolvedValue({
        success: true
      });

      mockRealTimeService.postGameStateChange.mockResolvedValue({
        success: true,
        data: 'state_comment_123'
      });

      mockPostCommentService.postRoundUpdate.mockResolvedValue({
        success: true,
        data: 'round_comment_123'
      });

      const createResult = await gameCore.createMatch(mockMatchConfig);
      gameData = createResult.data!;
    });

    it('should start a game and begin first round', async () => {
      const result = await gameCore.startGame(gameData.gameId);

      expect(result.success).toBe(true);

      // Verify game state changes
      const updatedGameData = gameCore.getGameData(gameData.gameId);
      expect(updatedGameData?.status).toBe(GameStatus.ROUND_IN_PROGRESS);
      expect(updatedGameData?.currentRound).toBe(1);
      expect(updatedGameData?.rounds).toHaveLength(1);

      // Verify service calls
      expect(mockRealTimeService.postGameStateChange).toHaveBeenCalledWith(
        expect.any(Object),
        'game_started',
        expect.objectContaining({
          gameId: gameData.gameId,
          totalRounds: 2
        })
      );

      expect(mockPostCommentService.postRoundUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          roundNumber: 1,
          prompt: 'Find something red',
          timeRemaining: 300,
          status: 'active'
        })
      );
    });

    it('should fail when game not found', async () => {
      const result = await gameCore.startGame('nonexistent_game');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game not found');
    });
  });

  describe('processPlayerSubmission', () => {
    let gameData: RedditGameData;
    const mockSubmissionData: PlayerSubmissionData = {
      playerId: 'player_123',
      mediaUrl: 'https://reddit.com/media/test_image.jpg',
      submissionTime: new Date(),
      roundNumber: 1
    };

    beforeEach(async () => {
      // Set up a game with an active round
      mockComplianceService.getDevvitContext.mockResolvedValue({
        success: true,
        data: mockDevvitContext
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      mockPostCommentService.createGamePost.mockResolvedValue({
        success: true,
        data: {
          postId: 'game_post_123',
          postUrl: 'https://reddit.com/r/test_subreddit/comments/game_post_123',
          title: mockMatchConfig.title,
          subreddit: mockDevvitContext.subreddit,
          createdAt: new Date(),
          author: 'test_moderator'
        }
      });

      mockPostCommentService.createGameThread.mockResolvedValue({
        success: true,
        data: {
          postId: 'game_post_123',
          gameCommentId: 'game_comment_123',
          rulesCommentId: 'rules_comment_123',
          statusCommentId: 'status_comment_123',
          roundCommentIds: [],
          submissionCommentIds: [],
          lastUpdateTime: new Date()
        }
      });

      mockRealTimeService.initializeGamePolling.mockResolvedValue({
        success: true
      });

      mockRealTimeService.postGameStateChange.mockResolvedValue({
        success: true,
        data: 'state_comment_123'
      });

      mockPostCommentService.postRoundUpdate.mockResolvedValue({
        success: true,
        data: 'round_comment_123'
      });

      const createResult = await gameCore.createMatch(mockMatchConfig);
      gameData = createResult.data!;

      // Start the game to get an active round
      await gameCore.startGame(gameData.gameId);
    });

    it('should process valid player submission with Reddit media handling', async () => {
      mockMediaHandler.validateImageContent.mockResolvedValue({
        success: true,
        data: {
          isValid: true,
          isNSFW: false,
          contentWarnings: [],
          violatesPolicy: false,
          moderationRequired: false
        }
      });

      mockPostCommentService.handlePlayerSubmission.mockResolvedValue({
        success: true,
        data: 'submission_comment_123'
      });

      mockRealTimeService.postLeaderboardUpdate.mockResolvedValue({
        success: true,
        data: 'leaderboard_comment_123'
      });

      const result = await gameCore.processPlayerSubmission(gameData.gameId, mockSubmissionData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.playerId).toBe(mockSubmissionData.playerId);
        expect(result.data.mediaUrl).toBe(mockSubmissionData.mediaUrl);
        expect(result.data.roundNumber).toBe(mockSubmissionData.roundNumber);
        expect(result.data.status).toBe('pending_review');
      }

      // Verify service calls
      expect(mockMediaHandler.validateImageContent).toHaveBeenCalledWith(
        mockSubmissionData.mediaUrl,
        mockDevvitContext.subreddit
      );

      expect(mockPostCommentService.handlePlayerSubmission).toHaveBeenCalledWith(
        expect.any(Object),
        mockSubmissionData.playerId,
        mockSubmissionData.mediaUrl,
        mockSubmissionData.roundNumber
      );
    });

    it('should reject submission that violates content policies', async () => {
      mockMediaHandler.validateImageContent.mockResolvedValue({
        success: true,
        data: {
          isValid: false,
          isNSFW: true,
          contentWarnings: ['NSFW content detected'],
          violatesPolicy: true,
          moderationRequired: true
        }
      });

      const result = await gameCore.processPlayerSubmission(gameData.gameId, mockSubmissionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Submission violates content policies');

      // Should not call submission handling
      expect(mockPostCommentService.handlePlayerSubmission).not.toHaveBeenCalled();
    });

    it('should fail when game not found', async () => {
      const result = await gameCore.processPlayerSubmission('nonexistent_game', mockSubmissionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game not found');
    });

    it('should fail when no active round', async () => {
      // End the current round by setting status
      const currentGameData = gameCore.getGameData(gameData.gameId);
      if (currentGameData) {
        currentGameData.status = GameStatus.COMPLETED;
      }

      const result = await gameCore.processPlayerSubmission(gameData.gameId, mockSubmissionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active round for submissions');
    });
  });

  describe('game state management', () => {
    let gameData: RedditGameData;

    beforeEach(async () => {
      // Set up a created game
      mockComplianceService.getDevvitContext.mockResolvedValue({
        success: true,
        data: mockDevvitContext
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      mockPostCommentService.createGamePost.mockResolvedValue({
        success: true,
        data: {
          postId: 'game_post_123',
          postUrl: 'https://reddit.com/r/test_subreddit/comments/game_post_123',
          title: mockMatchConfig.title,
          subreddit: mockDevvitContext.subreddit,
          createdAt: new Date(),
          author: 'test_moderator'
        }
      });

      mockPostCommentService.createGameThread.mockResolvedValue({
        success: true,
        data: {
          postId: 'game_post_123',
          gameCommentId: 'game_comment_123',
          rulesCommentId: 'rules_comment_123',
          statusCommentId: 'status_comment_123',
          roundCommentIds: [],
          submissionCommentIds: [],
          lastUpdateTime: new Date()
        }
      });

      mockRealTimeService.initializeGamePolling.mockResolvedValue({
        success: true
      });

      mockRealTimeService.postGameStateChange.mockResolvedValue({
        success: true,
        data: 'state_comment_123'
      });

      const createResult = await gameCore.createMatch(mockMatchConfig);
      gameData = createResult.data!;
    });

    it('should pause and resume game', async () => {
      // Start the game first
      await gameCore.startGame(gameData.gameId);

      // Pause the game
      const pauseResult = await gameCore.pauseGame(gameData.gameId);
      expect(pauseResult.success).toBe(true);

      const pausedGameData = gameCore.getGameData(gameData.gameId);
      expect(pausedGameData?.status).toBe(GameStatus.PAUSED);

      // Resume the game
      const resumeResult = await gameCore.resumeGame(gameData.gameId);
      expect(resumeResult.success).toBe(true);

      const resumedGameData = gameCore.getGameData(gameData.gameId);
      expect(resumedGameData?.status).toBe(GameStatus.ROUND_IN_PROGRESS);
    });

    it('should cancel game', async () => {
      mockRealTimeService.stopPolling.mockImplementation(() => {});

      const cancelResult = await gameCore.cancelGame(gameData.gameId);
      expect(cancelResult.success).toBe(true);

      // Game should be removed from active games
      const cancelledGameData = gameCore.getGameData(gameData.gameId);
      expect(cancelledGameData).toBeUndefined();

      expect(mockRealTimeService.stopPolling).toHaveBeenCalledWith(`game_${gameData.postId}`);
    });

    it('should get all active games', () => {
      const activeGames = gameCore.getAllActiveGames();
      expect(activeGames).toHaveLength(1);
      expect(activeGames[0].gameId).toBe(gameData.gameId);
    });
  });
});