export type InitResponse = {
  type: "init";
  postId: string;
  username: string;
};

export type IncrementResponse = {
  type: "increment";
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: "decrement";
  postId: string;
  count: number;
};

// Simple test types for image upload and event creation
export type CreateEventRequest = {
  title: string;
  description: string;
};

export type CreateEventResponse = {
  type: "event_created";
  eventId: string;
  success: boolean;
};

export type UploadImageResponse = {
  type: "image_uploaded";
  imageUrl: string;
  success: boolean;
};

export type LoadDataResponse = {
  type: "data_loaded";
  events: Array<{id: string, title: string, description: string, createdAt: string, createdBy: string}>;
  images: Array<{id: string, url: string, uploadedAt: string, uploadedBy: string, redditCommentId?: string}>;
  success: boolean;
};

// Data export types
export type ExportProfileRequest = {
  format?: 'json' | 'csv' | 'human-readable';
  includeMatchHistory?: boolean;
  includePersonalData?: boolean;
  includeSubredditData?: boolean;
  includeTrophies?: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
};

export type ExportProfileResponse = {
  success: boolean;
  data?: any;
  exportedAt?: string;
  format?: string;
  message?: string;
  errors?: string[];
  error?: string;
};

export type ExportSizeEstimateResponse = {
  success: boolean;
  estimatedSizeBytes?: number;
  estimatedSizeKB?: number;
  format?: string;
  message?: string;
  error?: string;
};

// Reddit-compliant data export types
export type ExportRedditCompliantProfileRequest = {
  profileId: string;
  format?: 'json' | 'csv' | 'human-readable';
  includeMatchHistory?: boolean;
  includePersonalData?: boolean;
  includeSubredditData?: boolean;
  includeTrophies?: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
};

export type ExportRedditCompliantProfileResponse = {
  success: boolean;
  data?: any;
  exportedAt?: string;
  format?: string;
  redditCompliant?: boolean;
  redditIdsRedacted?: boolean;
  message?: string;
  errors?: string[];
  error?: string;
};

export type DeleteRedditCompliantDataRequest = {
  profileId: string;
  confirmDeletion: boolean;
};

export type DeleteRedditCompliantDataResponse = {
  success: boolean;
  message: string;
  deletedAt?: string;
  error?: string;
};

export type MigrateToRedditCompliantRequest = {
  userId?: string; // If not provided, migrates all profiles
  options?: {
    dryRun?: boolean;
    batchSize?: number;
    redactAllRedditIds?: boolean;
    isolateSubredditData?: boolean;
    updatePrivacySettings?: boolean;
    backupOriginalData?: boolean;
  };
};

export type MigrateToRedditCompliantResponse = {
  success: boolean;
  migrationId: string;
  migratedProfiles?: number;
  skippedProfiles?: number;
  errors?: string[];
  message?: string;
};

export type ValidateRedditComplianceRequest = {
  profileId: string;
};

export type ValidateRedditComplianceResponse = {
  success: boolean;
  isCompliant: boolean;
  issues?: string[];
  message?: string;
  error?: string;
};

// Import Reddit compliance types
import {
  GamePostConfig,
  RedditPostResult,
  GameCommentConfig,
  RedditCommentResult,
  GameThread,
  RoundUpdate,
  LeaderboardData
} from './reddit-compliance';

// Reddit Post and Comment API Types
export type CreateGamePostRequest = {
  gameConfig: GamePostConfig;
};

export type CreateGamePostResponse = {
  success: boolean;
  data?: RedditPostResult;
  message?: string;
  rateLimited?: boolean;
  retryAfter?: number;
};

export type SubmitGameCommentRequest = {
  commentConfig: GameCommentConfig;
};

export type SubmitGameCommentResponse = {
  success: boolean;
  data?: RedditCommentResult;
  message?: string;
  rateLimited?: boolean;
  retryAfter?: number;
};

export type CreateGameThreadRequest = {
  postId: string;
  gameId: string;
};

export type CreateGameThreadResponse = {
  success: boolean;
  data?: GameThread;
  message?: string;
};

export type PostRoundUpdateRequest = {
  gameThread: GameThread;
  roundUpdate: RoundUpdate;
};

export type PostRoundUpdateResponse = {
  success: boolean;
  data?: { commentId: string };
  message?: string;
};

export type PostLeaderboardUpdateRequest = {
  gameThread: GameThread;
  leaderboard: LeaderboardData;
};

export type PostLeaderboardUpdateResponse = {
  success: boolean;
  data?: { commentId: string };
  message?: string;
};

export type HandlePlayerSubmissionRequest = {
  gameThread: GameThread;
  playerId: string;
  submissionUrl: string;
  roundNumber: number;
};

export type HandlePlayerSubmissionResponse = {
  success: boolean;
  data?: { commentId: string };
  message?: string;
};

// Re-export authentication types
export * from './auth';

// Re-export Reddit compliance types
export * from './reddit-compliance';
