

import { RedditPostCommentService } from "./reddit-post-comment-service";
import {
  RedditApiResult,
  DevvitContext,
  GameThread,
  LeaderboardData,
  LeaderboardEntry,
  GameCommentType
} from "../../shared/types/reddit-compliance";

/**
 * Scoring Configuration
 */
export interface ScoringConfig {
  // Base scoring
  roundWinPoints: number;
  participationPoints: number;
  creativityBonusPoints: number;
  speedBonusPoints: number;
  
  // Multipliers
  difficultyMultipliers: {
    easy: number;
    medium: number;
    hard: number;
  };
  
  // Reddit-specific scoring
  upvoteBonus: number;
  commentEngagementBonus: number;
  moderatorBonusPoints: number;
  
  // Achievement scoring
  achievementPoints: {
    firstSubmission: number;
    perfectRound: number;
    comeback: number;
    consistency: number;
  };
}

/**
 * Player Score Data
 */
export interface PlayerScore {
  playerId: string;
  totalScore: number;
  roundScores: RoundScore[];
  achievements: Achievement[];
  statistics: PlayerStatistics;
  redditMetrics: RedditMetrics;
}

/**
 * Round Score Data
 */
export interface RoundScore {
  roundNumber: number;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  submissionTime: Date;
  isWinner: boolean;
  speedBonus: number;
  creativityBonus: number;
  upvoteBonus: number;
}

/**
 * Achievement Data
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  unlockedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  redditBadgeId?: string; // Integration with Reddit achievements
}

/**
 * Player Statistics
 */
export interface PlayerStatistics {
  totalSubmissions: number;
  totalWins: number;
  winRate: number;
  averageSubmissionTime: number;
  bestRoundScore: number;
  longestWinStreak: number;
  currentWinStreak: number;
  totalGamesPlayed: number;
}

/**
 * Reddit Metrics
 */
export interface RedditMetrics {
  totalUpvotes: number;
  totalComments: number;
  averageUpvotesPerSubmission: number;
  communityEngagementScore: number;
  moderatorEndorsements: number;
}

/**
 * Leaderboard Display Configuration
 */
export interface LeaderboardDisplayConfig {
  maxEntries: number;
  showAchievements: boolean;
  showStatistics: boolean;
  showRedditMetrics: boolean;
  updateFrequency: number; // seconds
  redditCommentFormat: 'table' | 'list' | 'compact';
}

/**
 * Trophy System Configuration
 */
export interface TrophyConfig {
  enableRedditTrophies: boolean;
  trophyCategories: {
    winner: string;
    participation: string;
    achievement: string;
    special: string;
  };
  customTrophies: Map<string, TrophyDefinition>;
}

/**
 * Trophy Definition
 */
export interface TrophyDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  redditAwardId?: string;
  criteria: TrophyCriteria;
}

/**
 * Trophy Criteria
 */
export interface TrophyCriteria {
  type: 'score' | 'wins' | 'participation' | 'achievement' | 'special';
  threshold?: number;
  condition?: string;
  timeframe?: 'game' | 'daily' | 'weekly' | 'monthly' | 'all-time';
}

/**
 * Reddit Scoring and Leaderboard System
 * Manages scoring, leaderboards, and trophy systems with Reddit comment formatting
 * and integration with Reddit achievements
 * Implements requirements 2.4, 6.2, 7.1
 */
export class RedditScoringSystem {

  private postCommentService: RedditPostCommentService;
  private scoringConfig: ScoringConfig;
  private leaderboardConfig: LeaderboardDisplayConfig;
  private trophyConfig: TrophyConfig;
  
  // In-memory storage for active game scores (in production, use Devvit KV store)
  private gameScores: Map<string, Map<string, PlayerScore>>;
  private gameLeaderboards: Map<string, LeaderboardData>;
  private playerAchievements: Map<string, Achievement[]>;

  constructor(
    scoringConfig?: Partial<ScoringConfig>,
    leaderboardConfig?: Partial<LeaderboardDisplayConfig>,
    trophyConfig?: Partial<TrophyConfig>
  ) {

    this.postCommentService = new RedditPostCommentService();
    
    // Default scoring configuration
    this.scoringConfig = {
      roundWinPoints: 10,
      participationPoints: 1,
      creativityBonusPoints: 5,
      speedBonusPoints: 3,
      difficultyMultipliers: {
        easy: 1.0,
        medium: 1.5,
        hard: 2.0
      },
      upvoteBonus: 0.5,
      commentEngagementBonus: 0.2,
      moderatorBonusPoints: 2,
      achievementPoints: {
        firstSubmission: 5,
        perfectRound: 15,
        comeback: 10,
        consistency: 8
      },
      ...scoringConfig
    };
    
    // Default leaderboard configuration
    this.leaderboardConfig = {
      maxEntries: 10,
      showAchievements: true,
      showStatistics: false,
      showRedditMetrics: false,
      updateFrequency: 30,
      redditCommentFormat: 'table',
      ...leaderboardConfig
    };
    
    // Default trophy configuration
    this.trophyConfig = {
      enableRedditTrophies: true,
      trophyCategories: {
        winner: '🏆',
        participation: '🎖️',
        achievement: '⭐',
        special: '💎'
      },
      customTrophies: new Map(),
      ...trophyConfig
    };
    
    this.gameScores = new Map();
    this.gameLeaderboards = new Map();
    this.playerAchievements = new Map();
  }

  /**
   * Calculate score for a player submission
   * Requirement 2.4: Use Reddit's native comment threading for organization
   */
  async calculateSubmissionScore(
    gameId: string,
    playerId: string,
    roundNumber: number,
    submissionData: {
      submissionTime: Date;
      isWinner: boolean;
      difficulty: 'easy' | 'medium' | 'hard';
      submissionUrl: string;
      commentId?: string;
    },
    _context: DevvitContext
  ): Promise<RedditApiResult<RoundScore>> {
    try {
      // Calculate base points
      let basePoints = this.scoringConfig.participationPoints;
      if (submissionData.isWinner) {
        basePoints += this.scoringConfig.roundWinPoints;
      }

      // Apply difficulty multiplier
      const difficultyMultiplier = this.scoringConfig.difficultyMultipliers[submissionData.difficulty];
      basePoints *= difficultyMultiplier;

      // Calculate speed bonus (faster submissions get more points)
      const speedBonus = await this.calculateSpeedBonus(gameId, roundNumber, submissionData.submissionTime);

      // Calculate Reddit-specific bonuses
      const redditBonuses = await this.calculateRedditBonuses(
        submissionData.commentId,
        submissionData.submissionUrl,
        _context
      );

      // Calculate creativity bonus (placeholder - would use AI/community voting)
      const creativityBonus = await this.calculateCreativityBonus(submissionData.submissionUrl);

      // Total bonus points
      const bonusPoints = speedBonus + redditBonuses.upvoteBonus + redditBonuses.engagementBonus + creativityBonus;

      // Create round score
      const roundScore: RoundScore = {
        roundNumber,
        basePoints,
        bonusPoints,
        totalPoints: basePoints + bonusPoints,
        submissionTime: submissionData.submissionTime,
        isWinner: submissionData.isWinner,
        speedBonus,
        creativityBonus,
        upvoteBonus: redditBonuses.upvoteBonus
      };

      // Update player score
      await this.updatePlayerScore(gameId, playerId, roundScore);

      // Check for achievements
      await this.checkAchievements(gameId, playerId, roundScore);

      return {
        success: true,
        data: roundScore
      };

    } catch (error) {
      console.error("Failed to calculate submission score:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to calculate score"
      };
    }
  }

  /**
   * Update leaderboard display using Reddit comment formatting
   * Requirement 6.2: Update Reddit comments with current standings
   */
  async updateLeaderboardDisplay(
    gameId: string,
    gameThread: GameThread,
    _context: DevvitContext
  ): Promise<RedditApiResult<string>> {
    try {
      // Get current leaderboard data
      const leaderboard = await this.generateLeaderboard(gameId);
      if (!leaderboard.success || !leaderboard.data) {
        return {
          success: false,
          error: "Failed to generate leaderboard data"
        };
      }

      // Format leaderboard for Reddit comment display (formatting handled by postLeaderboardUpdate)

      // Update leaderboard comment
      const updateResult = await this.postCommentService.postLeaderboardUpdate(gameThread, {
        gameId,
        entries: leaderboard.data.entries,
        lastUpdated: new Date(),
        totalRounds: leaderboard.data.totalRounds,
        currentRound: leaderboard.data.currentRound
      });

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || "Failed to update leaderboard comment"
        };
      }

      return {
        success: true,
        data: updateResult.data || ''
      };

    } catch (error) {
      console.error("Failed to update leaderboard display:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update leaderboard display"
      };
    }
  }

  /**
   * Award trophy and integrate with Reddit achievements
   * Requirement 7.1: Update trophy system to integrate with Reddit achievements
   */
  async awardTrophy(
    playerId: string,
    trophyId: string,
    gameId: string,
    _context: DevvitContext
  ): Promise<RedditApiResult<Achievement>> {
    try {
      // Get trophy definition
      const trophyDef = this.trophyConfig.customTrophies.get(trophyId);
      if (!trophyDef) {
        return {
          success: false,
          error: "Trophy definition not found"
        };
      }

      // Create achievement
      const achievement: Achievement = {
        id: `${trophyId}_${gameId}_${Date.now()}`,
        name: trophyDef.name,
        description: trophyDef.description,
        points: 5, // Default achievement points
        unlockedAt: new Date(),
        rarity: this.mapRarityToAchievement(trophyDef.rarity),
        ...(trophyDef.redditAwardId && { redditBadgeId: trophyDef.redditAwardId })
      };

      // Add to player achievements
      const playerAchievements = this.playerAchievements.get(playerId) || [];
      playerAchievements.push(achievement);
      this.playerAchievements.set(playerId, playerAchievements);

      // Award Reddit trophy if enabled and available
      if (this.trophyConfig.enableRedditTrophies && trophyDef.redditAwardId) {
        await this.awardRedditTrophy(playerId, trophyDef.redditAwardId, _context);
      }

      // Update player score with achievement points
      await this.addAchievementPoints(gameId, playerId, achievement.points);

      return {
        success: true,
        data: achievement
      };

    } catch (error) {
      console.error("Failed to award trophy:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to award trophy"
      };
    }
  }

  /**
   * Add Reddit-native result announcement system
   * Requirement 7.1: Add Reddit-native result announcement system
   */
  async announceGameResults(
    gameId: string,
    gameThread: GameThread,
    _context: DevvitContext
  ): Promise<RedditApiResult<string>> {
    try {
      // Get final leaderboard
      const leaderboard = await this.generateLeaderboard(gameId);
      if (!leaderboard.success || !leaderboard.data) {
        return {
          success: false,
          error: "Failed to generate final leaderboard"
        };
      }

      // Get game statistics
      const gameStats = this.calculateGameStatistics(gameId);

      // Format results announcement
      const resultsText = this.formatGameResults(leaderboard.data, gameStats);

      // Post results as a distinguished comment
      const resultsComment = await this.postCommentService.submitGameComment({
        type: GameCommentType.SYSTEM_UPDATE,
        text: resultsText,
        parentId: gameThread.gameCommentId,
        distinguish: true,
        sticky: true
      });

      if (!resultsComment.success) {
        return {
          success: false,
          error: resultsComment.error || "Failed to post results announcement"
        };
      }

      // Award trophies to winners
      await this.awardWinnerTrophies(gameId, leaderboard.data, _context);

      return {
        success: true,
        data: resultsComment.data?.commentId || ''
      };

    } catch (error) {
      console.error("Failed to announce game results:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to announce results"
      };
    }
  }

  /**
   * Generate leaderboard data
   */
  private async generateLeaderboard(gameId: string): Promise<RedditApiResult<LeaderboardData>> {
    try {
      const gameScores = this.gameScores.get(gameId);
      if (!gameScores) {
        return {
          success: false,
          error: "Game scores not found"
        };
      }

      // Convert player scores to leaderboard entries
      const entries: LeaderboardEntry[] = Array.from(gameScores.entries()).map(([playerId, playerScore]) => ({
        rank: 0, // Will be set after sorting
        playerId,
        username: playerId, // In real implementation, resolve from Reddit
        score: playerScore.totalScore,
        wins: playerScore.statistics.totalWins,
        submissions: playerScore.statistics.totalSubmissions,
        lastActive: new Date()
      }));

      // Sort by score (descending)
      entries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.submissions - b.submissions; // Fewer submissions is better for tie-breaking
      });

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      // Limit to max entries
      const limitedEntries = entries.slice(0, this.leaderboardConfig.maxEntries);

      const leaderboardData: LeaderboardData = {
        gameId,
        entries: limitedEntries,
        lastUpdated: new Date(),
        totalRounds: 0, // Would be set from game data
        currentRound: 0 // Would be set from game data
      };

      return {
        success: true,
        data: leaderboardData
      };

    } catch (error) {
      console.error("Failed to generate leaderboard:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate leaderboard"
      };
    }
  }

  /**
   * Format leaderboard for Reddit comment display
   */
  formatLeaderboardForReddit(leaderboard: LeaderboardData): string {
    const { redditCommentFormat } = this.leaderboardConfig;

    switch (redditCommentFormat) {
      case 'table':
        return this.formatLeaderboardAsTable(leaderboard);
      case 'list':
        return this.formatLeaderboardAsList(leaderboard);
      case 'compact':
        return this.formatLeaderboardCompact(leaderboard);
      default:
        return this.formatLeaderboardAsTable(leaderboard);
    }
  }

  /**
   * Format leaderboard as Reddit table
   */
  private formatLeaderboardAsTable(leaderboard: LeaderboardData): string {
    let table = '🏆 **LEADERBOARD**\n\n';
    table += '| Rank | Player | Score | Wins | Submissions |\n';
    table += '|------|--------|-------|------|-------------|\n';

    for (const entry of leaderboard.entries) {
      const achievements = this.getPlayerAchievementIcons(entry.playerId);
      table += `| ${entry.rank} | ${entry.username} ${achievements} | ${entry.score} | ${entry.wins} | ${entry.submissions} |\n`;
    }

    table += `\n*Last Updated: ${leaderboard.lastUpdated.toLocaleTimeString()}*`;
    return table;
  }

  /**
   * Format leaderboard as list
   */
  private formatLeaderboardAsList(leaderboard: LeaderboardData): string {
    let list = '🏆 **LEADERBOARD**\n\n';

    for (const entry of leaderboard.entries) {
      const achievements = this.getPlayerAchievementIcons(entry.playerId);
      const medal = this.getRankMedal(entry.rank);
      list += `${medal} **${entry.rank}. ${entry.username}** ${achievements}\n`;
      list += `   Score: ${entry.score} | Wins: ${entry.wins} | Submissions: ${entry.submissions}\n\n`;
    }

    list += `*Last Updated: ${leaderboard.lastUpdated.toLocaleTimeString()}*`;
    return list;
  }

  /**
   * Format leaderboard in compact format
   */
  private formatLeaderboardCompact(leaderboard: LeaderboardData): string {
    let compact = '🏆 **LEADERBOARD** ';

    const topThree = leaderboard.entries.slice(0, 3);
    const formatted = topThree.map(entry => {
      const medal = this.getRankMedal(entry.rank);
      return `${medal}${entry.username}(${entry.score})`;
    });

    compact += formatted.join(' | ');
    compact += ` | *Updated: ${leaderboard.lastUpdated.toLocaleTimeString()}*`;
    return compact;
  }

  /**
   * Calculate speed bonus based on submission timing
   */
  private async calculateSpeedBonus(_gameId: string, _roundNumber: number, _submissionTime: Date): Promise<number> {
    // This would calculate bonus based on how quickly the submission was made
    // For now, using a simple placeholder calculation
    const baseBonus = this.scoringConfig.speedBonusPoints;
    
    // Simulate speed calculation (in real implementation, would use round start time)
    const randomSpeedFactor = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
    return Math.floor(baseBonus * randomSpeedFactor);
  }

  /**
   * Calculate Reddit-specific bonuses
   */
  private async calculateRedditBonuses(
    commentId?: string,
    _submissionUrl?: string,
    _context?: DevvitContext
  ): Promise<{ upvoteBonus: number; engagementBonus: number }> {
    let upvoteBonus = 0;
    let engagementBonus = 0;

    if (commentId) {
      // In real implementation, would fetch actual Reddit comment data
      // For now, using placeholder calculations
      const simulatedUpvotes = Math.floor(Math.random() * 10);
      const simulatedComments = Math.floor(Math.random() * 5);

      upvoteBonus = simulatedUpvotes * this.scoringConfig.upvoteBonus;
      engagementBonus = simulatedComments * this.scoringConfig.commentEngagementBonus;
    }

    return { upvoteBonus, engagementBonus };
  }

  /**
   * Calculate creativity bonus
   */
  private async calculateCreativityBonus(_submissionUrl: string): Promise<number> {
    // Placeholder for creativity scoring
    // In real implementation, this could use AI analysis or community voting
    return Math.floor(Math.random() * this.scoringConfig.creativityBonusPoints);
  }

  /**
   * Update player score
   */
  private async updatePlayerScore(gameId: string, playerId: string, roundScore: RoundScore): Promise<void> {
    let gameScores = this.gameScores.get(gameId);
    if (!gameScores) {
      gameScores = new Map();
      this.gameScores.set(gameId, gameScores);
    }

    let playerScore = gameScores.get(playerId);
    if (!playerScore) {
      playerScore = {
        playerId,
        totalScore: 0,
        roundScores: [],
        achievements: [],
        statistics: {
          totalSubmissions: 0,
          totalWins: 0,
          winRate: 0,
          averageSubmissionTime: 0,
          bestRoundScore: 0,
          longestWinStreak: 0,
          currentWinStreak: 0,
          totalGamesPlayed: 1
        },
        redditMetrics: {
          totalUpvotes: 0,
          totalComments: 0,
          averageUpvotesPerSubmission: 0,
          communityEngagementScore: 0,
          moderatorEndorsements: 0
        }
      };
    }

    // Update scores and statistics
    playerScore.roundScores.push(roundScore);
    playerScore.totalScore += roundScore.totalPoints;
    playerScore.statistics.totalSubmissions++;
    
    if (roundScore.isWinner) {
      playerScore.statistics.totalWins++;
      playerScore.statistics.currentWinStreak++;
      playerScore.statistics.longestWinStreak = Math.max(
        playerScore.statistics.longestWinStreak,
        playerScore.statistics.currentWinStreak
      );
    } else {
      playerScore.statistics.currentWinStreak = 0;
    }

    playerScore.statistics.winRate = playerScore.statistics.totalWins / playerScore.statistics.totalSubmissions;
    playerScore.statistics.bestRoundScore = Math.max(playerScore.statistics.bestRoundScore, roundScore.totalPoints);

    // Update Reddit metrics
    playerScore.redditMetrics.totalUpvotes += roundScore.upvoteBonus / this.scoringConfig.upvoteBonus;

    gameScores.set(playerId, playerScore);
  }

  /**
   * Check for achievements
   */
  private async checkAchievements(gameId: string, playerId: string, roundScore: RoundScore): Promise<void> {
    const gameScores = this.gameScores.get(gameId);
    const playerScore = gameScores?.get(playerId);
    if (!playerScore) return;

    // Check for first submission achievement
    if (playerScore.statistics.totalSubmissions === 1) {
      await this.awardAchievement(playerId, 'first_submission', 'First Steps', 'Made your first submission!');
    }

    // Check for perfect round achievement
    if (roundScore.isWinner && roundScore.totalPoints >= 20) {
      await this.awardAchievement(playerId, 'perfect_round', 'Perfect Round', 'Won a round with maximum points!');
    }

    // Check for win streak achievements
    if (playerScore.statistics.currentWinStreak >= 3) {
      await this.awardAchievement(playerId, 'win_streak', 'On Fire!', 'Won 3 rounds in a row!');
    }
  }

  /**
   * Award achievement
   */
  private async awardAchievement(playerId: string, achievementId: string, name: string, description: string): Promise<void> {
    const achievement: Achievement = {
      id: `${achievementId}_${Date.now()}`,
      name,
      description,
      points: 5, // Default achievement points
      unlockedAt: new Date(),
      rarity: 'common'
    };

    const playerAchievements = this.playerAchievements.get(playerId) || [];
    
    // Check if achievement already exists
    const exists = playerAchievements.some(a => a.name === name);
    if (!exists) {
      playerAchievements.push(achievement);
      this.playerAchievements.set(playerId, playerAchievements);
    }
  }

  /**
   * Add achievement points to player score
   */
  private async addAchievementPoints(gameId: string, playerId: string, points: number): Promise<void> {
    const gameScores = this.gameScores.get(gameId);
    const playerScore = gameScores?.get(playerId);
    if (playerScore) {
      playerScore.totalScore += points;
    }
  }

  /**
   * Award Reddit trophy
   */
  private async awardRedditTrophy(playerId: string, redditAwardId: string, _context: DevvitContext): Promise<void> {
    try {
      // This would integrate with Reddit's trophy/award system
      // For now, just logging the action
      console.log(`Awarding Reddit trophy ${redditAwardId} to player ${playerId} in ${_context.subreddit}`);
    } catch (error) {
      console.error("Failed to award Reddit trophy:", error);
    }
  }

  /**
   * Calculate game statistics
   */
  private calculateGameStatistics(gameId: string): any {
    const gameScores = this.gameScores.get(gameId);
    if (!gameScores) return {};

    const players = Array.from(gameScores.values());
    const totalSubmissions = players.reduce((sum, p) => sum + p.statistics.totalSubmissions, 0);
    const totalScore = players.reduce((sum, p) => sum + p.totalScore, 0);

    return {
      totalPlayers: players.length,
      totalSubmissions,
      averageScore: totalScore / players.length,
      highestScore: Math.max(...players.map(p => p.totalScore)),
      totalAchievements: players.reduce((sum, p) => sum + p.achievements.length, 0)
    };
  }

  /**
   * Format game results
   */
  private formatGameResults(leaderboard: LeaderboardData, gameStats: any): string {
    let results = '🎉 **GAME COMPLETED!** 🎉\n\n';
    
    // Winner announcement
    if (leaderboard.entries.length > 0) {
      const winner = leaderboard.entries[0];
      if (winner) {
        results += `🏆 **WINNER: ${winner.username}** with ${winner.score} points!\n\n`;
      }
    }

    // Top 3 players
    results += '**🥇 TOP PLAYERS:**\n';
    const topThree = leaderboard.entries.slice(0, 3);
    topThree.forEach((entry, index) => {
      const medal = ['🥇', '🥈', '🥉'][index] || '🏅';
      results += `${medal} ${entry.username} - ${entry.score} points\n`;
    });

    // Game statistics
    results += '\n**📊 GAME STATISTICS:**\n';
    results += `• Total Players: ${gameStats.totalPlayers}\n`;
    results += `• Total Submissions: ${gameStats.totalSubmissions}\n`;
    results += `• Average Score: ${Math.round(gameStats.averageScore)}\n`;
    results += `• Highest Score: ${gameStats.highestScore}\n`;

    results += '\n*Thank you for playing PicTact! 🎮*';
    return results;
  }

  /**
   * Award winner trophies
   */
  private async awardWinnerTrophies(gameId: string, leaderboard: LeaderboardData, _context: DevvitContext): Promise<void> {
    if (leaderboard.entries.length === 0) return;

    // Award trophies to top 3 players
    const trophyTypes = ['gold', 'silver', 'bronze'];
    
    for (let i = 0; i < Math.min(3, leaderboard.entries.length); i++) {
      const player = leaderboard.entries[i];
      const trophyType = trophyTypes[i];
      
      if (!player || !trophyType) continue;
      
      // Create trophy definition if not exists
      if (!this.trophyConfig.customTrophies.has(trophyType)) {
        this.trophyConfig.customTrophies.set(trophyType, {
          id: trophyType,
          name: `${trophyType.charAt(0).toUpperCase() + trophyType.slice(1)} Medal`,
          description: `Awarded for ${i === 0 ? 'winning' : `placing ${i + 1}${i === 1 ? 'nd' : 'rd'} in`} the game`,
          icon: ['🥇', '🥈', '🥉'][i] || '🏅',
          rarity: i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze',
          criteria: {
            type: 'score',
            threshold: player.score
          }
        });
      }

      await this.awardTrophy(player.playerId, trophyType, gameId, _context);
    }
  }

  /**
   * Helper methods
   */
  private getPlayerAchievementIcons(playerId: string): string {
    const achievements = this.playerAchievements.get(playerId) || [];
    return achievements.slice(0, 3).map(() => this.trophyConfig.trophyCategories.achievement).join('');
  }

  private getRankMedal(rank: number): string {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  }

  private mapRarityToAchievement(rarity: TrophyDefinition['rarity']): Achievement['rarity'] {
    switch (rarity) {
      case 'bronze': return 'common';
      case 'silver': return 'rare';
      case 'gold': return 'epic';
      case 'platinum':
      case 'diamond': return 'legendary';
      default: return 'common';
    }
  }

  /**
   * Public API methods
   */

  /**
   * Get player score
   */
  getPlayerScore(gameId: string, playerId: string): PlayerScore | undefined {
    return this.gameScores.get(gameId)?.get(playerId);
  }

  /**
   * Get game leaderboard
   */
  async getGameLeaderboard(gameId: string): Promise<RedditApiResult<LeaderboardData>> {
    return this.generateLeaderboard(gameId);
  }

  /**
   * Get player achievements
   */
  getPlayerAchievements(playerId: string): Achievement[] {
    return this.playerAchievements.get(playerId) || [];
  }

  /**
   * Update scoring configuration
   */
  updateScoringConfig(config: Partial<ScoringConfig>): void {
    this.scoringConfig = { ...this.scoringConfig, ...config };
  }

  /**
   * Update leaderboard configuration
   */
  updateLeaderboardConfig(config: Partial<LeaderboardDisplayConfig>): void {
    this.leaderboardConfig = { ...this.leaderboardConfig, ...config };
  }

  /**
   * Clear game data
   */
  clearGameData(gameId: string): void {
    this.gameScores.delete(gameId);
    this.gameLeaderboards.delete(gameId);
  }
}