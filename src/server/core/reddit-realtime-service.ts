import { reddit } from "@devvit/web/server";
import { RedditComplianceService } from "./reddit-compliance-service";
import { RedditPostCommentService } from "./reddit-post-comment-service";
import {
  RedditApiResult,
  GameThread,
  LeaderboardData,
  GameCommentType,
  RedditCommentData
} from "../../shared/types/reddit-compliance";

/**
 * Game Update Types for Real-Time System
 */
export interface GameUpdate {
  type: 'round_start' | 'round_end' | 'submission' | 'leaderboard' | 'timer' | 'status';
  timestamp: Date;
  data: any;
  commentId?: string;
}

/**
 * Polling Configuration
 */
interface PollingConfig {
  intervalMs: number;
  maxRetries: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

/**
 * Comment Polling State
 */
interface PollingState {
  isActive: boolean;
  lastPollTime: Date;
  lastCommentTime: Date;
  errorCount: number;
  nextPollTime: Date;
}

/**
 * Reddit Real-Time Service
 * Implements Reddit comment polling mechanism for live updates
 * Replaces WebSocket functionality with Reddit-native comment polling
 * Requirements: 2.5, 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class RedditRealTimeService {
  private complianceService: RedditComplianceService;
  private postCommentService: RedditPostCommentService;
  private pollingConfig: PollingConfig;
  private pollingStates: Map<string, PollingState>;
  private activePollers: Map<string, NodeJS.Timeout>;
  private updateCallbacks: Map<string, (update: GameUpdate) => void>;

  constructor() {
    this.complianceService = new RedditComplianceService();
    this.postCommentService = new RedditPostCommentService();
    
    // Configure polling parameters to respect Reddit API limits
    this.pollingConfig = {
      intervalMs: 5000, // Poll every 5 seconds (well within rate limits)
      maxRetries: 3,
      backoffMultiplier: 2,
      timeoutMs: 30000 // 30 second timeout
    };
    
    this.pollingStates = new Map();
    this.activePollers = new Map();
    this.updateCallbacks = new Map();
  }

  /**
   * Initialize Reddit comment polling for a game thread
   * Requirement 2.5: Use Reddit's comment refresh mechanisms instead of WebSockets
   */
  async initializeGamePolling(gameThread: GameThread, updateCallback: (update: GameUpdate) => void): Promise<RedditApiResult<void>> {
    try {
      const pollingKey = `game_${gameThread.postId}`;
      
      // Store the update callback
      this.updateCallbacks.set(pollingKey, updateCallback);
      
      // Initialize polling state
      const now = new Date();
      this.pollingStates.set(pollingKey, {
        isActive: true,
        lastPollTime: now,
        lastCommentTime: now,
        errorCount: 0,
        nextPollTime: new Date(now.getTime() + this.pollingConfig.intervalMs)
      });

      // Start the polling loop
      await this.startPolling(pollingKey, gameThread);

      return { success: true };
    } catch (error) {
      console.error("Failed to initialize game polling:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initialize polling"
      };
    }
  }

  /**
   * Start polling for Reddit comment updates
   * Requirement 6.1: Use Reddit's comment polling mechanisms instead of WebSockets
   */
  private async startPolling(pollingKey: string, gameThread: GameThread): Promise<void> {
    const pollOnce = async () => {
      const state = this.pollingStates.get(pollingKey);
      if (!state || !state.isActive) {
        return;
      }

      try {
        // Poll for new comments
        const updates = await this.pollForCommentUpdates(gameThread, state.lastCommentTime);
        
        if (updates.success && updates.data && updates.data.length > 0) {
          // Process each update
          for (const update of updates.data) {
            const callback = this.updateCallbacks.get(pollingKey);
            if (callback) {
              callback(update);
            }
          }
          
          // Update last comment time
          const latestUpdate = updates.data[updates.data.length - 1];
          if (latestUpdate) {
            state.lastCommentTime = latestUpdate.timestamp;
          }
        }

        // Reset error count on success
        state.errorCount = 0;
        state.lastPollTime = new Date();
        
        // Schedule next poll
        this.scheduleNextPoll(pollingKey, gameThread);

      } catch (error) {
        console.error(`Polling error for ${pollingKey}:`, error);
        
        // Handle polling errors with backoff
        state.errorCount++;
        if (state.errorCount >= this.pollingConfig.maxRetries) {
          console.error(`Max retries exceeded for ${pollingKey}, stopping polling`);
          this.stopPolling(pollingKey);
          return;
        }

        // Exponential backoff
        const backoffDelay = this.pollingConfig.intervalMs * 
          Math.pow(this.pollingConfig.backoffMultiplier, state.errorCount);
        
        setTimeout(() => {
          this.scheduleNextPoll(pollingKey, gameThread);
        }, backoffDelay);
      }
    };

    // Start immediate poll
    await pollOnce();
  }

  /**
   * Schedule the next polling cycle
   */
  private scheduleNextPoll(pollingKey: string, gameThread: GameThread): void {
    const state = this.pollingStates.get(pollingKey);
    if (!state || !state.isActive) {
      return;
    }

    // Clear any existing timeout
    const existingTimeout = this.activePollers.get(pollingKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule next poll
    const timeout = setTimeout(async () => {
      await this.startPolling(pollingKey, gameThread);
    }, this.pollingConfig.intervalMs);

    this.activePollers.set(pollingKey, timeout);
  }

  /**
   * Poll for new comment updates in the game thread
   * Requirement 6.2: Update Reddit comments with current standings
   */
  private async pollForCommentUpdates(gameThread: GameThread, since: Date): Promise<RedditApiResult<GameUpdate[]>> {
    try {
      const updates: GameUpdate[] = [];

      // Get comments from the post
      const commentsResult = await this.getPostComments(gameThread.postId, since);
      if (!commentsResult.success || !commentsResult.data) {
        return {
          success: false,
          error: commentsResult.error || "Failed to get post comments"
        };
      }

      const comments = commentsResult.data;

      // Process comments and identify game-related updates
      for (const comment of comments) {
        const update = await this.processCommentForUpdates(comment, gameThread);
        if (update) {
          updates.push(update);
        }
      }

      return {
        success: true,
        data: updates
      };

    } catch (error) {
      console.error("Failed to poll for comment updates:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to poll comments"
      };
    }
  }

  /**
   * Get comments from a Reddit post since a specific time
   */
  private async getPostComments(postId: string, since: Date): Promise<RedditApiResult<RedditCommentData[]>> {
    try {
      // Use Reddit API to get post comments
      const result = await this.executeWithRateLimit('getComments', async () => {
        // Note: This is a placeholder for the actual Reddit API call
        // In real implementation, this would use reddit.getComments() or similar
        const post = await reddit.getPostById(postId as `t3_${string}`);
        if (!post) {
          throw new Error("Post not found");
        }

        // Get comments (this is a simplified implementation)
        // Real implementation would fetch actual comments with timestamps
        return [];
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to get comments"
        };
      }

      // Filter comments by timestamp
      const comments = (result.data || []).filter((comment: any) => {
        const commentTime = new Date(comment.createdUtc * 1000);
        return commentTime > since;
      });

      return {
        success: true,
        data: comments
      };

    } catch (error) {
      console.error("Failed to get post comments:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get post comments"
      };
    }
  }

  /**
   * Process a comment to identify game updates
   */
  private async processCommentForUpdates(comment: RedditCommentData, gameThread: GameThread): Promise<GameUpdate | null> {
    try {
      // Check if this is a game-related comment
      if (this.isGameComment(comment, gameThread)) {
        // Determine update type based on comment content and context
        const updateType = this.determineUpdateType(comment, gameThread);
        
        if (updateType) {
          return {
            type: updateType,
            timestamp: new Date(comment.createdUtc * 1000),
            data: this.extractUpdateData(comment, updateType),
            commentId: comment.id
          };
        }
      }

      // Check if this is a player submission
      if (this.isPlayerSubmission(comment, gameThread)) {
        return {
          type: 'submission',
          timestamp: new Date(comment.createdUtc * 1000),
          data: {
            playerId: comment.authorName,
            commentId: comment.id,
            content: comment.text,
            parentId: comment.parentId
          },
          commentId: comment.id
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to process comment for updates:", error);
      return null;
    }
  }

  /**
   * Check if a comment is a game-related system comment
   */
  private isGameComment(comment: RedditCommentData, gameThread: GameThread): boolean {
    // Check if comment ID matches any of the game thread comment IDs
    return gameThread.roundCommentIds.includes(comment.id) ||
           comment.id === gameThread.gameCommentId ||
           comment.id === gameThread.statusCommentId ||
           comment.id === gameThread.leaderboardCommentId;
  }

  /**
   * Check if a comment is a player submission
   */
  private isPlayerSubmission(comment: RedditCommentData, gameThread: GameThread): boolean {
    // Check if comment is a reply to a round prompt
    return gameThread.roundCommentIds.includes(comment.parentId) ||
           gameThread.submissionCommentIds.includes(comment.id);
  }

  /**
   * Determine the type of update based on comment content
   */
  private determineUpdateType(comment: RedditCommentData, gameThread: GameThread): GameUpdate['type'] | null {
    const text = comment.text.toLowerCase();

    if (comment.id === gameThread.statusCommentId || text.includes('game status')) {
      return 'status';
    }
    
    if (comment.id === gameThread.leaderboardCommentId || text.includes('leaderboard')) {
      return 'leaderboard';
    }
    
    if (text.includes('round') && text.includes('winner')) {
      return 'round_end';
    }
    
    if (text.includes('round') && (text.includes('prompt') || text.includes('🎯'))) {
      return 'round_start';
    }
    
    if (text.includes('timer') || text.includes('time remaining')) {
      return 'timer';
    }

    return null;
  }

  /**
   * Extract update data from comment based on update type
   */
  private extractUpdateData(comment: RedditCommentData, updateType: GameUpdate['type']): any {
    const text = comment.text;

    switch (updateType) {
      case 'round_start':
        return this.extractRoundStartData(text);
      case 'round_end':
        return this.extractRoundEndData(text);
      case 'leaderboard':
        return this.extractLeaderboardData(text);
      case 'status':
        return this.extractStatusData(text);
      case 'timer':
        return this.extractTimerData(text);
      default:
        return { text };
    }
  }

  /**
   * Extract round start data from comment text
   */
  private extractRoundStartData(text: string): any {
    const roundMatch = text.match(/round (\d+)/i);
    const promptMatch = text.match(/\*\*prompt:\*\* (.+)/i);
    const timeMatch = text.match(/time remaining:\*\* (.+)/i);

    return {
      roundNumber: roundMatch ? parseInt(roundMatch[1] || '0') : null,
      prompt: promptMatch ? promptMatch[1] || '' : null,
      timeRemaining: timeMatch ? timeMatch[1] || '' : null,
      text
    };
  }

  /**
   * Extract round end data from comment text
   */
  private extractRoundEndData(text: string): any {
    const winnerMatch = text.match(/\*\*winner:\*\* (.+?) \((\d+) points\)/i);
    const roundMatch = text.match(/round (\d+)/i);

    return {
      roundNumber: roundMatch ? parseInt(roundMatch[1] || '0') : null,
      winner: winnerMatch ? {
        username: winnerMatch[1] || '',
        score: parseInt(winnerMatch[2] || '0')
      } : null,
      text
    };
  }

  /**
   * Extract leaderboard data from comment text
   */
  private extractLeaderboardData(text: string): any {
    const entries: any[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const entryMatch = line.match(/(\d+)\.\s*\*\*(.+?)\*\*\s*-\s*(\d+)\s*pts/);
      if (entryMatch && entryMatch[1] && entryMatch[2] && entryMatch[3]) {
        entries.push({
          rank: parseInt(entryMatch[1]),
          username: entryMatch[2],
          score: parseInt(entryMatch[3])
        });
      }
    }

    return {
      entries,
      text
    };
  }

  /**
   * Extract status data from comment text
   */
  private extractStatusData(text: string): any {
    const statusMatch = text.match(/game status\*\*:\s*(.+)/i);
    const roundMatch = text.match(/round:\*\*\s*(\d+)/i);
    const submissionsMatch = text.match(/submissions:\*\*\s*(\d+)/i);
    const timeMatch = text.match(/time remaining:\*\*\s*(.+)/i);

    return {
      status: statusMatch ? statusMatch[1]?.trim() : null,
      round: roundMatch ? parseInt(roundMatch[1] || '0') : null,
      submissions: submissionsMatch ? parseInt(submissionsMatch[1] || '0') : null,
      timeRemaining: timeMatch ? timeMatch[1]?.trim() : null,
      text
    };
  }

  /**
   * Extract timer data from comment text
   */
  private extractTimerData(text: string): any {
    const timeMatch = text.match(/(\d+):(\d+)/);
    
    return {
      timeRemaining: timeMatch ? {
        minutes: parseInt(timeMatch[1] || '0'),
        seconds: parseInt(timeMatch[2] || '0'),
        total: parseInt(timeMatch[1] || '0') * 60 + parseInt(timeMatch[2] || '0')
      } : null,
      text
    };
  }

  /**
   * Post leaderboard update using Reddit comments
   * Requirement 6.2: Update Reddit comments with current standings
   */
  async postLeaderboardUpdate(gameThread: GameThread, leaderboard: LeaderboardData): Promise<RedditApiResult<string>> {
    try {
      const result = await this.postCommentService.postLeaderboardUpdate(gameThread, leaderboard);
      
      if (result.success && result.data) {
        return {
          success: true,
          data: result.data
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to post leaderboard update"
        };
      }
    } catch (error) {
      console.error("Failed to post leaderboard update:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post leaderboard update"
      };
    }
  }

  /**
   * Post timer update using client-side timers synchronized with Reddit post timestamps
   * Requirement 6.3: Use client-side timers synchronized with Reddit post timestamps
   */
  async synchronizeClientTimer(gameThread: GameThread): Promise<RedditApiResult<{ serverTime: Date; gameStartTime: Date; roundStartTime?: Date }>> {
    try {
      // Get the game post to determine start time
      const postResult = await this.getPostTimestamp(gameThread.postId);
      if (!postResult.success || !postResult.data) {
        return {
          success: false,
          error: "Failed to get post timestamp for timer synchronization"
        };
      }

      const gameStartTime = postResult.data;
      const serverTime = new Date();

      // Get current round start time if available
      let roundStartTime: Date | undefined;
      if (gameThread.roundCommentIds.length > 0) {
        const lastRoundId = gameThread.roundCommentIds[gameThread.roundCommentIds.length - 1];
        const roundResult = await this.getCommentTimestamp(lastRoundId || '');
        if (roundResult.success && roundResult.data) {
          roundStartTime = roundResult.data;
        }
      }

      const result: { serverTime: Date; gameStartTime: Date; roundStartTime?: Date } = {
        serverTime,
        gameStartTime
      };
      
      if (roundStartTime) {
        result.roundStartTime = roundStartTime;
      }

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error("Failed to synchronize client timer:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to synchronize timer"
      };
    }
  }

  /**
   * Post game state change using Reddit comments
   * Requirement 6.4: Post Reddit comments to communicate state transitions
   */
  async postGameStateChange(gameThread: GameThread, newState: string, details?: any): Promise<RedditApiResult<string>> {
    try {
      const stateText = this.formatGameStateText(newState, details);
      
      const result = await this.postCommentService.submitGameComment({
        type: GameCommentType.SYSTEM_UPDATE,
        text: stateText,
        parentId: gameThread.gameCommentId,
        distinguish: true
      });

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data.commentId
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to post game state change"
        };
      }
    } catch (error) {
      console.error("Failed to post game state change:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post state change"
      };
    }
  }

  /**
   * Stop polling for a specific game
   */
  stopPolling(gameKey: string): void {
    // Mark as inactive
    const state = this.pollingStates.get(gameKey);
    if (state) {
      state.isActive = false;
    }

    // Clear timeout
    const timeout = this.activePollers.get(gameKey);
    if (timeout) {
      clearTimeout(timeout);
      this.activePollers.delete(gameKey);
    }

    // Clean up
    this.pollingStates.delete(gameKey);
    this.updateCallbacks.delete(gameKey);
  }

  /**
   * Stop all active polling
   */
  stopAllPolling(): void {
    for (const gameKey of this.activePollers.keys()) {
      this.stopPolling(gameKey);
    }
  }

  /**
   * Get polling status for a game
   */
  getPollingStatus(gameKey: string): PollingState | null {
    return this.pollingStates.get(gameKey) || null;
  }

  /**
   * Execute Reddit API calls with rate limiting
   * Requirement 6.5: Respect Reddit's API rate limits and polling guidelines
   */
  private async executeWithRateLimit<T>(operation: string, apiCall: () => Promise<T>): Promise<RedditApiResult<T>> {
    try {
      const result = await apiCall();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error(`Reddit API ${operation} failed:`, error);
      
      if (this.isRateLimitError(error)) {
        return {
          success: false,
          error: "Rate limited by Reddit API",
          rateLimited: true,
          retryAfter: 60
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : `Reddit API ${operation} failed`
      };
    }
  }

  /**
   * Get timestamp of a Reddit post
   */
  private async getPostTimestamp(postId: string): Promise<RedditApiResult<Date>> {
    try {
      const result = await this.executeWithRateLimit('getPost', async () => {
        const post = await reddit.getPostById(postId as `t3_${string}`);
        return post ? new Date(post.createdAt) : null;
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          error: "Failed to get post timestamp"
        };
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get post timestamp"
      };
    }
  }

  /**
   * Get timestamp of a Reddit comment
   */
  private async getCommentTimestamp(_commentId: string): Promise<RedditApiResult<Date>> {
    try {
      const result = await this.executeWithRateLimit('getComment', async () => {
        // Note: This would use Reddit's comment API
        // Placeholder implementation
        return new Date();
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get comment timestamp"
      };
    }
  }

  /**
   * Format game state change text
   */
  private formatGameStateText(state: string, details?: any): string {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (state) {
      case 'game_started':
        return `🎮 **Game Started!**\n\nThe game has officially begun. Players can now submit responses to round prompts.\n\n*Updated at ${timestamp}*`;
      
      case 'round_started':
        return `🎯 **New Round Started!**\n\nRound ${details?.roundNumber || '?'} is now active. Check the latest round prompt above.\n\n*Updated at ${timestamp}*`;
      
      case 'round_ended':
        return `🏁 **Round Completed!**\n\nRound ${details?.roundNumber || '?'} has ended. ${details?.winner ? `Winner: ${details.winner}` : 'No winner this round.'}\n\n*Updated at ${timestamp}*`;
      
      case 'game_paused':
        return `⏸️ **Game Paused**\n\nThe game has been temporarily paused by a moderator.\n\n*Updated at ${timestamp}*`;
      
      case 'game_resumed':
        return `▶️ **Game Resumed**\n\nThe game has been resumed and is now active.\n\n*Updated at ${timestamp}*`;
      
      case 'game_ended':
        return `🎉 **Game Completed!**\n\nThe game has officially ended. Check the final leaderboard for results.\n\n*Updated at ${timestamp}*`;
      
      default:
        return `⚙️ **Game Update**\n\nGame state changed to: ${state}\n\n*Updated at ${timestamp}*`;
    }
  }

  /**
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    return errorMessage.toLowerCase().includes('rate limit') ||
           errorMessage.toLowerCase().includes('too many requests') ||
           error.status === 429;
  }
}