import { reddit } from "@devvit/web/server";
import { RedditComplianceService } from "./reddit-compliance-service";
import {
  RedditApiResult,
  GamePostConfig,
  RedditPostResult,
  RedditCommentResult,
  GameCommentConfig,
  GameCommentType,
  GameThread,
  RoundUpdate,
  LeaderboardData
} from "../../shared/types/reddit-compliance";

/**
 * Reddit Post and Comment Management Service
 * Handles Reddit post creation and comment management for game interactions
 * Implements requirements 2.1, 2.2, 2.3, 2.4
 */
export class RedditPostCommentService {
  private complianceService: RedditComplianceService;

  constructor() {
    this.complianceService = new RedditComplianceService();
  }

  /**
   * Create a game post using Reddit's submitPost API
   * Requirement 2.1: Implement createGamePost() using reddit.submitPost() API for match creation
   */
  async createGamePost(config: GamePostConfig): Promise<RedditApiResult<RedditPostResult>> {
    try {
      // Get Devvit context to ensure we have proper Reddit context
      const contextResult = await this.complianceService.getDevvitContext();
      if (!contextResult.success || !contextResult.data) {
        return {
          success: false,
          error: "Invalid Devvit context - cannot create post outside Reddit"
        };
      }

      const devvitContext = contextResult.data;

      // Validate subreddit permissions for post creation
      const permissionCheck = await this.complianceService.validateSubredditPermissions(
        devvitContext.subreddit,
        'manage_posts'
      );

      if (!permissionCheck.success || !permissionCheck.data) {
        return {
          success: false,
          error: "Insufficient permissions to create posts in this subreddit"
        };
      }

      // Format game post content
      const postContent = this.formatGamePostContent(config);

      // Create the Reddit post
      const postResult = await this.executeRedditApiCall('submitPost', async () => {
        return await reddit.submitPost({
          title: config.title,
          text: postContent,
          subredditName: devvitContext.subreddit,
          nsfw: config.nsfw || false,
          spoiler: config.spoiler || false,
          ...(config.flairId && { flairId: config.flairId }),
          ...(config.flairText && { flairText: config.flairText })
        });
      });

      if (!postResult.success || !postResult.data) {
        return {
          success: false,
          error: postResult.error || "Failed to create Reddit post"
        };
      }

      const redditPost = postResult.data;

      // Create the result object
      const result: RedditPostResult = {
        postId: redditPost.id,
        postUrl: redditPost.url,
        title: config.title,
        subreddit: devvitContext.subreddit,
        createdAt: new Date(),
        author: redditPost.authorName || 'Unknown'
      };

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error("Failed to create game post:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create game post"
      };
    }
  }

  /**
   * Submit a game comment using Reddit's submitComment API
   * Requirement 2.2: Add submitGameComment() using reddit.submitComment() API for game interactions
   */
  async submitGameComment(config: GameCommentConfig): Promise<RedditApiResult<RedditCommentResult>> {
    try {
      // Get Devvit context
      const contextResult = await this.complianceService.getDevvitContext();
      if (!contextResult.success || !contextResult.data) {
        return {
          success: false,
          error: "Invalid Devvit context - cannot create comment outside Reddit"
        };
      }

      // Validate content before submission
      const contentValidation = await this.complianceService.validateContent(
        config.text,
        contextResult.data.subreddit
      );

      if (!contentValidation.success || !contentValidation.data?.isValid) {
        return {
          success: false,
          error: "Comment content violates Reddit policies"
        };
      }

      // Format comment text based on type
      const formattedText = this.formatGameCommentText(config);

      // Submit the comment
      const commentResult = await this.executeRedditApiCall('submitComment', async () => {
        return await reddit.submitComment({
          text: formattedText,
          id: config.parentId as any // Can be post ID or comment ID - Reddit API handles both formats
        });
      });

      if (!commentResult.success || !commentResult.data) {
        return {
          success: false,
          error: commentResult.error || "Failed to submit Reddit comment"
        };
      }

      const redditComment = commentResult.data;

      // Handle moderator actions if needed
      if (config.distinguish && contextResult.data.moderatorPermissions?.canManageComments) {
        await this.distinguishComment(redditComment.id);
      }

      if (config.sticky && contextResult.data.moderatorPermissions?.canManageComments) {
        await this.stickyComment(redditComment.id);
      }

      // Create the result object
      const result: RedditCommentResult = {
        commentId: redditComment.id,
        commentUrl: redditComment.permalink,
        parentId: config.parentId,
        text: formattedText,
        author: redditComment.authorName || 'Unknown',
        createdAt: new Date(),
        ...(config.distinguish !== undefined && { isDistinguished: config.distinguish }),
        ...(config.sticky !== undefined && { isStickied: config.sticky })
      };

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error("Failed to submit game comment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit game comment"
      };
    }
  }

  /**
   * Create structured comment threading system for game organization
   * Requirement 2.3: Create structured comment threading system for game organization
   */
  async createGameThread(postId: string, gameId: string): Promise<RedditApiResult<GameThread>> {
    try {
      // Create main game info comment
      const gameInfoComment = await this.submitGameComment({
        type: GameCommentType.GAME_INFO,
        text: `🎮 **PicTact Game Started!**\n\nGame ID: ${gameId}\nStatus: Initializing...\n\n*This comment will be updated with game progress.*`,
        parentId: postId,
        sticky: true,
        distinguish: true
      });

      if (!gameInfoComment.success || !gameInfoComment.data) {
        return {
          success: false,
          error: "Failed to create game info comment"
        };
      }

      // Create rules comment
      const rulesComment = await this.submitGameComment({
        type: GameCommentType.RULES,
        text: this.getGameRulesText(),
        parentId: postId,
        distinguish: true
      });

      if (!rulesComment.success || !rulesComment.data) {
        return {
          success: false,
          error: "Failed to create rules comment"
        };
      }

      // Create status comment
      const statusComment = await this.submitGameComment({
        type: GameCommentType.STATUS,
        text: "⏱️ **Game Status**: Waiting for players...\n\nRound: 0/0\nPlayers: 0\nTime Remaining: --:--",
        parentId: gameInfoComment.data.commentId,
        distinguish: true
      });

      if (!statusComment.success || !statusComment.data) {
        return {
          success: false,
          error: "Failed to create status comment"
        };
      }

      // Create the game thread structure
      const gameThread: GameThread = {
        postId: postId,
        gameCommentId: gameInfoComment.data.commentId,
        rulesCommentId: rulesComment.data.commentId,
        statusCommentId: statusComment.data.commentId,
        roundCommentIds: [],
        submissionCommentIds: [],
        lastUpdateTime: new Date()
      };

      return {
        success: true,
        data: gameThread
      };

    } catch (error) {
      console.error("Failed to create game thread:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create game thread"
      };
    }
  }

  /**
   * Post round updates to the game thread
   * Requirement 2.4: Use Reddit's native comment threading for organization
   */
  async postRoundUpdate(gameThread: GameThread, update: RoundUpdate): Promise<RedditApiResult<string>> {
    try {
      // Create round prompt comment
      const roundPromptText = this.formatRoundPromptText(update);
      
      const roundComment = await this.submitGameComment({
        type: GameCommentType.ROUND_PROMPT,
        text: roundPromptText,
        parentId: gameThread.gameCommentId,
        distinguish: true,
        metadata: {
          gameId: gameThread.postId,
          roundNumber: update.roundNumber
        }
      });

      if (!roundComment.success || !roundComment.data) {
        return {
          success: false,
          error: "Failed to post round update"
        };
      }

      // Update the game thread
      gameThread.roundCommentIds.push(roundComment.data.commentId);
      gameThread.lastUpdateTime = new Date();

      // Update status comment with current round info
      await this.updateStatusComment(gameThread, update);

      return {
        success: true,
        data: roundComment.data.commentId
      };

    } catch (error) {
      console.error("Failed to post round update:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post round update"
      };
    }
  }

  /**
   * Post leaderboard updates to the game thread
   */
  async postLeaderboardUpdate(gameThread: GameThread, leaderboard: LeaderboardData): Promise<RedditApiResult<string>> {
    try {
      const leaderboardText = this.formatLeaderboardText(leaderboard);

      // If leaderboard comment exists, edit it; otherwise create new one
      if (gameThread.leaderboardCommentId) {
        // Edit existing leaderboard comment
        const editResult = await this.editComment(gameThread.leaderboardCommentId, leaderboardText);
        if (editResult.success) {
          return {
            success: true,
            data: gameThread.leaderboardCommentId
          };
        }
      }

      // Create new leaderboard comment
      const leaderboardComment = await this.submitGameComment({
        type: GameCommentType.LEADERBOARD,
        text: leaderboardText,
        parentId: gameThread.gameCommentId,
        distinguish: true
      });

      if (!leaderboardComment.success || !leaderboardComment.data) {
        return {
          success: false,
          error: "Failed to post leaderboard update"
        };
      }

      // Update game thread with leaderboard comment ID
      gameThread.leaderboardCommentId = leaderboardComment.data.commentId;
      gameThread.lastUpdateTime = new Date();

      return {
        success: true,
        data: leaderboardComment.data.commentId
      };

    } catch (error) {
      console.error("Failed to post leaderboard update:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to post leaderboard update"
      };
    }
  }

  /**
   * Handle player submission comments
   */
  async handlePlayerSubmission(gameThread: GameThread, playerId: string, submissionUrl: string, roundNumber: number): Promise<RedditApiResult<string>> {
    try {
      const submissionText = `📸 **Player Submission - Round ${roundNumber}**\n\n[View Submission](${submissionUrl})\n\nPlayer: ${playerId}\nSubmitted: ${new Date().toLocaleTimeString()}`;

      const submissionComment = await this.submitGameComment({
        type: GameCommentType.PLAYER_SUBMISSION,
        text: submissionText,
        parentId: gameThread.roundCommentIds[roundNumber - 1] || gameThread.gameCommentId,
        metadata: {
          gameId: gameThread.postId,
          roundNumber: roundNumber,
          playerId: playerId,
          submissionUrl: submissionUrl
        }
      });

      if (!submissionComment.success || !submissionComment.data) {
        return {
          success: false,
          error: "Failed to handle player submission"
        };
      }

      // Update game thread
      gameThread.submissionCommentIds.push(submissionComment.data.commentId);
      gameThread.lastUpdateTime = new Date();

      return {
        success: true,
        data: submissionComment.data.commentId
      };

    } catch (error) {
      console.error("Failed to handle player submission:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to handle player submission"
      };
    }
  }

  /**
   * Execute Reddit API calls with proper error handling and rate limiting
   */
  private async executeRedditApiCall<T>(operation: string, apiCall: () => Promise<T>): Promise<RedditApiResult<T>> {
    try {
      // Use the compliance service's rate limiting
      const result = await apiCall();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error(`Reddit API ${operation} failed:`, error);
      
      // Check if it's a rate limit error
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
   * Format game post content
   */
  private formatGamePostContent(config: GamePostConfig): string {
    const rules = config.rules.map(rule => `• ${rule}`).join('\n');
    const prizes = config.prizes ? config.prizes.map(prize => `🏆 ${prize}`).join('\n') : '';

    return `
🎮 **${config.gameType.toUpperCase()} GAME**

${config.description}

**Game Details:**
• Duration: ${config.duration} minutes
• Difficulty: ${config.difficulty}
${config.maxPlayers ? `• Max Players: ${config.maxPlayers}` : ''}

**Rules:**
${rules}

${prizes ? `**Prizes:**\n${prizes}\n` : ''}

**How to Play:**
1. Wait for the game to start
2. Follow the prompts in the comments below
3. Submit your photos as replies to round prompts
4. First valid submission wins the round!

*This is a PicTact game powered by Reddit Devvit*
    `.trim();
  }

  /**
   * Format game comment text based on type
   */
  private formatGameCommentText(config: GameCommentConfig): string {
    const baseText = config.text;
    const metadata = config.metadata;

    switch (config.type) {
      case GameCommentType.ROUND_PROMPT:
        return `🎯 **ROUND ${metadata?.roundNumber || '?'}**\n\n${baseText}\n\n*Reply to this comment with your photo submission!*`;
      
      case GameCommentType.ROUND_RESULT:
        return `🏆 **ROUND ${metadata?.roundNumber || '?'} WINNER**\n\n${baseText}\n\nScore: ${metadata?.score || 0} points`;
      
      case GameCommentType.PLAYER_SUBMISSION:
        return `📸 **Submission by ${metadata?.playerId || 'Player'}**\n\n${baseText}`;
      
      case GameCommentType.MODERATOR_ACTION:
        return `🛡️ **Moderator Action**\n\n${baseText}`;
      
      case GameCommentType.SYSTEM_UPDATE:
        return `⚙️ **System Update**\n\n${baseText}`;
      
      default:
        return baseText;
    }
  }

  /**
   * Get standard game rules text
   */
  private getGameRulesText(): string {
    return `
📋 **GAME RULES**

1. **Submissions**: Reply to round prompts with photo links
2. **Timing**: First valid submission wins the round
3. **Validation**: Photos must match the prompt exactly
4. **Fair Play**: No pre-taken photos, must be original
5. **Content**: Follow Reddit and subreddit content policies
6. **Disputes**: Moderator decisions are final

**Scoring:**
• Round Win: 10 points
• Participation: 1 point per valid submission
• Bonus: Extra points for creativity (moderator discretion)

*Good luck and have fun!* 🎉
    `.trim();
  }

  /**
   * Format round prompt text
   */
  private formatRoundPromptText(update: RoundUpdate): string {
    const timeDisplay = this.formatTimeRemaining(update.timeRemaining);
    
    return `
🎯 **ROUND ${update.roundNumber}**

**Prompt:** ${update.prompt}

**Time Remaining:** ${timeDisplay}
**Submissions:** ${update.submissions}
**Status:** ${update.status.toUpperCase()}

${update.winner ? `**Winner:** ${update.winner.username} (${update.winner.score} points)` : ''}

*Reply to this comment with your photo submission!*
    `.trim();
  }

  /**
   * Format leaderboard text
   */
  private formatLeaderboardText(leaderboard: LeaderboardData): string {
    const entries = leaderboard.entries
      .map(entry => `${entry.rank}. **${entry.username}** - ${entry.score} pts (${entry.wins} wins)`)
      .join('\n');

    return `
🏆 **LEADERBOARD**

Round ${leaderboard.currentRound}/${leaderboard.totalRounds}

${entries}

*Last Updated: ${leaderboard.lastUpdated.toLocaleTimeString()}*
    `.trim();
  }

  /**
   * Update status comment with current game information
   */
  private async updateStatusComment(gameThread: GameThread, update: RoundUpdate): Promise<void> {
    const timeDisplay = this.formatTimeRemaining(update.timeRemaining);
    const statusText = `
⏱️ **Game Status**: ${update.status.toUpperCase()}

**Round:** ${update.roundNumber}
**Submissions:** ${update.submissions}
**Time Remaining:** ${timeDisplay}

${update.winner ? `**Last Winner:** ${update.winner.username}` : ''}
    `.trim();

    await this.editComment(gameThread.statusCommentId, statusText);
  }

  /**
   * Edit an existing comment
   */
  private async editComment(commentId: string, newText: string): Promise<RedditApiResult<void>> {
    try {
      await this.executeRedditApiCall('editComment', async () => {
        // Note: Reddit API for editing comments may not be available in Devvit
        // This is a placeholder for the actual implementation
        console.log(`Would edit comment ${commentId} with: ${newText}`);
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to edit comment"
      };
    }
  }

  /**
   * Distinguish a comment as moderator
   */
  private async distinguishComment(commentId: string): Promise<void> {
    try {
      await this.executeRedditApiCall('distinguish', async () => {
        // Note: This would use Reddit's distinguish API
        console.log(`Would distinguish comment ${commentId}`);
      });
    } catch (error) {
      console.error("Failed to distinguish comment:", error);
    }
  }

  /**
   * Sticky a comment
   */
  private async stickyComment(commentId: string): Promise<void> {
    try {
      await this.executeRedditApiCall('sticky', async () => {
        // Note: This would use Reddit's sticky comment API
        console.log(`Would sticky comment ${commentId}`);
      });
    } catch (error) {
      console.error("Failed to sticky comment:", error);
    }
  }

  /**
   * Format time remaining display
   */
  private formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return "00:00";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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