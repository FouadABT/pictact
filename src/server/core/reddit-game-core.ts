
import { RedditComplianceService } from "./reddit-compliance-service";
import { RedditPostCommentService } from "./reddit-post-comment-service";
import { RedditRealTimeService } from "./reddit-realtime-service";

import { RedditValidationSystem } from "./reddit-validation-system";
import { RedditScoringSystem } from "./reddit-scoring-system";
import {
  RedditApiResult,
  DevvitContext,
  GamePostConfig,
  GameThread,
  RoundUpdate,

  GameUpdate
} from "../../shared/types/reddit-compliance";
import {
  RedditGameData,
  RedditRoundData,
  RedditSubmission,
  RedditGameConfiguration,
  GameStatus as SharedGameStatus
} from "../../shared/types/reddit-compliant-data";

// Use the shared GameStatus enum
export { GameStatus } from "../../shared/types/reddit-compliant-data";

/**
 * Match Creation Configuration
 */
export interface MatchCreationConfig {
  title: string;
  description: string;
  gameType: 'pictact' | 'photo-hunt' | 'creative-challenge';
  duration: number; // Duration in minutes
  maxPlayers?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  rules: string[];
  rounds: RoundConfiguration[];
  prizes?: string[];
}

/**
 * Round Configuration
 */
export interface RoundConfiguration {
  prompt: string;
  duration: number; // Duration in seconds
  maxSubmissions?: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Player Submission Data
 */
export interface PlayerSubmissionData {
  playerId: string;
  mediaUrl: string;
  submissionTime: Date;
  roundNumber: number;
}

/**
 * Reddit Game Core Service
 * Manages the core game loop using Reddit post creation and comment system
 * Implements requirements 2.1, 2.2, 2.3, 4.1
 */
export class RedditGameCore {
  private complianceService: RedditComplianceService;
  private postCommentService: RedditPostCommentService;
  private realTimeService: RedditRealTimeService;

  private validationSystem: RedditValidationSystem;
  private scoringSystem: RedditScoringSystem;
  
  // Active games storage (in production, this would use Devvit KV store)
  private activeGames: Map<string, RedditGameData>;
  private gameTimers: Map<string, NodeJS.Timeout>;
  private gameUpdateCallbacks: Map<string, (update: GameUpdate) => void>;

  constructor() {
    this.complianceService = new RedditComplianceService();
    this.postCommentService = new RedditPostCommentService();
    this.realTimeService = new RedditRealTimeService();

    this.validationSystem = new RedditValidationSystem();
    this.scoringSystem = new RedditScoringSystem();
    
    this.activeGames = new Map();
    this.gameTimers = new Map();
    this.gameUpdateCallbacks = new Map();
  }

  /**
   * Create a new match using Reddit post creation
   * Requirement 2.1: Modify match creation to use Reddit post creation
   */
  async createMatch(config: MatchCreationConfig): Promise<RedditApiResult<RedditGameData>> {
    try {
      // Get Devvit context to ensure we're in a valid Reddit environment
      const contextResult = await this.complianceService.getDevvitContext();
      if (!contextResult.success || !contextResult.data) {
        return {
          success: false,
          error: "Invalid Reddit context - cannot create match outside Reddit environment"
        };
      }

      const devvitContext = contextResult.data;

      // Validate moderator permissions for match creation
      const permissionCheck = await this.complianceService.validateSubredditPermissions(
        devvitContext.subreddit,
        'manage_posts'
      );

      if (!permissionCheck.success || !permissionCheck.data) {
        return {
          success: false,
          error: "Insufficient permissions to create matches in this subreddit"
        };
      }

      // Create game post configuration
      const gamePostConfig: GamePostConfig = {
        title: config.title,
        description: config.description,
        gameType: config.gameType,
        duration: config.duration,
        ...(config.maxPlayers && { maxPlayers: config.maxPlayers }),
        difficulty: config.difficulty,
        rules: config.rules,
        ...(config.prizes && { prizes: config.prizes }),
        flairText: `PicTact ${config.gameType.toUpperCase()}`
      };

      // Create the Reddit post for the match
      const postResult = await this.postCommentService.createGamePost(gamePostConfig);
      if (!postResult.success || !postResult.data) {
        return {
          success: false,
          error: postResult.error || "Failed to create game post"
        };
      }

      const gamePost = postResult.data;

      // Generate unique game ID
      const gameId = `game_${gamePost.postId}_${Date.now()}`;

      // Create game thread structure using Reddit comments
      const gameThreadResult = await this.postCommentService.createGameThread(gamePost.postId, gameId);
      if (!gameThreadResult.success || !gameThreadResult.data) {
        return {
          success: false,
          error: gameThreadResult.error || "Failed to create game thread"
        };
      }

      const gameThread = gameThreadResult.data;

      // Create Reddit-compliant game data
      const gameData: RedditGameData = {
        // Reddit Context (never stored permanently)
        postId: gamePost.postId,
        subreddit: devvitContext.subreddit,
        
        // Game-Specific Data
        gameId: gameId,
        status: SharedGameStatus.INITIALIZING,
        configuration: this.createGameConfiguration(config, devvitContext),
        rounds: [],
        
        // Reddit Integration Points
        gamePostId: gamePost.postId,
        gameCommentId: gameThread.gameCommentId,
        resultCommentIds: [],
        
        // Game State
        currentRound: 0,
        totalRounds: config.rounds.length,
        players: [],
        startTime: new Date(),
        endTime: new Date(Date.now() + config.duration * 60 * 1000),
        
        // Leaderboard
        leaderboard: {
          entries: [],
          lastUpdated: new Date()
        },

        // Required timestamps
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        subredditContext: devvitContext.subreddit
      };

      // Store the active game
      this.activeGames.set(gameId, gameData);

      // Initialize real-time updates for the game
      await this.initializeGameUpdates(gameId, gameThread);

      // Update game status to waiting for players
      await this.updateGameStatus(gameId, SharedGameStatus.WAITING_FOR_PLAYERS);

      return {
        success: true,
        data: gameData
      };

    } catch (error) {
      console.error("Failed to create match:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create match"
      };
    }
  }

  /**
   * Start a game and begin the first round
   */
  async startGame(gameId: string): Promise<RedditApiResult<void>> {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) {
        return {
          success: false,
          error: "Game not found"
        };
      }

      // Update game status to active
      gameData.status = SharedGameStatus.ACTIVE;
      gameData.startTime = new Date();

      // Post game start announcement
      const gameThread = await this.getGameThread(gameId);
      if (gameThread) {
        await this.realTimeService.postGameStateChange(gameThread, 'game_started', {
          gameId: gameId,
          totalRounds: gameData.totalRounds
        });
      }

      // Start the first round
      await this.startNextRound(gameId);

      return { success: true };

    } catch (error) {
      console.error("Failed to start game:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start game"
      };
    }
  }

  /**
   * Update round management to use Reddit comment system
   * Requirement 2.2: Update round management to use Reddit comment system
   */
  async startNextRound(gameId: string): Promise<RedditApiResult<void>> {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) {
        return {
          success: false,
          error: "Game not found"
        };
      }

      // Check if there are more rounds to play
      if (gameData.currentRound >= gameData.totalRounds) {
        return await this.endGame(gameId);
      }

      // Increment round number
      gameData.currentRound++;
      gameData.status = SharedGameStatus.ROUND_IN_PROGRESS;

      // Get round configuration
      const roundConfig = gameData.configuration.rounds[gameData.currentRound - 1];
      if (!roundConfig) {
        return {
          success: false,
          error: "Round configuration not found"
        };
      }

      // Create round data
      const roundData: RedditRoundData = {
        roundIndex: gameData.currentRound,
        prompt: roundConfig.prompt,
        duration: roundConfig.duration,
        difficulty: roundConfig.difficulty,
        startTime: new Date(),
        endTime: new Date(Date.now() + roundConfig.duration * 1000),
        submissions: [],
        winner: null,
        status: 'active',
        promptCommentId: '',
        submissionCommentIds: []
      };

      // Add round to game data
      gameData.rounds.push(roundData);

      // Get game thread
      const gameThread = await this.getGameThread(gameId);
      if (!gameThread) {
        return {
          success: false,
          error: "Game thread not found"
        };
      }

      // Create round update for Reddit comment
      const roundUpdate: RoundUpdate = {
        roundNumber: gameData.currentRound,
        prompt: roundConfig.prompt,
        timeRemaining: roundConfig.duration,
        submissions: 0,
        status: 'active'
      };

      // Post round update to Reddit comments
      const roundCommentResult = await this.postCommentService.postRoundUpdate(gameThread, roundUpdate);
      if (roundCommentResult.success && roundCommentResult.data) {
        roundData.promptCommentId = roundCommentResult.data;
      }

      // Set up round timer
      this.setupRoundTimer(gameId, roundConfig.duration);

      // Post game state change
      await this.realTimeService.postGameStateChange(gameThread, 'round_started', {
        roundNumber: gameData.currentRound,
        prompt: roundConfig.prompt,
        duration: roundConfig.duration
      });

      return { success: true };

    } catch (error) {
      console.error("Failed to start next round:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start round"
      };
    }
  }

  /**
   * Process player submission with Reddit media handling
   * Requirement 4.1: Integrate submission processing with Reddit media handling
   */
  async processPlayerSubmission(gameId: string, submissionData: PlayerSubmissionData): Promise<RedditApiResult<RedditSubmission>> {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) {
        return {
          success: false,
          error: "Game not found"
        };
      }

      // Validate game state
      if (gameData.status !== SharedGameStatus.ROUND_IN_PROGRESS) {
        return {
          success: false,
          error: "No active round for submissions"
        };
      }

      // Get current round
      const currentRound = gameData.rounds[gameData.currentRound - 1];
      if (!currentRound) {
        return {
          success: false,
          error: "Current round not found"
        };
      }

      // Validate submission timing
      if (new Date() > currentRound.endTime) {
        return {
          success: false,
          error: "Round has ended, submissions no longer accepted"
        };
      }

      // Get Devvit context for media validation
      const contextResult = await this.complianceService.getDevvitContext();
      if (!contextResult.success || !contextResult.data) {
        return {
          success: false,
          error: "Invalid Reddit context"
        };
      }

      // Validate media content using enhanced Reddit validation system
      const contentValidation = await this.validationSystem.validateContent(
        submissionData.mediaUrl,
        contextResult.data
      );

      if (!contentValidation.success || !contentValidation.data?.isValid) {
        return {
          success: false,
          error: contentValidation.data?.communityGuidelines?.violationReasons?.join(', ') || 
                 "Submission violates content policies"
        };
      }

      // Create Reddit submission record
      const submission: RedditSubmission = {
        submissionId: `sub_${gameId}_${submissionData.playerId}_${Date.now()}`,
        gameId: gameId,
        playerId: submissionData.playerId,
        roundNumber: submissionData.roundNumber,
        mediaUrl: submissionData.mediaUrl,
        submissionTime: submissionData.submissionTime,
        validationResult: {
          isValid: contentValidation.data.isValid,
          isNSFW: contentValidation.data.isNSFW,
          contentWarnings: contentValidation.data.contentWarnings,
          violatesPolicy: contentValidation.data.violatesPolicy,
          moderationRequired: contentValidation.data.moderationRequired,
          validatedAt: contentValidation.data.validationMetadata.validatedAt,
          validatedBy: 'system'
        },
        status: 'pending_review'
      };

      // Add submission to round data
      currentRound.submissions.push(submission);

      // Get game thread for comment posting
      const gameThread = await this.getGameThread(gameId);
      if (gameThread) {
        // Post submission comment to Reddit
        const submissionCommentResult = await this.postCommentService.handlePlayerSubmission(
          gameThread,
          submissionData.playerId,
          submissionData.mediaUrl,
          submissionData.roundNumber
        );

        if (submissionCommentResult.success && submissionCommentResult.data) {
          submission.commentId = submissionCommentResult.data;
          currentRound.submissionCommentIds.push(submissionCommentResult.data);
        }
      }

      // Calculate submission score using Reddit scoring system
      await this.scoringSystem.calculateSubmissionScore(
        gameId,
        submissionData.playerId,
        submissionData.roundNumber,
        {
          submissionTime: submissionData.submissionTime,
          isWinner: !currentRound.winner && contentValidation.data.isValid,
          difficulty: currentRound.difficulty || 'medium',
          submissionUrl: submissionData.mediaUrl,
          ...(submission.commentId && { commentId: submission.commentId })
        },
        contextResult.data
      );

      // Check if this is the first valid submission (winner)
      if (!currentRound.winner && contentValidation.data.isValid) {
        await this.declareRoundWinner(gameId, submission);
      }

      // Update leaderboard using Reddit scoring system
      await this.updateLeaderboardWithScoring(gameId);

      return {
        success: true,
        data: submission
      };

    } catch (error) {
      console.error("Failed to process player submission:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process submission"
      };
    }
  }

  /**
   * Declare round winner and update game state
   */
  private async declareRoundWinner(gameId: string, winningSubmission: RedditSubmission): Promise<void> {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) return;

      const currentRound = gameData.rounds[gameData.currentRound - 1];
      if (!currentRound) return;

      // Set round winner
      currentRound.winner = {
        playerId: winningSubmission.playerId,
        submissionId: winningSubmission.submissionId,
        submissionUrl: winningSubmission.mediaUrl,
        score: 10 // Base score for winning a round
      };

      // Update player score in leaderboard
      let playerEntry = gameData.leaderboard.entries.find(e => e.playerId === winningSubmission.playerId);
      if (!playerEntry) {
        playerEntry = {
          rank: 0,
          playerId: winningSubmission.playerId,
          score: 0,
          wins: 0,
          submissions: 0,
          lastActive: new Date()
        };
        gameData.leaderboard.entries.push(playerEntry);
      }

      playerEntry.score += 10;
      playerEntry.wins++;
      playerEntry.lastActive = new Date();

      // Post winner announcement
      const gameThread = await this.getGameThread(gameId);
      if (gameThread) {
        await this.realTimeService.postGameStateChange(gameThread, 'round_ended', {
          roundNumber: gameData.currentRound,
          winner: winningSubmission.playerId,
          winningSubmission: winningSubmission.mediaUrl
        });
      }

      // End the round
      await this.endCurrentRound(gameId);

    } catch (error) {
      console.error("Failed to declare round winner:", error);
    }
  }

  /**
   * End the current round and prepare for next
   */
  private async endCurrentRound(gameId: string): Promise<void> {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) return;

      const currentRound = gameData.rounds[gameData.currentRound - 1];
      if (!currentRound) return;

      // Update round status
      currentRound.status = 'completed';
      currentRound.endTime = new Date();

      // Clear round timer
      const timer = this.gameTimers.get(`${gameId}_round`);
      if (timer) {
        clearTimeout(timer);
        this.gameTimers.delete(`${gameId}_round`);
      }

      // Update game status
      gameData.status = SharedGameStatus.ROUND_ENDED;

      // Update leaderboard
      await this.updateLeaderboard(gameId);

      // Start next round after a brief delay
      setTimeout(async () => {
        await this.startNextRound(gameId);
      }, 5000); // 5 second delay between rounds

    } catch (error) {
      console.error("Failed to end current round:", error);
    }
  }

  /**
   * Update leaderboard using Reddit scoring system
   */
  private async updateLeaderboardWithScoring(gameId: string): Promise<void> {
    try {
      const gameThread = await this.getGameThread(gameId);
      if (!gameThread) return;

      const contextResult = await this.complianceService.getDevvitContext();
      if (!contextResult.success || !contextResult.data) return;

      // Update leaderboard display using Reddit scoring system
      await this.scoringSystem.updateLeaderboardDisplay(gameId, gameThread, contextResult.data);

    } catch (error) {
      console.error("Failed to update leaderboard with scoring:", error);
    }
  }

  /**
   * Update leaderboard and post to Reddit comments (legacy method)
   */
  private async updateLeaderboard(gameId: string): Promise<void> {
    // Delegate to the new scoring system method
    await this.updateLeaderboardWithScoring(gameId);
  }

  /**
   * End the game and post final results
   */
  private async endGame(gameId: string): Promise<RedditApiResult<void>> {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) {
        return {
          success: false,
          error: "Game not found"
        };
      }

      // Update game status
      gameData.status = SharedGameStatus.COMPLETED;
      gameData.endTime = new Date();

      // Clear all timers
      this.clearGameTimers(gameId);

      // Post final results using Reddit scoring system
      const gameThread = await this.getGameThread(gameId);
      if (gameThread) {
        const contextResult = await this.complianceService.getDevvitContext();
        if (contextResult.success && contextResult.data) {
          // Announce game results with Reddit-native formatting
          await this.scoringSystem.announceGameResults(gameId, gameThread, contextResult.data);
        }

        const winner = gameData.leaderboard.entries[0];
        await this.realTimeService.postGameStateChange(gameThread, 'game_ended', {
          gameId: gameId,
          totalRounds: gameData.totalRounds,
          winner: winner?.playerId || null
        });
      }

      // Stop real-time updates
      this.realTimeService.stopPolling(`game_${gameData.postId}`);

      // Clean up active game (in production, this would persist to storage)
      this.activeGames.delete(gameId);

      return { success: true };

    } catch (error) {
      console.error("Failed to end game:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to end game"
      };
    }
  }

  /**
   * Get game thread for a game ID
   */
  private async getGameThread(gameId: string): Promise<GameThread | null> {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) return null;

      // Reconstruct game thread from game data
      const gameThread: GameThread = {
        postId: gameData.postId,
        gameCommentId: gameData.gameCommentId,
        rulesCommentId: '', // Would be stored in game data in full implementation
        statusCommentId: '', // Would be stored in game data in full implementation

        roundCommentIds: gameData.rounds.map(r => r.promptCommentId),
        submissionCommentIds: gameData.rounds.flatMap(r => r.submissionCommentIds),
        lastUpdateTime: new Date()
      };

      return gameThread;
    } catch (error) {
      console.error("Failed to get game thread:", error);
      return null;
    }
  }

  /**
   * Initialize real-time updates for a game
   */
  private async initializeGameUpdates(gameId: string, gameThread: GameThread): Promise<void> {
    try {
      const updateCallback = (update: GameUpdate) => {
        this.handleGameUpdate(gameId, update);
      };

      this.gameUpdateCallbacks.set(gameId, updateCallback);

      await this.realTimeService.initializeGamePolling(gameThread, updateCallback);
    } catch (error) {
      console.error("Failed to initialize game updates:", error);
    }
  }

  /**
   * Handle real-time game updates
   */
  private handleGameUpdate(gameId: string, update: GameUpdate): void {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) return;

      // Process different types of updates
      switch (update.type) {
        case 'submission':
          // Handle new submission notifications
          console.log(`New submission in game ${gameId}:`, update.data);
          break;
        
        case 'timer':
          // Handle timer updates
          console.log(`Timer update for game ${gameId}:`, update.data);
          break;
        
        case 'status':
          // Handle status changes
          console.log(`Status update for game ${gameId}:`, update.data);
          break;
        
        default:
          console.log(`Unhandled update type ${update.type} for game ${gameId}`);
      }
    } catch (error) {
      console.error("Failed to handle game update:", error);
    }
  }

  /**
   * Set up round timer
   */
  private setupRoundTimer(gameId: string, durationSeconds: number): void {
    const timerKey = `${gameId}_round`;
    
    // Clear existing timer
    const existingTimer = this.gameTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      await this.endCurrentRound(gameId);
    }, durationSeconds * 1000);

    this.gameTimers.set(timerKey, timer);
  }

  /**
   * Clear all timers for a game
   */
  private clearGameTimers(gameId: string): void {
    const timersToRemove = Array.from(this.gameTimers.keys()).filter(key => key.startsWith(gameId));
    
    for (const timerKey of timersToRemove) {
      const timer = this.gameTimers.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        this.gameTimers.delete(timerKey);
      }
    }
  }

  /**
   * Update game status
   */
  private async updateGameStatus(gameId: string, status: SharedGameStatus): Promise<void> {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) return;

      gameData.status = status;

      const gameThread = await this.getGameThread(gameId);
      if (gameThread) {
        await this.realTimeService.postGameStateChange(gameThread, status, {
          gameId: gameId
        });
      }
    } catch (error) {
      console.error("Failed to update game status:", error);
    }
  }

  /**
   * Create game configuration from match config
   */
  private createGameConfiguration(config: MatchCreationConfig, context: DevvitContext): RedditGameConfiguration {
    return {
      title: config.title,
      description: config.description,
      gameType: config.gameType,
      duration: config.duration,
      ...(config.maxPlayers && { maxPlayers: config.maxPlayers }),
      difficulty: config.difficulty,
      rules: config.rules,
      rounds: config.rounds.map(round => ({
        prompt: round.prompt,
        duration: round.duration,
        ...(round.maxSubmissions && { maxSubmissions: round.maxSubmissions }),
        difficulty: round.difficulty
      })),
      ...(config.prizes && { prizes: config.prizes }),
      subreddit: context.subreddit,
      createdBy: context.userId || 'anonymous',
      createdAt: new Date(),
      isNSFW: false,
      allowLateSubmissions: false,
      autoAdvanceRounds: true
    };
  }

  /**
   * Get active game data
   */
  getGameData(gameId: string): RedditGameData | undefined {
    return this.activeGames.get(gameId);
  }

  /**
   * Get all active games
   */
  getAllActiveGames(): RedditGameData[] {
    return Array.from(this.activeGames.values());
  }

  /**
   * Pause a game
   */
  async pauseGame(gameId: string): Promise<RedditApiResult<void>> {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) {
        return {
          success: false,
          error: "Game not found"
        };
      }

      gameData.status = SharedGameStatus.PAUSED;
      
      // Clear timers
      this.clearGameTimers(gameId);

      // Post status update
      await this.updateGameStatus(gameId, SharedGameStatus.PAUSED);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to pause game"
      };
    }
  }

  /**
   * Resume a paused game
   */
  async resumeGame(gameId: string): Promise<RedditApiResult<void>> {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData || gameData.status !== SharedGameStatus.PAUSED) {
        return {
          success: false,
          error: "Game not found or not paused"
        };
      }

      gameData.status = SharedGameStatus.ROUND_IN_PROGRESS;

      // Resume current round if applicable
      const currentRound = gameData.rounds[gameData.currentRound - 1];
      if (currentRound && currentRound.status === 'active') {
        const remainingTime = Math.max(0, Math.floor((currentRound.endTime.getTime() - Date.now()) / 1000));
        if (remainingTime > 0) {
          this.setupRoundTimer(gameId, remainingTime);
        }
      }

      // Post status update
      await this.updateGameStatus(gameId, SharedGameStatus.ROUND_IN_PROGRESS);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to resume game"
      };
    }
  }

  /**
   * Cancel a game
   */
  async cancelGame(gameId: string): Promise<RedditApiResult<void>> {
    try {
      const gameData = this.activeGames.get(gameId);
      if (!gameData) {
        return {
          success: false,
          error: "Game not found"
        };
      }

      gameData.status = SharedGameStatus.CANCELLED;
      gameData.endTime = new Date();

      // Clear all timers
      this.clearGameTimers(gameId);

      // Post cancellation notice
      const gameThread = await this.getGameThread(gameId);
      if (gameThread) {
        await this.realTimeService.postGameStateChange(gameThread, 'game_cancelled', {
          gameId: gameId,
          reason: 'Game cancelled by moderator'
        });
      }

      // Stop real-time updates
      this.realTimeService.stopPolling(`game_${gameData.postId}`);

      // Clean up
      this.activeGames.delete(gameId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel game"
      };
    }
  }
}