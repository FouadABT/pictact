/**
 * Reddit Devvit Platform Compliance Types
 * Shared types for Reddit integration and compliance
 */

/**
 * Reddit Devvit Context
 * Represents the current Reddit context for the application
 */
export interface DevvitContext {
  postId: string;
  subreddit: string;
  userId?: string;
  moderatorPermissions?: ModeratorPermissions;
}

/**
 * Moderator Permissions
 * Represents the permissions a moderator has in the current subreddit
 */
export interface ModeratorPermissions {
  canManagePosts: boolean;
  canManageComments: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewModLog: boolean;
}

/**
 * Reddit API Result
 * Standard result wrapper for all Reddit API operations
 */
export interface RedditApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimited?: boolean;
  retryAfter?: number;
}

/**
 * Content Validation Result
 * Result of Reddit content policy validation
 */
export interface ContentValidation {
  isValid: boolean;
  isNSFW: boolean;
  contentWarnings: string[];
  violatesPolicy: boolean;
  moderationRequired: boolean;
}

/**
 * Reddit Post Creation Configuration
 * Configuration for creating Reddit posts through the compliance service
 */
export interface RedditPostConfig {
  title: string;
  text?: string;
  url?: string;
  subreddit: string;
  nsfw?: boolean;
  spoiler?: boolean;
  flairId?: string;
  flairText?: string;
}

/**
 * Reddit Comment Configuration
 * Configuration for creating Reddit comments through the compliance service
 */
export interface RedditCommentConfig {
  text: string;
  parentId: string; // Post ID or comment ID
  distinguish?: boolean; // Moderator distinguish
}

/**
 * Reddit Media Upload Result
 * Result of uploading media through Reddit's media services
 */
export interface RedditMediaResult {
  mediaUrl: string;
  redditMediaId: string;
  thumbnailUrl?: string;
  isNSFW: boolean;
  contentWarnings: string[];
}

/**
 * Reddit Rate Limit Status
 * Information about current rate limit status
 */
export interface RateLimitStatus {
  remaining: number;
  resetTime: Date;
  isLimited: boolean;
  retryAfter?: number;
}

/**
 * Subreddit Permission Check
 * Result of checking permissions for a specific action in a subreddit
 */
export interface SubredditPermissionCheck {
  action: string;
  subreddit: string;
  userId: string;
  isAllowed: boolean;
  reason?: string;
  requiredPermission?: string;
}

/**
 * Reddit Compliance Error Types
 * Specific error types for Reddit compliance operations
 */
export enum RedditComplianceErrorType {
  AUTHENTICATION_REQUIRED = 'authentication_required',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  RATE_LIMITED = 'rate_limited',
  CONTENT_POLICY_VIOLATION = 'content_policy_violation',
  SUBREDDIT_NOT_FOUND = 'subreddit_not_found',
  POST_NOT_FOUND = 'post_not_found',
  INVALID_CONTEXT = 'invalid_context',
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error'
}

/**
 * Reddit Compliance Error
 * Structured error for Reddit compliance operations
 */
export interface RedditComplianceError {
  type: RedditComplianceErrorType;
  message: string;
  details?: any;
  retryable: boolean;
  retryAfter?: number;
}

/**
 * Reddit User Context
 * Information about the current Reddit user in context
 */
export interface RedditUserContext {
  username: string;
  userId: string;
  isAuthenticated: boolean;
  isModerator: boolean;
  permissions: ModeratorPermissions;
  subredditRole: 'member' | 'moderator' | 'admin';
}

/**
 * Reddit Content Policy Check
 * Result of checking content against Reddit's policies
 */
export interface ContentPolicyCheck {
  contentId: string;
  contentType: 'post' | 'comment' | 'media';
  isCompliant: boolean;
  violations: ContentPolicyViolation[];
  recommendedAction: 'approve' | 'flag' | 'remove' | 'escalate';
  confidence: number; // 0-1 confidence score
}

/**
 * Content Policy Violation
 * Specific violation of Reddit's content policies
 */
export interface ContentPolicyViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  rule: string;
  autoModAction?: 'warn' | 'remove' | 'ban';
}

/**
 * Reddit Integration Status
 * Overall status of Reddit platform integration
 */
export interface RedditIntegrationStatus {
  isConnected: boolean;
  contextValid: boolean;
  authenticationStatus: 'authenticated' | 'anonymous' | 'error';
  rateLimitStatus: RateLimitStatus;
  lastError?: RedditComplianceError;
  capabilities: RedditCapabilities;
}

/**
 * Reddit Capabilities
 * Available Reddit API capabilities in current context
 */
export interface RedditCapabilities {
  canCreatePosts: boolean;
  canCreateComments: boolean;
  canUploadMedia: boolean;
  canModerate: boolean;
  canAccessModLog: boolean;
  canManageSettings: boolean;
}

/**
 * Game Post Configuration
 * Configuration for creating game posts through Reddit API
 */
export interface GamePostConfig {
  title: string;
  description: string;
  gameType: 'pictact' | 'photo-hunt' | 'creative-challenge';
  duration: number; // Duration in minutes
  maxPlayers?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  rules: string[];
  prizes?: string[];
  nsfw?: boolean;
  spoiler?: boolean;
  flairId?: string;
  flairText?: string;
}

/**
 * Reddit Post Data
 * Data structure for Reddit posts returned by the API
 */
export interface RedditPostData {
  id: string;
  url: string;
  title: string;
  text?: string;
  authorName: string;
  subreddit: string;
  createdUtc: number;
  score: number;
  numComments: number;
}

/**
 * Reddit Comment Data
 * Data structure for Reddit comments returned by the API
 */
export interface RedditCommentData {
  id: string;
  permalink: string;
  text: string;
  authorName: string;
  parentId: string;
  createdUtc: number;
  score: number;
  isStickied?: boolean;
  isDistinguished?: boolean;
}

/**
 * Reddit Post Result
 * Result of creating a Reddit post
 */
export interface RedditPostResult {
  postId: string;
  postUrl: string;
  title: string;
  subreddit: string;
  createdAt: Date;
  author: string;
}

/**
 * Reddit Comment Result
 * Result of creating a Reddit comment
 */
export interface RedditCommentResult {
  commentId: string;
  commentUrl: string;
  parentId: string;
  text: string;
  author: string;
  createdAt: Date;
  isStickied?: boolean;
  isDistinguished?: boolean;
}

/**
 * Game Thread Structure
 * Represents the comment thread structure for a game
 */
export interface GameThread {
  postId: string;
  gameCommentId: string; // Main game info comment
  rulesCommentId: string; // Game rules comment
  statusCommentId: string; // Current status comment
  leaderboardCommentId?: string; // Leaderboard comment
  roundCommentIds: string[]; // Round-specific comments
  submissionCommentIds: string[]; // Player submission comments
  lastUpdateTime: Date;
}

/**
 * Game Comment Types
 * Different types of comments in a game thread
 */
export enum GameCommentType {
  GAME_INFO = 'game_info',
  RULES = 'rules',
  STATUS = 'status',
  LEADERBOARD = 'leaderboard',
  ROUND_PROMPT = 'round_prompt',
  ROUND_RESULT = 'round_result',
  PLAYER_SUBMISSION = 'player_submission',
  MODERATOR_ACTION = 'moderator_action',
  SYSTEM_UPDATE = 'system_update'
}

/**
 * Game Comment Configuration
 * Configuration for creating game-specific comments
 */
export interface GameCommentConfig {
  type: GameCommentType;
  text: string;
  parentId: string;
  sticky?: boolean;
  distinguish?: boolean;
  metadata?: {
    gameId?: string;
    roundNumber?: number;
    playerId?: string;
    submissionUrl?: string;
    score?: number;
  };
}

/**
 * Round Update Data
 * Data for updating round information via comments
 */
export interface RoundUpdate {
  roundNumber: number;
  prompt: string;
  timeRemaining: number;
  submissions: number;
  status: 'active' | 'completed' | 'cancelled';
  winner?: {
    playerId: string;
    username: string;
    submissionUrl: string;
    score: number;
  };
}

/**
 * Leaderboard Data
 * Data for leaderboard comment updates
 */
export interface LeaderboardData {
  gameId: string;
  entries: LeaderboardEntry[];
  lastUpdated: Date;
  totalRounds: number;
  currentRound: number;
}

/**
 * Leaderboard Entry
 * Individual entry in the leaderboard
 */
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  score: number;
  wins: number;
  submissions: number;
  lastActive: Date;
}

/**
 * Game Update Types for Real-Time System
 * Represents different types of updates that can occur during a game
 */
export interface GameUpdate {
  type: 'round_start' | 'round_end' | 'submission' | 'leaderboard' | 'timer' | 'status';
  timestamp: Date;
  data: any;
  commentId?: string;
}

/**
 * Polling Configuration
 * Configuration for Reddit comment polling system
 */
export interface PollingConfig {
  intervalMs: number;
  maxRetries: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

/**
 * Comment Polling State
 * Current state of comment polling for a game
 */
export interface PollingState {
  isActive: boolean;
  lastPollTime: Date;
  lastCommentTime: Date;
  errorCount: number;
  nextPollTime: Date;
}

/**
 * Timer Synchronization Data
 * Data for synchronizing client-side timers with Reddit timestamps
 */
export interface TimerSyncData {
  serverTime: Date;
  gameStartTime: Date;
  roundStartTime?: Date;
}

/**
 * Real-Time Update Callback
 * Callback function for handling real-time game updates
 */
export type UpdateCallback = (update: GameUpdate) => void;