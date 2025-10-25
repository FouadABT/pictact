// Cross-subreddit identity management
// Handles unified user identity across different subreddit instances

import { 
  GlobalProfile, 
  SubredditStats, 
  UserProfile,
  Trophy
} from "../../shared/types/profile.js";
import { ProfileStorageService } from "./profile-storage.js";

/**
 * Cross-Subreddit Identity Manager
 * Manages unified user identity across different subreddit communities
 */
export class CrossSubredditManager {
  private storage: ProfileStorageService;

  constructor() {
    this.storage = new ProfileStorageService();
  }

  /**
   * Get global profile with aggregated statistics across all subreddits
   */
  async getGlobalProfile(userId: string): Promise<GlobalProfile | null> {
    try {
      const globalProfile = await this.storage.getGlobalProfile(userId);
      
      if (!globalProfile) {
        // Create global profile if it doesn't exist but user profile does
        const userProfile = await this.storage.getProfile(userId);
        if (userProfile) {
          return await this.createGlobalProfile(userId, userProfile);
        }
        return null;
      }

      // Ensure global profile is up to date
      await this.syncGlobalProfile(userId);
      
      return await this.storage.getGlobalProfile(userId);
    } catch (error) {
      console.error(`Failed to get global profile for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get subreddit-specific profile data
   */
  async getSubredditProfile(userId: string, subredditName: string): Promise<SubredditStats | null> {
    try {
      return await this.storage.getSubredditProfile(userId, subredditName);
    } catch (error) {
      console.error(`Failed to get subreddit profile for user ${userId} in ${subredditName}:`, error);
      return null;
    }
  }

  /**
   * Create or update subreddit-specific profile
   */
  async createOrUpdateSubredditProfile(
    userId: string, 
    subredditName: string, 
    stats: Partial<SubredditStats>
  ): Promise<SubredditStats> {
    try {
      const existingStats = await this.storage.getSubredditProfile(userId, subredditName);
      
      const subredditProfile: SubredditStats = existingStats ? {
        ...existingStats,
        ...stats,
        lastActiveAt: new Date()
      } : {
        subredditName,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        matches: 0,
        wins: 0,
        points: 0,
        rank: 0,
        trophies: [],
        specialBadges: [],
        ...stats
      };

      await this.storage.updateSubredditProfile(userId, subredditName, subredditProfile);
      
      // Update global profile with new data
      await this.syncGlobalProfile(userId);
      
      console.log(`Subreddit profile updated for user ${userId} in ${subredditName}`);
      return subredditProfile;
    } catch (error) {
      console.error(`Failed to create/update subreddit profile for user ${userId} in ${subredditName}:`, error);
      throw error;
    }
  }

  /**
   * Aggregate statistics from all subreddits for a user
   */
  async aggregateStats(userId: string): Promise<AggregatedStats> {
    try {
      const userProfile = await this.storage.getProfile(userId);
      if (!userProfile) {
        throw new Error(`User profile not found for user: ${userId}`);
      }

      let totalMatches = 0;
      let totalWins = 0;
      let totalPoints = 0;
      let totalPlayTime = 0;
      const allTrophies: Trophy[] = [];
      const subredditParticipation: SubredditStats[] = [];
      const allThemes = new Set<string>();
      const allSubreddits = new Set<string>();

      // Aggregate from subreddit-specific data
      for (const [subredditName, stats] of userProfile.subredditStats) {
        totalMatches += stats.matches;
        totalWins += stats.wins;
        totalPoints += stats.points;
        
        // Add subreddit trophies
        allTrophies.push(...stats.trophies);
        subredditParticipation.push(stats);
        allSubreddits.add(subredditName);
      }

      // Include lifetime stats if no subreddit data exists
      if (totalMatches === 0) {
        totalMatches = userProfile.lifetimeStats.totalMatches;
        totalWins = userProfile.lifetimeStats.totalWins;
        totalPoints = userProfile.lifetimeStats.totalPoints;
        totalPlayTime = userProfile.lifetimeStats.totalPlayTime;
        
        // Add themes from lifetime stats
        userProfile.lifetimeStats.favoriteThemes.forEach(theme => allThemes.add(theme));
        userProfile.lifetimeStats.mostActiveSubreddits.forEach(sub => allSubreddits.add(sub));
      }

      // Add profile trophies
      allTrophies.push(...userProfile.trophyCollection);

      // Calculate derived statistics
      const winRate = totalMatches > 0 ? totalWins / totalMatches : 0;
      const averagePointsPerMatch = totalMatches > 0 ? totalPoints / totalMatches : 0;

      const aggregated: AggregatedStats = {
        userId,
        totalMatches,
        totalWins,
        totalPoints,
        totalPlayTime,
        winRate,
        averagePointsPerMatch,
        uniqueSubreddits: allSubreddits.size,
        uniqueThemes: allThemes.size,
        totalTrophies: allTrophies.length,
        subredditBreakdown: subredditParticipation,
        favoriteThemes: Array.from(allThemes),
        mostActiveSubreddits: Array.from(allSubreddits),
        lastUpdated: new Date()
      };

      return aggregated;
    } catch (error) {
      console.error(`Failed to aggregate stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Synchronize profiles across subreddits
   */
  async syncProfiles(userId: string): Promise<void> {
    try {
      const userProfile = await this.storage.getProfile(userId);
      if (!userProfile) {
        console.warn(`Cannot sync profiles - user profile not found for user: ${userId}`);
        return;
      }

      // Update global profile with latest aggregated data
      await this.syncGlobalProfile(userId);

      // Ensure consistency across all subreddit profiles
      for (const [subredditName, stats] of userProfile.subredditStats) {
        const currentSubredditProfile = await this.storage.getSubredditProfile(userId, subredditName);
        
        if (!currentSubredditProfile) {
          // Create missing subreddit profile
          await this.storage.updateSubredditProfile(userId, subredditName, stats);
        } else {
          // Update last sync time
          const updatedStats: SubredditStats = {
            ...currentSubredditProfile,
            lastActiveAt: new Date()
          };
          await this.storage.updateSubredditProfile(userId, subredditName, updatedStats);
        }
      }

      console.log(`Profile synchronization completed for user: ${userId}`);
    } catch (error) {
      console.error(`Failed to sync profiles for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's ranking within a specific subreddit
   */
  async getSubredditRanking(userId: string, subredditName: string): Promise<SubredditRanking | null> {
    try {
      const userStats = await this.storage.getSubredditProfile(userId, subredditName);
      if (!userStats) {
        return null;
      }

      // In a real implementation, this would query all users in the subreddit
      // For now, we'll return a placeholder ranking
      const ranking: SubredditRanking = {
        userId,
        subredditName,
        rank: userStats.rank || 0,
        totalUsers: 1, // Placeholder
        percentile: 100, // Placeholder
        pointsToNextRank: 0,
        lastUpdated: new Date()
      };

      return ranking;
    } catch (error) {
      console.error(`Failed to get subreddit ranking for user ${userId} in ${subredditName}:`, error);
      return null;
    }
  }

  /**
   * Get user's global ranking across all subreddits
   */
  async getGlobalRanking(userId: string): Promise<GlobalRanking | null> {
    try {
      const globalProfile = await this.getGlobalProfile(userId);
      if (!globalProfile) {
        return null;
      }

      // In a real implementation, this would query all users globally
      // For now, we'll return a placeholder ranking
      const ranking: GlobalRanking = {
        userId,
        globalRank: globalProfile.globalRanking,
        totalUsers: 1, // Placeholder
        percentile: 100, // Placeholder
        totalPoints: globalProfile.totalMatches * 10, // Estimated
        subredditCount: globalProfile.subredditParticipation.length,
        lastUpdated: new Date()
      };

      return ranking;
    } catch (error) {
      console.error(`Failed to get global ranking for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Handle user activity in a specific subreddit
   */
  async recordSubredditActivity(
    userId: string, 
    subredditName: string, 
    activity: SubredditActivity
  ): Promise<void> {
    try {
      const existingStats = await this.storage.getSubredditProfile(userId, subredditName);
      
      const updatedStats: Partial<SubredditStats> = {
        matches: (existingStats?.matches || 0) + (activity.matchesPlayed || 0),
        wins: (existingStats?.wins || 0) + (activity.wins || 0),
        points: (existingStats?.points || 0) + (activity.points || 0),
        lastActiveAt: new Date()
      };

      // Update rank if provided
      if (activity.newRank !== undefined) {
        updatedStats.rank = activity.newRank;
      }

      await this.createOrUpdateSubredditProfile(userId, subredditName, updatedStats);
      
      console.log(`Activity recorded for user ${userId} in ${subredditName}:`, activity);
    } catch (error) {
      console.error(`Failed to record activity for user ${userId} in ${subredditName}:`, error);
      throw error;
    }
  }

  /**
   * Get cross-subreddit leaderboard
   */
  async getCrossSubredditLeaderboard(limit: number = 10): Promise<CrossSubredditLeaderboardEntry[]> {
    try {
      const allUserIds = await this.storage.getAllUserIds();
      const leaderboardEntries: CrossSubredditLeaderboardEntry[] = [];

      for (const userId of allUserIds) {
        const globalProfile = await this.getGlobalProfile(userId);
        const userProfile = await this.storage.getProfile(userId);
        
        if (globalProfile && userProfile) {
          const entry: CrossSubredditLeaderboardEntry = {
            userId,
            displayName: userProfile.displayName || userProfile.redditUsername,
            totalPoints: globalProfile.totalMatches * 10, // Estimated
            totalMatches: globalProfile.totalMatches,
            totalWins: globalProfile.totalWins,
            winRate: globalProfile.totalMatches > 0 ? globalProfile.totalWins / globalProfile.totalMatches : 0,
            subredditCount: globalProfile.subredditParticipation.length,
            globalRank: globalProfile.globalRanking,
            lastActive: userProfile.lastActiveAt
          };
          
          leaderboardEntries.push(entry);
        }
      }

      // Sort by total points and assign ranks
      leaderboardEntries.sort((a, b) => b.totalPoints - a.totalPoints);
      leaderboardEntries.forEach((entry, index) => {
        entry.globalRank = index + 1;
      });

      return leaderboardEntries.slice(0, limit);
    } catch (error) {
      console.error('Failed to get cross-subreddit leaderboard:', error);
      return [];
    }
  }

  // Private helper methods

  /**
   * Create a new global profile from user profile data
   */
  private async createGlobalProfile(userId: string, _userProfile: UserProfile): Promise<GlobalProfile> {
    try {
      const aggregatedStats = await this.aggregateStats(userId);
      
      const globalProfile: GlobalProfile = {
        userId,
        totalMatches: aggregatedStats.totalMatches,
        totalWins: aggregatedStats.totalWins,
        globalRanking: 0, // Will be calculated separately
        subredditParticipation: aggregatedStats.subredditBreakdown,
        lastSyncAt: new Date()
      };

      await this.storage.updateGlobalProfile(userId, globalProfile);
      console.log(`Global profile created for user: ${userId}`);
      
      return globalProfile;
    } catch (error) {
      console.error(`Failed to create global profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Synchronize global profile with latest aggregated data
   */
  private async syncGlobalProfile(userId: string): Promise<void> {
    try {
      const aggregatedStats = await this.aggregateStats(userId);
      
      const globalUpdate: Partial<GlobalProfile> = {
        totalMatches: aggregatedStats.totalMatches,
        totalWins: aggregatedStats.totalWins,
        subredditParticipation: aggregatedStats.subredditBreakdown,
        lastSyncAt: new Date()
      };

      await this.storage.updateGlobalProfile(userId, globalUpdate);
    } catch (error) {
      console.error(`Failed to sync global profile for user ${userId}:`, error);
      // Don't throw - this is not critical
    }
  }
}

// Supporting interfaces for cross-subreddit functionality

export interface AggregatedStats {
  userId: string;
  totalMatches: number;
  totalWins: number;
  totalPoints: number;
  totalPlayTime: number;
  winRate: number;
  averagePointsPerMatch: number;
  uniqueSubreddits: number;
  uniqueThemes: number;
  totalTrophies: number;
  subredditBreakdown: SubredditStats[];
  favoriteThemes: string[];
  mostActiveSubreddits: string[];
  lastUpdated: Date;
}

export interface SubredditRanking {
  userId: string;
  subredditName: string;
  rank: number;
  totalUsers: number;
  percentile: number;
  pointsToNextRank: number;
  lastUpdated: Date;
}

export interface GlobalRanking {
  userId: string;
  globalRank: number;
  totalUsers: number;
  percentile: number;
  totalPoints: number;
  subredditCount: number;
  lastUpdated: Date;
}

export interface SubredditActivity {
  matchesPlayed?: number;
  wins?: number;
  points?: number;
  newRank?: number;
  trophiesEarned?: Trophy[];
}

export interface CrossSubredditLeaderboardEntry {
  userId: string;
  displayName: string;
  totalPoints: number;
  totalMatches: number;
  totalWins: number;
  winRate: number;
  subredditCount: number;
  globalRank: number;
  lastActive: Date;
}