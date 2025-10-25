/**
 * Reddit-Compliant Data Models
 * Data structures that comply with Reddit's privacy and platform requirements
 */

/**
 * Reddit-Compliant User Profile
 * Profile data that never stores Reddit user IDs or personal information
 */
export interface RedditCompliantProfile {
  // App-Specific Identity (stored)
  profileId: string; // App-generated UUID, never Reddit user ID
  displayName?: string; // Optional custom display name
  createdAt: Date;
  lastActiveAt: Date;
  lastProfileUpdate: Date;

  // Reddit Context (never stored, only used in current session)
  // currentRedditUsername?: string; // Only available during active session

  // Game Statistics (stored)
  gameStats: RedditCompliantGameStats;

  // Privacy Settings (stored)
  privacySettings: RedditCompliantPrivacySettings;

  // Preferences (stored)
  preferences: RedditCompliantPreferences;

  // Achievements (stored)
  trophyCollection: RedditCompliantTrophy[];
  badges: RedditCompliantBadge[];

  // Version for data migration
  profileVersion: number;
}

/**
 * Reddit-Compliant Game Statistics
 * Game statistics that respect subreddit boundaries
 */
export interface RedditCompliantGameStats {
  // Global statistics (cross-subreddit totals)
  totalMatches: number;
  totalWins: number;
  totalPoints: number;
  averageSolveTime: number;
  winRate: number;
  bestStreak: number;
  currentStreak: number;
  totalPlayTime: number; // in minutes

  // Subreddit-specific statistics (isolated per subreddit)
  subredditStats: Map<string, SubredditGameStats>;

  // Timestamps
  firstGameDate: Date;
  lastGameDate: Date;
}

/**
 * Subreddit-Specific Game Statistics
 * Statistics isolated to a specific subreddit context
 */
export interface SubredditGameStats {
  subredditName: string;
  joinedAt: Date;
  lastActiveAt: Date;

  // Game statistics for this subreddit only
  matches: number;
  wins: number;
  points: number;
  rank: number;
  winRate: number;
  averageSolveTime: number;
  bestStreak: number;
  currentStreak: number;

  // Subreddit-specific achievements
  trophies: RedditCompliantTrophy[];
  specialBadges: RedditCompliantBadge[];

  // Subreddit-specific preferences
  preferences?: SubredditPreferences;
}

/**
 * Reddit-Compliant Privacy Settings
 * Privacy controls that respect Reddit's data policies
 */
export interface RedditCompliantPrivacySettings {
  // Profile visibility within each subreddit
  profileVisibility: 'public' | 'subreddit' | 'private';

  // Cross-subreddit data sharing
  allowCrossSubredditStats: boolean;
  allowDataExport: boolean;

  // Data control
  allowAnonymousMode: boolean;
  autoDeleteInactiveData: boolean;
  dataRetentionDays?: number; // Optional data retention period

  // Reddit-specific privacy
  redactRedditIdentifiers: boolean; // Always true for compliance
  isolateSubredditData: boolean; // Always true for compliance
}

/**
 * Reddit-Compliant User Preferences
 * User preferences that don't store Reddit personal data
 */
export interface RedditCompliantPreferences {
  // Game settings
  gameSettings: RedditCompliantGamePreferences;

  // Accessibility options
  accessibility: AccessibilityOptions;

  // Notification preferences (no email/personal contact info)
  notifications: RedditCompliantNotificationSettings;
}

/**
 * Reddit-Compliant Game Preferences
 */
export interface RedditCompliantGamePreferences {
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  autoJoinEvents: boolean;
  showHints: boolean;
  preferredThemes: string[];
  maxConcurrentGames: number;
  
  // Reddit-specific preferences
  useRedditTheme: boolean;
  integrateWithRedditNotifications: boolean;
}

/**
 * Reddit-Compliant Notification Settings
 * Notification preferences that use Reddit's notification system
 */
export interface RedditCompliantNotificationSettings {
  // Reddit-native notifications only
  redditNotifications: boolean;
  gameStartReminders: boolean;
  achievementAlerts: boolean;
  weeklyDigest: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';

  // No email or external notifications to comply with Reddit policies
}

/**
 * Accessibility Options (unchanged from original)
 */
export interface AccessibilityOptions {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderOptimized: boolean;
  colorBlindFriendly: boolean;
}

/**
 * Subreddit-Specific Preferences
 */
export interface SubredditPreferences {
  subredditName: string;
  customTheme?: string;
  notificationLevel: 'all' | 'important' | 'none';
  autoJoinGames: boolean;
  preferredDifficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Reddit-Compliant Trophy
 * Achievement data that doesn't store Reddit user identifiers
 */
export interface RedditCompliantTrophy {
  id: string;
  name: string;
  description: string;
  category: TrophyCategory;
  rarity: TrophyRarity;
  earnedAt: Date;
  subredditEarned?: string; // Subreddit name only, no Reddit IDs
  metadata?: Record<string, any>; // No Reddit user data
}

/**
 * Reddit-Compliant Badge
 * Badge data that doesn't store Reddit user identifiers
 */
export interface RedditCompliantBadge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  earnedAt: Date;
  level?: number;
  subredditEarned?: string; // Subreddit name only
}

/**
 * Trophy Categories and Rarity (unchanged)
 */
export type TrophyCategory = 
  | 'achievement' 
  | 'milestone' 
  | 'seasonal' 
  | 'special' 
  | 'community';

export type TrophyRarity = 
  | 'common' 
  | 'uncommon' 
  | 'rare' 
  | 'epic' 
  | 'legendary';

/**
 * Reddit-Compliant Game Data Schema
 * Game data structures that comply with Reddit platform requirements
 */
export interface RedditGameData {
  // Reddit Context (never stored permanently)
  postId: string; // Current Reddit post ID
  subreddit: string; // Current subreddit name

  // Game-Specific Data (stored in KV with subreddit isolation)
  gameId: string; // App-generated game ID
  status: GameStatus;
  configuration: RedditGameConfiguration;
  rounds: RedditRoundData[];

  // Reddit Integration Points (stored as references only)
  gamePostId: string; // Reddit post ID for this game
  gameCommentId: string; // Main game comment ID
  resultCommentIds: string[]; // Result comment IDs

  // Game State
  currentRound: number;
  totalRounds: number;
  players: string[]; // Player IDs (app-specific, not Reddit IDs)
  
  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  lastUpdatedAt: Date;
  startTime: Date;
  endTime?: Date;

  // Leaderboard
  leaderboard: {
    entries: LeaderboardEntry[];
    lastUpdated: Date;
  };

  // Subreddit isolation
  subredditContext: string; // Ensures data isolation per subreddit
}

/**
 * Game Status Enumeration
 */
export enum GameStatus {
  CREATED = 'created',
  INITIALIZING = 'initializing',
  WAITING_FOR_PLAYERS = 'waiting_for_players',
  ACTIVE = 'active',
  IN_PROGRESS = 'in_progress',
  ROUND_IN_PROGRESS = 'round_in_progress',
  ROUND_ENDED = 'round_ended',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * Reddit-Compliant Game Configuration
 */
export interface RedditGameConfiguration {
  title: string;
  description: string;
  gameType: 'pictact' | 'photo-hunt' | 'creative-challenge';
  duration: number; // Duration in minutes
  maxPlayers?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  rules: string[];
  rounds: {
    prompt: string;
    duration: number;
    maxSubmissions?: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
  prizes?: string[];
  
  // Reddit-specific configuration
  nsfw?: boolean;
  spoiler?: boolean;
  flairId?: string;
  flairText?: string;
  
  // Subreddit-specific settings
  subreddit: string;
  createdBy: string;
  createdAt: Date;
  isNSFW: boolean;
  allowLateSubmissions: boolean;
  autoAdvanceRounds: boolean;
  subredditRules?: string[];
  moderatorOverride?: boolean;
}

/**
 * Reddit-Compliant Round Data
 */
export interface RedditRoundData {
  roundIndex: number;
  prompt: string;
  duration: number; // Duration in seconds
  difficulty?: 'easy' | 'medium' | 'hard'; // Round difficulty level
  promptCommentId: string; // Reddit comment ID for the prompt
  submissionCommentIds: string[]; // Reddit comment IDs for submissions
  winnerCommentId?: string; // Reddit comment ID for winner announcement
  leaderboardCommentId?: string; // Reddit comment ID for leaderboard
  
  // Round timing
  startTime: Date;
  endTime: Date;
  timeLimit?: number; // in seconds (deprecated, use duration)
  
  // Round status
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  
  // Submissions (no Reddit user IDs stored)
  submissions: RedditSubmission[];
  winner?: {
    playerId: string;
    submissionId: string;
    submissionUrl: string;
    score: number;
  } | null;
}

/**
 * Round Status Enumeration
 */
export enum RoundStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  JUDGING = 'judging',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * Reddit-Compliant Submission Data
 */
export interface RedditCompliantSubmission {
  // Reddit References (comment IDs only, no user IDs)
  commentId: string; // Reddit comment ID for this submission
  parentCommentId: string; // Parent comment ID
  redditMediaUrl: string; // Reddit-hosted media URL
  
  // Game Data (app-specific player ID, not Reddit ID)
  playerId: string; // App-generated player ID, never Reddit user ID
  submissionTime: Date;
  validationResult?: ValidationResult;
  
  // Submission metadata
  isValid: boolean;
  score?: number;
  moderatorApproved?: boolean;
}

/**
 * Reddit Submission Data
 * Represents a player submission in the game
 */
export interface RedditSubmission {
  submissionId: string;
  gameId: string;
  playerId: string;
  roundNumber: number;
  mediaUrl: string;
  submissionTime: Date;
  validationResult?: ValidationResult;
  status: 'pending_review' | 'approved' | 'rejected';
  commentId?: string; // Reddit comment ID for this submission
}

/**
 * Leaderboard Entry
 * Individual entry in the game leaderboard
 */
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  score: number;
  wins: number;
  submissions: number;
  lastActive: Date;
}

/**
 * Reddit-Compliant Winner Data
 */
export interface RedditCompliantWinner {
  playerId: string; // App-generated player ID, never Reddit user ID
  submissionId: string; // Reference to winning submission
  score: number;
  winTime: Date;
  
  // Reddit integration (comment reference only)
  announcementCommentId?: string;
}

/**
 * Validation Result (unchanged)
 */
export interface ValidationResult {
  isValid: boolean;
  isNSFW: boolean;
  contentWarnings: string[];
  violatesPolicy: boolean;
  moderationRequired: boolean;
  validatedAt: Date;
  validatedBy?: string; // App system, not Reddit user
}

/**
 * Reddit-Compliant Session Data
 * Session data that doesn't persist Reddit user information
 */
export interface RedditCompliantSession {
  // Session identity (app-generated)
  sessionId: string;
  profileId: string; // Links to RedditCompliantProfile
  
  // Current Reddit context (not stored permanently)
  currentSubreddit: string;
  currentPostId?: string;
  
  // Session metadata
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  
  // Temporary session data
  temporaryStats: {
    sessionMatches: number;
    sessionWins: number;
    sessionPoints: number;
  };
  
  // Session preferences
  isAnonymous: boolean;
  subredditContext: string;
}

/**
 * Reddit-Compliant Data Export Schema
 * Export format that redacts all Reddit identifiers
 */
export interface RedditCompliantExport {
  exportedAt: Date;
  exportVersion: string;
  
  // User data (Reddit IDs redacted)
  userData: {
    profile: RedditCompliantProfile;
    gameHistory: RedditCompliantGameHistory[];
    achievements: RedditCompliantTrophy[];
    badges: RedditCompliantBadge[];
  };
  
  // Export metadata
  metadata: {
    totalDataSize: number;
    exportFormat: 'json' | 'csv' | 'human-readable';
    redditCompliant: true; // Always true
    redditIdsRedacted: true; // Always true
    subredditDataIsolated: boolean;
    disclaimer: string;
    dataSource: 'pictact-reddit-app';
  };
}

/**
 * Reddit-Compliant Game History
 * Game history without Reddit user identifiers
 */
export interface RedditCompliantGameHistory {
  gameId: string;
  subreddit: string; // Subreddit name only
  gameType: string;
  playedAt: Date;
  duration: number;
  result: 'won' | 'lost' | 'participated';
  score: number;
  rank?: number;
  
  // No Reddit post/comment IDs in export
  // No Reddit usernames or user IDs
}

/**
 * Subreddit Data Isolation Key Patterns
 * Key patterns for isolating data per subreddit
 */
export interface SubredditDataKeys {
  // Profile data per subreddit
  subredditProfile: (subreddit: string, profileId: string) => string;
  
  // Game data per subreddit
  subredditGame: (subreddit: string, gameId: string) => string;
  
  // Statistics per subreddit
  subredditStats: (subreddit: string, profileId: string) => string;
  
  // Leaderboard per subreddit
  subredditLeaderboard: (subreddit: string) => string;
  
  // Settings per subreddit
  subredditSettings: (subreddit: string) => string;
}

/**
 * Reddit-Compliant Data Migration Schema
 * For migrating existing data to Reddit-compliant format
 */
export interface DataMigrationPlan {
  migrationId: string;
  fromVersion: number;
  toVersion: number;
  
  // Migration steps
  steps: DataMigrationStep[];
  
  // Migration metadata
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  
  // Data transformation rules
  transformationRules: {
    redactRedditIds: boolean;
    isolateSubredditData: boolean;
    updatePrivacySettings: boolean;
    migrateGameData: boolean;
  };
}

/**
 * Data Migration Step
 */
export interface DataMigrationStep {
  stepId: string;
  description: string;
  operation: 'redact' | 'isolate' | 'transform' | 'validate';
  targetDataType: string;
  executedAt?: Date;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
}