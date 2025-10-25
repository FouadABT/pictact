// User profile and related data types

export interface UserProfile {
  // Identity
  userId: string;                    // Reddit user ID
  redditUsername: string;            // Current Reddit username
  displayName?: string;              // Custom display name
  
  // Timestamps
  createdAt: Date;
  lastActiveAt: Date;
  lastProfileUpdate: Date;
  
  // Preferences and settings
  preferences: UserPreferences;
  privacySettings: PrivacySettings;
  
  // Statistics
  lifetimeStats: LifetimeStatistics;
  
  // Achievements
  trophyCollection: Trophy[];
  badges: Badge[];
  
  // Cross-subreddit data
  subredditStats: Map<string, SubredditStats>;
  
  // Version for data migration
  profileVersion: number;
}

export interface UserPreferences {
  // Notification settings
  notifications: NotificationSettings;
  
  // Game settings
  gameSettings: GamePreferences;
  
  // Accessibility options
  accessibility: AccessibilityOptions;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  gameStartReminders: boolean;
  achievementAlerts: boolean;
  weeklyDigest: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

export interface GamePreferences {
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  autoJoinEvents: boolean;
  showHints: boolean;
  preferredThemes: string[];
  maxConcurrentGames: number;
}

export interface AccessibilityOptions {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderOptimized: boolean;
  colorBlindFriendly: boolean;
}

export interface PrivacySettings {
  // Profile visibility
  profileVisibility: 'public' | 'friends' | 'private';
  
  // Data sharing preferences
  showLifetimeStats: boolean;
  showTrophies: boolean;
  showRecentActivity: boolean;
  showSubredditStats: boolean;
  
  // Data control
  allowDataExport: boolean;
  allowCrossSubredditTracking: boolean;
  
  // Anonymous participation
  allowAnonymousMode: boolean;
}

export interface LifetimeStatistics {
  // Game statistics
  totalMatches: number;
  totalWins: number;
  totalPoints: number;
  averageSolveTime: number;
  
  // Performance metrics
  winRate: number;
  averageRank: number;
  bestStreak: number;
  currentStreak: number;
  
  // Activity metrics
  favoriteThemes: string[];
  mostActiveSubreddits: string[];
  totalPlayTime: number; // in minutes
  
  // Timestamps
  firstGameDate: Date;
  lastGameDate: Date;
}

export interface Trophy {
  id: string;
  name: string;
  description: string;
  category: TrophyCategory;
  rarity: TrophyRarity;
  earnedAt: Date;
  subredditEarned?: string;
  metadata?: Record<string, any>;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  earnedAt: Date;
  level?: number;
}

export interface SubredditStats {
  subredditName: string;
  joinedAt: Date;
  lastActiveAt: Date;
  
  // Game statistics for this subreddit
  matches: number;
  wins: number;
  points: number;
  rank: number;
  
  // Subreddit-specific achievements
  trophies: Trophy[];
  specialBadges: Badge[];
}

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

// Cross-subreddit identity types
export interface GlobalProfile {
  userId: string;
  totalMatches: number;
  totalWins: number;
  globalRanking: number;
  subredditParticipation: SubredditStats[];
  lastSyncAt: Date;
}

// Profile update types
export interface ProfileUpdates {
  displayName?: string;
  preferences?: Partial<UserPreferences>;
  privacySettings?: Partial<PrivacySettings>;
}

// Public profile (filtered based on privacy settings)
export interface PublicProfile {
  userId: string;
  displayName?: string | undefined;
  joinedAt: Date;
  lifetimeStats?: Partial<LifetimeStatistics>;
  trophyCollection?: Trophy[];
  badges?: Badge[];
  subredditStats?: Map<string, Partial<SubredditStats>>;
}

// Anonymous profile for users without persistent tracking
export interface AnonymousProfile {
  sessionId: string;
  temporaryStats: {
    sessionMatches: number;
    sessionWins: number;
    sessionPoints: number;
  };
  createdAt: Date;
}

// Profile export format
export interface ProfileExport {
  exportedAt: Date;
  exportVersion: string;
  userData: {
    profile: UserProfile;
    matchHistory: any[]; // Will be defined when match system is implemented
    achievements: Trophy[];
    badges: Badge[];
  };
  metadata: {
    totalDataSize: number;
    exportFormat: 'json' | 'csv';
    includesPersonalData: boolean;
    dataSource?: string;
    redditCompliant?: boolean;
    disclaimer?: string;
  };
}

// Validation result types
export interface ProfileValidationResult {
  isValid: boolean;
  errors: ProfileValidationError[];
  warnings: string[];
}

export interface ProfileValidationError {
  field: string;
  message: string;
  code: string;
}

// Profile creation request
export interface CreateProfileRequest {
  userId: string;
  redditUsername: string;
  initialPreferences?: Partial<UserPreferences>;
  initialPrivacySettings?: Partial<PrivacySettings>;
}