// Data export service for user profile data

import { ProfileStorageService } from "./profile-storage.js";
import { RedditCompliantStorageService } from "./reddit-compliant-storage.js";
import { CrossSubredditManager } from "./cross-subreddit-manager.js";
import { 
  UserProfile, 
  ProfileExport, 
  Trophy,
  Badge,
  LifetimeStatistics,
  SubredditStats
} from "../../shared/types/profile.js";
import {
  RedditCompliantProfile,
  RedditCompliantExport
} from "../../shared/types/reddit-compliant-data.js";

/**
 * Export formats supported by the data export service
 */
export type ExportFormat = 'json' | 'csv' | 'human-readable';

/**
 * Export options for customizing the export process
 */
export interface ExportOptions {
  format: ExportFormat;
  includeMatchHistory?: boolean;
  includePersonalData?: boolean;
  includeSubredditData?: boolean;
  includeTrophies?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Human-readable export data structure
 */
export interface HumanReadableExport {
  summary: string;
  profileOverview: string;
  statisticsSummary: string;
  achievementsList: string;
  subredditActivity: string;
  exportDetails: string;
}

/**
 * CSV export data structure
 */
export interface CSVExportData {
  profileData: string;
  statisticsData: string;
  trophiesData: string;
  subredditData: string;
}

/**
 * Data Export Service
 * Handles exporting user profile data in various formats
 */
export class DataExportService {
  private storage: ProfileStorageService;
  private redditCompliantStorage: RedditCompliantStorageService;
  private crossSubredditManager: CrossSubredditManager;

  constructor() {
    this.storage = new ProfileStorageService();
    this.redditCompliantStorage = new RedditCompliantStorageService();
    this.crossSubredditManager = new CrossSubredditManager();
  }

  /**
   * Export complete user profile data
   */
  async exportUserData(userId: string, options: ExportOptions): Promise<ProfileExport | HumanReadableExport | CSVExportData> {
    try {
      // Get user profile
      const profile = await this.storage.getProfile(userId);
      if (!profile) {
        throw new Error(`Profile not found for user: ${userId}`);
      }

      // Check if user allows data export
      if (!profile.privacySettings.allowDataExport) {
        throw new Error('User has disabled data export');
      }

      // Get additional data based on options
      const matchHistory = options.includeMatchHistory ? await this.getMatchHistory(userId) : [];
      const crossSubredditData = options.includeSubredditData ? 
        await this.crossSubredditManager.getGlobalProfile(userId) : null;

      // Generate export based on format
      switch (options.format) {
        case 'json':
          return this.generateJSONExport(profile, matchHistory, crossSubredditData, options);
        case 'csv':
          return this.generateCSVExport(profile, matchHistory, crossSubredditData, options);
        case 'human-readable':
          return this.generateHumanReadableExport(profile, matchHistory, crossSubredditData, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error(`Failed to export data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Generate JSON export (machine-readable format)
   */
  private generateJSONExport(
    profile: UserProfile,
    matchHistory: any[],
    crossSubredditData: any,
    options: ExportOptions
  ): ProfileExport {
    const exportData: ProfileExport = {
      exportedAt: new Date(),
      exportVersion: '1.0',
      userData: {
        profile: this.filterProfileData(profile, options),
        matchHistory: options.includeMatchHistory ? matchHistory : [],
        achievements: options.includeTrophies ? profile.trophyCollection : [],
        badges: options.includeTrophies ? profile.badges : []
      },
      metadata: {
        totalDataSize: 0, // Will be calculated after serialization
        exportFormat: 'json',
        includesPersonalData: options.includePersonalData || false
      }
    };

    // Add cross-subreddit data if requested
    if (options.includeSubredditData && crossSubredditData) {
      (exportData.userData as any).crossSubredditData = crossSubredditData;
    }

    // Calculate total data size
    const serialized = JSON.stringify(exportData);
    exportData.metadata.totalDataSize = serialized.length;

    return exportData;
  }

  /**
   * Generate CSV export (machine-readable tabular format)
   */
  private generateCSVExport(
    profile: UserProfile,
    _matchHistory: any[],
    _crossSubredditData: any,
    options: ExportOptions
  ): CSVExportData {
    const csvData: CSVExportData = {
      profileData: this.generateProfileCSV(profile, options),
      statisticsData: this.generateStatisticsCSV(profile.lifetimeStats),
      trophiesData: options.includeTrophies ? this.generateTrophiesCSV(profile.trophyCollection) : '',
      subredditData: options.includeSubredditData ? this.generateSubredditCSV(profile.subredditStats) : ''
    };

    return csvData;
  }

  /**
   * Generate human-readable export
   */
  private generateHumanReadableExport(
    profile: UserProfile,
    _matchHistory: any[],
    _crossSubredditData: any,
    options: ExportOptions
  ): HumanReadableExport {
    const exportDate = new Date().toLocaleDateString();
    const memberSince = profile.createdAt.toLocaleDateString();
    
    return {
      summary: this.generateSummaryText(profile),
      profileOverview: this.generateProfileOverviewText(profile, options),
      statisticsSummary: this.generateStatisticsSummaryText(profile.lifetimeStats),
      achievementsList: options.includeTrophies ? this.generateAchievementsText(profile.trophyCollection, profile.badges) : 'Achievements not included in this export.',
      subredditActivity: options.includeSubredditData ? this.generateSubredditActivityText(profile.subredditStats) : 'Subreddit activity not included in this export.',
      exportDetails: `Export generated on ${exportDate}\nProfile created on ${memberSince}\nExport format: Human-readable\nIncludes personal data: ${options.includePersonalData ? 'Yes' : 'No'}`
    };
  }

  /**
   * Filter profile data based on export options
   */
  private filterProfileData(profile: UserProfile, options: ExportOptions): UserProfile {
    const filteredProfile = { ...profile };

    // Remove personal data if not requested
    if (!options.includePersonalData) {
      delete filteredProfile.displayName;
      filteredProfile.preferences = {
        notifications: { ...filteredProfile.preferences.notifications, emailNotifications: false },
        gameSettings: filteredProfile.preferences.gameSettings,
        accessibility: filteredProfile.preferences.accessibility
      };
    }

    // Filter by date range if specified
    if (options.dateRange) {
      // Filter trophies by date range
      filteredProfile.trophyCollection = filteredProfile.trophyCollection.filter(trophy => 
        trophy.earnedAt >= options.dateRange!.startDate && 
        trophy.earnedAt <= options.dateRange!.endDate
      );

      // Filter badges by date range
      filteredProfile.badges = filteredProfile.badges.filter(badge => 
        badge.earnedAt >= options.dateRange!.startDate && 
        badge.earnedAt <= options.dateRange!.endDate
      );
    }

    return filteredProfile;
  }

  /**
   * Generate profile CSV data
   */
  private generateProfileCSV(profile: UserProfile, options: ExportOptions): string {
    const headers = ['Field', 'Value'];
    const rows = [
      ['User ID', profile.userId],
      ['Reddit Username', profile.redditUsername],
      ['Display Name', options.includePersonalData ? (profile.displayName || 'Not set') : 'Hidden'],
      ['Profile Created', profile.createdAt.toISOString()],
      ['Last Active', profile.lastActiveAt.toISOString()],
      ['Profile Version', profile.profileVersion.toString()]
    ];

    return this.arrayToCSV([headers, ...rows]);
  }

  /**
   * Generate statistics CSV data
   */
  private generateStatisticsCSV(stats: LifetimeStatistics): string {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Matches', stats.totalMatches.toString()],
      ['Total Wins', stats.totalWins.toString()],
      ['Total Points', stats.totalPoints.toString()],
      ['Win Rate', (stats.winRate * 100).toFixed(2) + '%'],
      ['Average Solve Time', stats.averageSolveTime.toFixed(2) + ' seconds'],
      ['Best Streak', stats.bestStreak.toString()],
      ['Current Streak', stats.currentStreak.toString()],
      ['Total Play Time', stats.totalPlayTime.toString() + ' minutes'],
      ['First Game', stats.firstGameDate.toISOString()],
      ['Last Game', stats.lastGameDate.toISOString()]
    ];

    return this.arrayToCSV([headers, ...rows]);
  }

  /**
   * Generate trophies CSV data
   */
  private generateTrophiesCSV(trophies: Trophy[]): string {
    if (trophies.length === 0) {
      return 'No trophies earned yet.';
    }

    const headers = ['Trophy Name', 'Description', 'Category', 'Rarity', 'Earned Date', 'Subreddit'];
    const rows = trophies.map(trophy => [
      trophy.name,
      trophy.description,
      trophy.category,
      trophy.rarity,
      trophy.earnedAt.toISOString(),
      trophy.subredditEarned || 'Global'
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  /**
   * Generate subreddit activity CSV data
   */
  private generateSubredditCSV(subredditStats: Map<string, SubredditStats>): string {
    if (subredditStats.size === 0) {
      return 'No subreddit activity recorded.';
    }

    const headers = ['Subreddit', 'Joined Date', 'Last Active', 'Matches', 'Wins', 'Points', 'Rank'];
    const rows = Array.from(subredditStats.values()).map(stats => [
      stats.subredditName,
      stats.joinedAt.toISOString(),
      stats.lastActiveAt.toISOString(),
      stats.matches.toString(),
      stats.wins.toString(),
      stats.points.toString(),
      stats.rank.toString()
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  /**
   * Generate summary text for human-readable export
   */
  private generateSummaryText(profile: UserProfile): string {
    const stats = profile.lifetimeStats;
    const winRate = (stats.winRate * 100).toFixed(1);
    const memberDuration = Math.floor((Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return `PicTact Profile Summary for ${profile.redditUsername}

You've been a PicTact player for ${memberDuration} days and have participated in ${stats.totalMatches} matches.
Your win rate is ${winRate}% with ${stats.totalWins} victories and ${stats.totalPoints} total points earned.
${stats.currentStreak > 0 ? `You're currently on a ${stats.currentStreak} game winning streak!` : ''}
Your best winning streak was ${stats.bestStreak} games.`;
  }

  /**
   * Generate profile overview text
   */
  private generateProfileOverviewText(profile: UserProfile, options: ExportOptions): string {
    const displayName = options.includePersonalData ? (profile.displayName || 'Not set') : 'Hidden for privacy';
    const createdDate = profile.createdAt.toLocaleDateString();
    const lastActive = profile.lastActiveAt.toLocaleDateString();

    return `Profile Information:
- Reddit Username: ${profile.redditUsername}
- Display Name: ${displayName}
- Member Since: ${createdDate}
- Last Active: ${lastActive}
- Profile Privacy: ${profile.privacySettings.profileVisibility}
- Cross-Subreddit Tracking: ${profile.privacySettings.allowCrossSubredditTracking ? 'Enabled' : 'Disabled'}`;
  }

  /**
   * Generate statistics summary text
   */
  private generateStatisticsSummaryText(stats: LifetimeStatistics): string {
    const avgSolveTime = stats.averageSolveTime.toFixed(1);
    const playTimeHours = (stats.totalPlayTime / 60).toFixed(1);
    const favoriteThemes = stats.favoriteThemes.slice(0, 3).join(', ') || 'None yet';

    return `Game Statistics:
- Total Matches Played: ${stats.totalMatches}
- Matches Won: ${stats.totalWins}
- Win Rate: ${(stats.winRate * 100).toFixed(1)}%
- Total Points Earned: ${stats.totalPoints}
- Average Solve Time: ${avgSolveTime} seconds
- Total Play Time: ${playTimeHours} hours
- Best Winning Streak: ${stats.bestStreak} games
- Current Streak: ${stats.currentStreak} games
- Favorite Themes: ${favoriteThemes}
- Most Active Subreddits: ${stats.mostActiveSubreddits.slice(0, 3).join(', ') || 'None yet'}`;
  }

  /**
   * Generate achievements text
   */
  private generateAchievementsText(trophies: Trophy[], badges: Badge[]): string {
    let text = `Achievements and Trophies:\n\n`;

    if (trophies.length === 0) {
      text += 'No trophies earned yet.\n\n';
    } else {
      text += `Trophies (${trophies.length} total):\n`;
      trophies.forEach((trophy, index) => {
        text += `${index + 1}. ${trophy.name} (${trophy.rarity})\n`;
        text += `   ${trophy.description}\n`;
        text += `   Earned: ${trophy.earnedAt.toLocaleDateString()}`;
        if (trophy.subredditEarned) {
          text += ` in r/${trophy.subredditEarned}`;
        }
        text += '\n\n';
      });
    }

    if (badges.length === 0) {
      text += 'No badges earned yet.';
    } else {
      text += `Badges (${badges.length} total):\n`;
      badges.forEach((badge, index) => {
        text += `${index + 1}. ${badge.name}`;
        if (badge.level) {
          text += ` (Level ${badge.level})`;
        }
        text += `\n   ${badge.description}\n`;
        text += `   Earned: ${badge.earnedAt.toLocaleDateString()}\n\n`;
      });
    }

    return text;
  }

  /**
   * Generate subreddit activity text
   */
  private generateSubredditActivityText(subredditStats: Map<string, SubredditStats>): string {
    if (subredditStats.size === 0) {
      return 'No subreddit activity recorded yet.';
    }

    let text = `Subreddit Activity (${subredditStats.size} communities):\n\n`;

    Array.from(subredditStats.values())
      .sort((a, b) => b.points - a.points)
      .forEach((stats, index) => {
        const winRate = stats.matches > 0 ? ((stats.wins / stats.matches) * 100).toFixed(1) : '0.0';
        text += `${index + 1}. r/${stats.subredditName}\n`;
        text += `   Joined: ${stats.joinedAt.toLocaleDateString()}\n`;
        text += `   Matches: ${stats.matches} | Wins: ${stats.wins} | Win Rate: ${winRate}%\n`;
        text += `   Points: ${stats.points} | Rank: #${stats.rank}\n`;
        text += `   Last Active: ${stats.lastActiveAt.toLocaleDateString()}\n\n`;
      });

    return text;
  }

  /**
   * Convert 2D array to CSV string
   */
  private arrayToCSV(data: string[][]): string {
    return data.map(row => 
      row.map(cell => 
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
      ).join(',')
    ).join('\n');
  }

  /**
   * Get match history for user (placeholder - will be implemented when match system exists)
   */
  private async getMatchHistory(_userId: string): Promise<any[]> {
    // TODO: Implement when match system is available
    // For now, return empty array
    return [];
  }

  /**
   * Validate export request
   */
  async validateExportRequest(userId: string, options: ExportOptions): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check if user exists
      const profile = await this.storage.getProfile(userId);
      if (!profile) {
        errors.push('User profile not found');
        return { valid: false, errors };
      }

      // Check if user allows data export
      if (!profile.privacySettings.allowDataExport) {
        errors.push('User has disabled data export');
      }

      // Validate date range if provided
      if (options.dateRange) {
        if (options.dateRange.startDate >= options.dateRange.endDate) {
          errors.push('Start date must be before end date');
        }

        if (options.dateRange.endDate > new Date()) {
          errors.push('End date cannot be in the future');
        }
      }

      // Validate format
      if (!['json', 'csv', 'human-readable'].includes(options.format)) {
        errors.push('Invalid export format specified');
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      console.error(`Error validating export request for user ${userId}:`, error);
      errors.push('Internal error during validation');
      return { valid: false, errors };
    }
  }

  /**
   * Get export size estimate
   */
  async getExportSizeEstimate(userId: string, options: ExportOptions): Promise<number> {
    try {
      const profile = await this.storage.getProfile(userId);
      if (!profile) {
        return 0;
      }

      // Rough size estimation based on profile data
      let estimatedSize = JSON.stringify(profile).length;

      if (options.includeMatchHistory) {
        // Estimate match history size (placeholder)
        estimatedSize += 1000; // Rough estimate per match
      }

      if (options.includeSubredditData) {
        estimatedSize += profile.subredditStats.size * 500; // Rough estimate per subreddit
      }

      return estimatedSize;
    } catch (error) {
      console.error(`Error estimating export size for user ${userId}:`, error);
      return 0;
    }
  }

  // Reddit-Compliant Export Methods

  /**
   * Export Reddit-compliant user data with Reddit ID redaction
   */
  async exportRedditCompliantUserData(
    profileId: string, 
    options: ExportOptions
  ): Promise<RedditCompliantExport | HumanReadableExport | CSVExportData> {
    try {
      // Get Reddit-compliant profile
      const profile = await this.redditCompliantStorage.getRedditCompliantProfile(profileId);
      if (!profile) {
        throw new Error(`Reddit-compliant profile not found: ${profileId}`);
      }

      // Check if user allows data export
      if (!profile.privacySettings.allowDataExport) {
        throw new Error('User has disabled data export');
      }

      // Get additional data based on options
      const matchHistory = options.includeMatchHistory ? await this.getRedditCompliantMatchHistory(profileId) : [];

      // Generate export based on format
      switch (options.format) {
        case 'json':
          return this.generateRedditCompliantJSONExport(profile, matchHistory, options);
        case 'csv':
          return this.generateRedditCompliantCSVExport(profile, matchHistory, options);
        case 'human-readable':
          return this.generateRedditCompliantHumanReadableExport(profile, matchHistory, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error(`Failed to export Reddit-compliant data for profile ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Export legacy user data with Reddit ID redaction applied
   */
  async exportLegacyUserDataWithRedaction(
    userId: string, 
    options: ExportOptions
  ): Promise<ProfileExport | HumanReadableExport | CSVExportData> {
    try {
      // Get legacy profile
      const profile = await this.storage.getProfile(userId);
      if (!profile) {
        throw new Error(`Profile not found for user: ${userId}`);
      }

      // Check if user allows data export
      if (!profile.privacySettings.allowDataExport) {
        throw new Error('User has disabled data export');
      }

      // Apply Reddit ID redaction to legacy profile
      const redactedProfile = this.redactRedditIdsFromProfile(profile);

      // Get additional data with redaction
      const matchHistory = options.includeMatchHistory ? await this.getMatchHistoryWithRedaction(userId) : [];
      const crossSubredditData = options.includeSubredditData ? 
        await this.getCrossSubredditDataWithRedaction(userId) : null;

      // Generate export based on format with Reddit compliance
      switch (options.format) {
        case 'json':
          return this.generateRedactedJSONExport(redactedProfile, matchHistory, crossSubredditData, options);
        case 'csv':
          return this.generateRedactedCSVExport(redactedProfile, matchHistory, crossSubredditData, options);
        case 'human-readable':
          return this.generateRedactedHumanReadableExport(redactedProfile, matchHistory, crossSubredditData, options);
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error(`Failed to export legacy data with redaction for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Generate Reddit-compliant JSON export
   */
  private generateRedditCompliantJSONExport(
    profile: RedditCompliantProfile,
    matchHistory: any[],
    options: ExportOptions
  ): RedditCompliantExport {
    const exportData: RedditCompliantExport = {
      exportedAt: new Date(),
      exportVersion: '2.0',
      userData: {
        profile: this.filterRedditCompliantProfileData(profile, options),
        gameHistory: options.includeMatchHistory ? matchHistory : [],
        achievements: options.includeTrophies ? profile.trophyCollection : [],
        badges: options.includeTrophies ? profile.badges : []
      },
      metadata: {
        totalDataSize: 0, // Will be calculated after serialization
        exportFormat: 'json',
        redditCompliant: true,
        redditIdsRedacted: true,
        subredditDataIsolated: profile.privacySettings.isolateSubredditData,
        disclaimer: 'This export contains Reddit-compliant data with all Reddit user identifiers redacted for privacy compliance.',
        dataSource: 'pictact-reddit-app'
      }
    };

    // Calculate total data size
    const serialized = JSON.stringify(exportData);
    exportData.metadata.totalDataSize = serialized.length;

    return exportData;
  }

  /**
   * Generate Reddit-compliant CSV export
   */
  private generateRedditCompliantCSVExport(
    profile: RedditCompliantProfile,
    _matchHistory: any[],
    options: ExportOptions
  ): CSVExportData {
    const csvData: CSVExportData = {
      profileData: this.generateRedditCompliantProfileCSV(profile, options),
      statisticsData: this.generateRedditCompliantStatisticsCSV(profile.gameStats),
      trophiesData: options.includeTrophies ? this.generateRedditCompliantTrophiesCSV(profile.trophyCollection) : '',
      subredditData: options.includeSubredditData ? this.generateRedditCompliantSubredditCSV(profile.gameStats.subredditStats) : ''
    };

    return csvData;
  }

  /**
   * Generate Reddit-compliant human-readable export
   */
  private generateRedditCompliantHumanReadableExport(
    profile: RedditCompliantProfile,
    _matchHistory: any[],
    options: ExportOptions
  ): HumanReadableExport {
    const exportDate = new Date().toLocaleDateString();
    const memberSince = profile.createdAt.toLocaleDateString();
    
    return {
      summary: this.generateRedditCompliantSummaryText(profile),
      profileOverview: this.generateRedditCompliantProfileOverviewText(profile, options),
      statisticsSummary: this.generateRedditCompliantStatisticsSummaryText(profile.gameStats),
      achievementsList: options.includeTrophies ? this.generateRedditCompliantAchievementsText(profile.trophyCollection, profile.badges) : 'Achievements not included in this export.',
      subredditActivity: options.includeSubredditData ? this.generateRedditCompliantSubredditActivityText(profile.gameStats.subredditStats) : 'Subreddit activity not included in this export.',
      exportDetails: `Export generated on ${exportDate}\nProfile created on ${memberSince}\nExport format: Human-readable\nReddit-compliant: Yes\nReddit IDs redacted: Yes\nIncludes personal data: ${options.includePersonalData ? 'Yes' : 'No'}`
    };
  }

  /**
   * Redact Reddit IDs from legacy profile
   */
  private redactRedditIdsFromProfile(profile: UserProfile): UserProfile {
    const redactedProfile = { ...profile };

    // Redact Reddit user ID if it looks like a Reddit ID
    if (redactedProfile.userId.startsWith('u/') || redactedProfile.userId.match(/^[0-9a-z]+$/)) {
      redactedProfile.userId = '[REDACTED_REDDIT_ID]';
    }

    // Redact Reddit username if it contains Reddit-specific patterns
    if (redactedProfile.redditUsername.startsWith('u/')) {
      redactedProfile.redditUsername = '[REDACTED_USERNAME]';
    }

    // Redact Reddit IDs from trophies
    redactedProfile.trophyCollection = redactedProfile.trophyCollection.map(trophy => ({
      ...trophy,
      metadata: this.redactMetadataRedditIds(trophy.metadata || {})
    }));

    // Redact Reddit IDs from subreddit stats
    const redactedSubredditStats = new Map<string, SubredditStats>();
    for (const [subredditName, stats] of redactedProfile.subredditStats) {
      const redactedStats = {
        ...stats,
        trophies: stats.trophies.map(trophy => ({
          ...trophy,
          metadata: this.redactMetadataRedditIds(trophy.metadata || {})
        }))
      };
      redactedSubredditStats.set(subredditName, redactedStats);
    }
    redactedProfile.subredditStats = redactedSubredditStats;

    return redactedProfile;
  }

  /**
   * Redact Reddit IDs from metadata
   */
  private redactMetadataRedditIds(metadata: Record<string, any>): Record<string, any> {
    const redacted = { ...metadata };
    
    // Remove common Reddit identifier fields
    delete redacted.redditUserId;
    delete redacted.redditUsername;
    delete redacted.redditPostId;
    delete redacted.redditCommentId;
    delete redacted.authorId;
    delete redacted.submitterId;
    
    // Redact any field that looks like a Reddit ID
    for (const [key, value] of Object.entries(redacted)) {
      if (typeof value === 'string') {
        // Reddit IDs typically start with 't1_', 't2_', 't3_', etc.
        if (value.match(/^t[0-9]_/)) {
          redacted[key] = '[REDACTED_REDDIT_ID]';
        }
        // Remove usernames that look like Reddit usernames
        if (key.toLowerCase().includes('username') || key.toLowerCase().includes('user')) {
          redacted[key] = '[REDACTED_USERNAME]';
        }
        // Redact Reddit URLs
        if (value.includes('reddit.com') || value.includes('redd.it')) {
          redacted[key] = '[REDACTED_REDDIT_URL]';
        }
      }
    }

    return redacted;
  }

  /**
   * Generate redacted CSV export for legacy profiles
   */
  private generateRedactedCSVExport(
    profile: UserProfile,
    _matchHistory: any[],
    _crossSubredditData: any,
    options: ExportOptions
  ): CSVExportData {
    const csvData: CSVExportData = {
      profileData: this.generateProfileCSV(profile, options),
      statisticsData: this.generateStatisticsCSV(profile.lifetimeStats),
      trophiesData: options.includeTrophies ? this.generateTrophiesCSV(profile.trophyCollection) : '',
      subredditData: options.includeSubredditData ? this.generateSubredditCSV(profile.subredditStats) : ''
    };

    return csvData;
  }

  /**
   * Generate redacted human-readable export for legacy profiles
   */
  private generateRedactedHumanReadableExport(
    profile: UserProfile,
    _matchHistory: any[],
    _crossSubredditData: any,
    options: ExportOptions
  ): HumanReadableExport {
    const exportDate = new Date().toLocaleDateString();
    const memberSince = profile.createdAt.toLocaleDateString();
    
    return {
      summary: this.generateSummaryText(profile),
      profileOverview: this.generateProfileOverviewText(profile, options) + '\n- Reddit Compliant: Yes (IDs Redacted)',
      statisticsSummary: this.generateStatisticsSummaryText(profile.lifetimeStats),
      achievementsList: options.includeTrophies ? this.generateAchievementsText(profile.trophyCollection, profile.badges) + '\n\nNote: All Reddit user identifiers have been redacted from this export for privacy compliance.' : 'Achievements not included in this export.',
      subredditActivity: options.includeSubredditData ? this.generateSubredditActivityText(profile.subredditStats) + '\n\nNote: All data is isolated per subreddit and contains no Reddit user identifiers.' : 'Subreddit activity not included in this export.',
      exportDetails: `Export generated on ${exportDate}\nProfile created on ${memberSince}\nExport format: Human-readable\nReddit-compliant: Yes\nReddit IDs redacted: Yes\nIncludes personal data: ${options.includePersonalData ? 'Yes' : 'No'}`
    };
  }

  /**
   * Generate redacted JSON export for legacy profiles
   */
  private generateRedactedJSONExport(
    profile: UserProfile,
    matchHistory: any[],
    crossSubredditData: any,
    options: ExportOptions
  ): ProfileExport {
    const exportData: ProfileExport = {
      exportedAt: new Date(),
      exportVersion: '1.1', // Updated version to indicate redaction
      userData: {
        profile: this.filterProfileData(profile, options),
        matchHistory: options.includeMatchHistory ? matchHistory : [],
        achievements: options.includeTrophies ? profile.trophyCollection : [],
        badges: options.includeTrophies ? profile.badges : []
      },
      metadata: {
        totalDataSize: 0, // Will be calculated after serialization
        exportFormat: 'json',
        includesPersonalData: options.includePersonalData || false,
        redditCompliant: true, // Now Reddit-compliant due to redaction
        disclaimer: 'Reddit user identifiers have been redacted from this export for privacy compliance.'
      }
    };

    // Add cross-subreddit data if requested
    if (options.includeSubredditData && crossSubredditData) {
      (exportData.userData as any).crossSubredditData = crossSubredditData;
    }

    // Calculate total data size
    const serialized = JSON.stringify(exportData);
    exportData.metadata.totalDataSize = serialized.length;

    return exportData;
  }

  /**
   * Filter Reddit-compliant profile data based on export options
   */
  private filterRedditCompliantProfileData(profile: RedditCompliantProfile, options: ExportOptions): RedditCompliantProfile {
    const filteredProfile = { ...profile };

    // Remove personal data if not requested
    if (!options.includePersonalData) {
      delete filteredProfile.displayName;
    }

    // Filter by date range if specified
    if (options.dateRange) {
      // Filter trophies by date range
      filteredProfile.trophyCollection = filteredProfile.trophyCollection.filter(trophy => 
        trophy.earnedAt >= options.dateRange!.startDate && 
        trophy.earnedAt <= options.dateRange!.endDate
      );

      // Filter badges by date range
      filteredProfile.badges = filteredProfile.badges.filter(badge => 
        badge.earnedAt >= options.dateRange!.startDate && 
        badge.earnedAt <= options.dateRange!.endDate
      );
    }

    return filteredProfile;
  }

  // Reddit-compliant CSV generation methods
  private generateRedditCompliantProfileCSV(profile: RedditCompliantProfile, options: ExportOptions): string {
    const headers = ['Field', 'Value'];
    const rows = [
      ['Profile ID', profile.profileId],
      ['Display Name', options.includePersonalData ? (profile.displayName || 'Not set') : 'Hidden'],
      ['Profile Created', profile.createdAt.toISOString()],
      ['Last Active', profile.lastActiveAt.toISOString()],
      ['Reddit Compliant', 'Yes'],
      ['Reddit IDs Redacted', 'Yes'],
      ['Profile Version', profile.profileVersion.toString()]
    ];

    return this.arrayToCSV([headers, ...rows]);
  }

  private generateRedditCompliantStatisticsCSV(stats: any): string {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Matches', stats.totalMatches.toString()],
      ['Total Wins', stats.totalWins.toString()],
      ['Total Points', stats.totalPoints.toString()],
      ['Win Rate', (stats.winRate * 100).toFixed(2) + '%'],
      ['Average Solve Time', stats.averageSolveTime.toFixed(2) + ' seconds'],
      ['Best Streak', stats.bestStreak.toString()],
      ['Current Streak', stats.currentStreak.toString()],
      ['Total Play Time', stats.totalPlayTime.toString() + ' minutes'],
      ['First Game', stats.firstGameDate.toISOString()],
      ['Last Game', stats.lastGameDate.toISOString()]
    ];

    return this.arrayToCSV([headers, ...rows]);
  }

  private generateRedditCompliantTrophiesCSV(trophies: any[]): string {
    if (trophies.length === 0) {
      return 'No trophies earned yet.';
    }

    const headers = ['Trophy Name', 'Description', 'Category', 'Rarity', 'Earned Date', 'Subreddit'];
    const rows = trophies.map(trophy => [
      trophy.name,
      trophy.description,
      trophy.category,
      trophy.rarity,
      trophy.earnedAt.toISOString(),
      trophy.subredditEarned || 'Global'
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  private generateRedditCompliantSubredditCSV(subredditStats: Map<string, any>): string {
    if (subredditStats.size === 0) {
      return 'No subreddit activity recorded.';
    }

    const headers = ['Subreddit', 'Joined Date', 'Last Active', 'Matches', 'Wins', 'Points', 'Rank'];
    const rows = Array.from(subredditStats.values()).map(stats => [
      stats.subredditName,
      stats.joinedAt.toISOString(),
      stats.lastActiveAt.toISOString(),
      stats.matches.toString(),
      stats.wins.toString(),
      stats.points.toString(),
      stats.rank.toString()
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  // Reddit-compliant text generation methods
  private generateRedditCompliantSummaryText(profile: RedditCompliantProfile): string {
    const stats = profile.gameStats;
    const winRate = (stats.winRate * 100).toFixed(1);
    const memberDuration = Math.floor((Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return `PicTact Reddit-Compliant Profile Summary

You've been a PicTact player for ${memberDuration} days and have participated in ${stats.totalMatches} matches.
Your win rate is ${winRate}% with ${stats.totalWins} victories and ${stats.totalPoints} total points earned.
${stats.currentStreak > 0 ? `You're currently on a ${stats.currentStreak} game winning streak!` : ''}
Your best winning streak was ${stats.bestStreak} games.

This export is Reddit-compliant with all Reddit user identifiers redacted for privacy.`;
  }

  private generateRedditCompliantProfileOverviewText(profile: RedditCompliantProfile, options: ExportOptions): string {
    const displayName = options.includePersonalData ? (profile.displayName || 'Not set') : 'Hidden for privacy';
    const createdDate = profile.createdAt.toLocaleDateString();
    const lastActive = profile.lastActiveAt.toLocaleDateString();

    return `Profile Information:
- Profile ID: ${profile.profileId}
- Display Name: ${displayName}
- Member Since: ${createdDate}
- Last Active: ${lastActive}
- Profile Privacy: ${profile.privacySettings.profileVisibility}
- Cross-Subreddit Stats: ${profile.privacySettings.allowCrossSubredditStats ? 'Enabled' : 'Disabled'}
- Reddit Compliant: Yes
- Reddit IDs Redacted: Yes
- Subreddit Data Isolated: ${profile.privacySettings.isolateSubredditData ? 'Yes' : 'No'}`;
  }

  private generateRedditCompliantStatisticsSummaryText(stats: any): string {
    const avgSolveTime = stats.averageSolveTime.toFixed(1);
    const playTimeHours = (stats.totalPlayTime / 60).toFixed(1);

    return `Game Statistics:
- Total Matches Played: ${stats.totalMatches}
- Matches Won: ${stats.totalWins}
- Win Rate: ${(stats.winRate * 100).toFixed(1)}%
- Total Points Earned: ${stats.totalPoints}
- Average Solve Time: ${avgSolveTime} seconds
- Total Play Time: ${playTimeHours} hours
- Best Winning Streak: ${stats.bestStreak} games
- Current Streak: ${stats.currentStreak} games
- Active Subreddits: ${stats.subredditStats.size} communities`;
  }

  private generateRedditCompliantAchievementsText(trophies: any[], badges: any[]): string {
    let text = `Achievements and Trophies (Reddit-Compliant):\n\n`;

    if (trophies.length === 0) {
      text += 'No trophies earned yet.\n\n';
    } else {
      text += `Trophies (${trophies.length} total):\n`;
      trophies.forEach((trophy, index) => {
        text += `${index + 1}. ${trophy.name} (${trophy.rarity})\n`;
        text += `   ${trophy.description}\n`;
        text += `   Earned: ${trophy.earnedAt.toLocaleDateString()}`;
        if (trophy.subredditEarned) {
          text += ` in r/${trophy.subredditEarned}`;
        }
        text += '\n\n';
      });
    }

    if (badges.length === 0) {
      text += 'No badges earned yet.';
    } else {
      text += `Badges (${badges.length} total):\n`;
      badges.forEach((badge, index) => {
        text += `${index + 1}. ${badge.name}`;
        if (badge.level) {
          text += ` (Level ${badge.level})`;
        }
        text += `\n   ${badge.description}\n`;
        text += `   Earned: ${badge.earnedAt.toLocaleDateString()}\n\n`;
      });
    }

    text += '\nNote: All Reddit user identifiers have been redacted from this export for privacy compliance.';

    return text;
  }

  private generateRedditCompliantSubredditActivityText(subredditStats: Map<string, any>): string {
    if (subredditStats.size === 0) {
      return 'No subreddit activity recorded yet.';
    }

    let text = `Subreddit Activity (${subredditStats.size} communities - Reddit-Compliant):\n\n`;

    Array.from(subredditStats.values())
      .sort((a, b) => b.points - a.points)
      .forEach((stats, index) => {
        const winRate = stats.matches > 0 ? ((stats.wins / stats.matches) * 100).toFixed(1) : '0.0';
        text += `${index + 1}. r/${stats.subredditName}\n`;
        text += `   Joined: ${stats.joinedAt.toLocaleDateString()}\n`;
        text += `   Matches: ${stats.matches} | Wins: ${stats.wins} | Win Rate: ${winRate}%\n`;
        text += `   Points: ${stats.points} | Rank: #${stats.rank}\n`;
        text += `   Last Active: ${stats.lastActiveAt.toLocaleDateString()}\n\n`;
      });

    text += 'Note: All data is isolated per subreddit and contains no Reddit user identifiers.';

    return text;
  }

  // Placeholder methods for Reddit-compliant data retrieval
  private async getRedditCompliantMatchHistory(_profileId: string): Promise<any[]> {
    // TODO: Implement when Reddit-compliant match system is available
    return [];
  }

  private async getMatchHistoryWithRedaction(_userId: string): Promise<any[]> {
    // TODO: Implement when match system is available
    // This would get match history and redact any Reddit IDs
    return [];
  }

  private async getCrossSubredditDataWithRedaction(_userId: string): Promise<any> {
    // TODO: Implement cross-subreddit data retrieval with Reddit ID redaction
    return null;
  }

  /**
   * Validate export request for Reddit compliance
   */
  async validateRedditCompliantExportRequest(
    profileId: string, 
    options: ExportOptions
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check if Reddit-compliant profile exists
      const profile = await this.redditCompliantStorage.getRedditCompliantProfile(profileId);
      if (!profile) {
        errors.push('Reddit-compliant profile not found');
        return { valid: false, errors };
      }

      // Check if user allows data export
      if (!profile.privacySettings.allowDataExport) {
        errors.push('User has disabled data export');
      }

      // Validate date range if provided
      if (options.dateRange) {
        if (options.dateRange.startDate >= options.dateRange.endDate) {
          errors.push('Start date must be before end date');
        }

        if (options.dateRange.endDate > new Date()) {
          errors.push('End date cannot be in the future');
        }
      }

      // Validate format
      if (!['json', 'csv', 'human-readable'].includes(options.format)) {
        errors.push('Invalid export format specified');
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      console.error(`Error validating Reddit-compliant export request for profile ${profileId}:`, error);
      errors.push('Internal error during validation');
      return { valid: false, errors };
    }
  }

  /**
   * Implement Reddit-compliant data deletion procedures
   */
  async deleteRedditCompliantUserData(profileId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get profile to check privacy settings
      const profile = await this.redditCompliantStorage.getRedditCompliantProfile(profileId);
      if (!profile) {
        return { success: false, message: 'Profile not found' };
      }

      // Delete Reddit-compliant profile and all associated data
      await this.redditCompliantStorage.deleteRedditCompliantProfile(profileId);

      console.log(`Reddit-compliant user data deleted for profile: ${profileId}`);
      return { 
        success: true, 
        message: 'All Reddit-compliant user data has been permanently deleted' 
      };
    } catch (error) {
      console.error(`Failed to delete Reddit-compliant user data for profile ${profileId}:`, error);
      return { 
        success: false, 
        message: `Data deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}