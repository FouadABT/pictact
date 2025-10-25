// Shared type definitions for PicTact

// Authentication types
export * from './auth.js';

// Profile types (excluding conflicting types)
export { 
  UserProfile, 
  GameStats, 
  Trophy, 
  UserPreferences,
  NotificationSettings,
  PrivacySettings
} from './profile.js';

// Reddit-compliant data types (excluding conflicting types)
export { 
  RedditCompliantUserProfile,
  RedditCompliantGameStats,
  RedditCompliantTrophy,
  RedditCompliantUserPreferences,
  RedditCompliantNotificationSettings,
  RedditCompliantPrivacySettings,
  AccessibilityOptions as RedditAccessibilityOptions,
  TrophyCategory as RedditTrophyCategory,
  TrophyRarity as RedditTrophyRarity,
  LeaderboardEntry as RedditLeaderboardEntry
} from './reddit-compliant-data.js';

// API types
export * from './api.js';