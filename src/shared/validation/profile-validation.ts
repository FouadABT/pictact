// Profile data validation functions

import { 
  UserProfile, 
  UserPreferences, 
  PrivacySettings, 
  ProfileValidationResult, 
  ProfileValidationError,
  CreateProfileRequest,
  ProfileUpdates,
  LifetimeStatistics,
  Trophy,
  Badge
} from '../types/profile.js';

/**
 * Validates a complete user profile
 */
export function validateUserProfile(profile: UserProfile): ProfileValidationResult {
  const errors: ProfileValidationError[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!profile.userId || typeof profile.userId !== 'string') {
    errors.push({
      field: 'userId',
      message: 'User ID is required and must be a string',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!profile.redditUsername || typeof profile.redditUsername !== 'string') {
    errors.push({
      field: 'redditUsername',
      message: 'Reddit username is required and must be a string',
      code: 'REQUIRED_FIELD'
    });
  }

  // Validate username format (Reddit usernames are alphanumeric with underscores and hyphens)
  if (profile.redditUsername && !/^[a-zA-Z0-9_-]{3,20}$/.test(profile.redditUsername)) {
    errors.push({
      field: 'redditUsername',
      message: 'Reddit username must be 3-20 characters, alphanumeric with underscores and hyphens only',
      code: 'INVALID_FORMAT'
    });
  }

  // Validate display name if provided
  if (profile.displayName !== undefined) {
    if (typeof profile.displayName !== 'string') {
      errors.push({
        field: 'displayName',
        message: 'Display name must be a string',
        code: 'INVALID_TYPE'
      });
    } else if (profile.displayName.length > 50) {
      errors.push({
        field: 'displayName',
        message: 'Display name cannot exceed 50 characters',
        code: 'MAX_LENGTH_EXCEEDED'
      });
    } else if (profile.displayName.trim().length === 0) {
      warnings.push('Display name is empty or contains only whitespace');
    }
  }

  // Validate timestamps
  const timestampFields = ['createdAt', 'lastActiveAt', 'lastProfileUpdate'] as const;
  timestampFields.forEach(field => {
    if (!(profile[field] instanceof Date) || isNaN(profile[field].getTime())) {
      errors.push({
        field,
        message: `${field} must be a valid Date object`,
        code: 'INVALID_DATE'
      });
    }
  });

  // Validate profile version
  if (typeof profile.profileVersion !== 'number' || profile.profileVersion < 1) {
    errors.push({
      field: 'profileVersion',
      message: 'Profile version must be a positive number',
      code: 'INVALID_VERSION'
    });
  }

  // Validate nested objects
  const preferencesValidation = validateUserPreferences(profile.preferences);
  errors.push(...preferencesValidation.errors);
  warnings.push(...preferencesValidation.warnings);

  const privacyValidation = validatePrivacySettings(profile.privacySettings);
  errors.push(...privacyValidation.errors);
  warnings.push(...privacyValidation.warnings);

  const statsValidation = validateLifetimeStatistics(profile.lifetimeStats);
  errors.push(...statsValidation.errors);
  warnings.push(...statsValidation.warnings);

  // Validate trophy collection
  if (!Array.isArray(profile.trophyCollection)) {
    errors.push({
      field: 'trophyCollection',
      message: 'Trophy collection must be an array',
      code: 'INVALID_TYPE'
    });
  } else {
    profile.trophyCollection.forEach((trophy, index) => {
      const trophyValidation = validateTrophy(trophy);
      trophyValidation.errors.forEach(error => {
        errors.push({
          ...error,
          field: `trophyCollection[${index}].${error.field}`
        });
      });
    });
  }

  // Validate badges
  if (!Array.isArray(profile.badges)) {
    errors.push({
      field: 'badges',
      message: 'Badges must be an array',
      code: 'INVALID_TYPE'
    });
  } else {
    profile.badges.forEach((badge, index) => {
      const badgeValidation = validateBadge(badge);
      badgeValidation.errors.forEach(error => {
        errors.push({
          ...error,
          field: `badges[${index}].${error.field}`
        });
      });
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates user preferences
 */
export function validateUserPreferences(preferences: UserPreferences): ProfileValidationResult {
  const errors: ProfileValidationError[] = [];
  const warnings: string[] = [];

  if (!preferences || typeof preferences !== 'object') {
    errors.push({
      field: 'preferences',
      message: 'Preferences must be an object',
      code: 'INVALID_TYPE'
    });
    return { isValid: false, errors, warnings };
  }

  // Validate notification settings
  if (preferences.notifications) {
    const validFrequencies = ['immediate', 'daily', 'weekly', 'never'];
    if (!validFrequencies.includes(preferences.notifications.frequency)) {
      errors.push({
        field: 'notifications.frequency',
        message: 'Notification frequency must be one of: immediate, daily, weekly, never',
        code: 'INVALID_ENUM_VALUE'
      });
    }
  }

  // Validate game settings
  if (preferences.gameSettings) {
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(preferences.gameSettings.defaultDifficulty)) {
      errors.push({
        field: 'gameSettings.defaultDifficulty',
        message: 'Default difficulty must be one of: easy, medium, hard',
        code: 'INVALID_ENUM_VALUE'
      });
    }

    if (preferences.gameSettings.maxConcurrentGames < 1 || preferences.gameSettings.maxConcurrentGames > 10) {
      errors.push({
        field: 'gameSettings.maxConcurrentGames',
        message: 'Max concurrent games must be between 1 and 10',
        code: 'OUT_OF_RANGE'
      });
    }

    if (!Array.isArray(preferences.gameSettings.preferredThemes)) {
      errors.push({
        field: 'gameSettings.preferredThemes',
        message: 'Preferred themes must be an array',
        code: 'INVALID_TYPE'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates privacy settings
 */
export function validatePrivacySettings(settings: PrivacySettings): ProfileValidationResult {
  const errors: ProfileValidationError[] = [];
  const warnings: string[] = [];

  if (!settings || typeof settings !== 'object') {
    errors.push({
      field: 'privacySettings',
      message: 'Privacy settings must be an object',
      code: 'INVALID_TYPE'
    });
    return { isValid: false, errors, warnings };
  }

  // Validate profile visibility
  const validVisibilities = ['public', 'friends', 'private'];
  if (!validVisibilities.includes(settings.profileVisibility)) {
    errors.push({
      field: 'profileVisibility',
      message: 'Profile visibility must be one of: public, friends, private',
      code: 'INVALID_ENUM_VALUE'
    });
  }

  // Validate boolean fields
  const booleanFields = [
    'showLifetimeStats', 'showTrophies', 'showRecentActivity', 'showSubredditStats',
    'allowDataExport', 'allowCrossSubredditTracking', 'allowAnonymousMode'
  ] as const;

  booleanFields.forEach(field => {
    if (typeof settings[field] !== 'boolean') {
      errors.push({
        field,
        message: `${field} must be a boolean value`,
        code: 'INVALID_TYPE'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates lifetime statistics
 */
export function validateLifetimeStatistics(stats: LifetimeStatistics): ProfileValidationResult {
  const errors: ProfileValidationError[] = [];
  const warnings: string[] = [];

  if (!stats || typeof stats !== 'object') {
    errors.push({
      field: 'lifetimeStats',
      message: 'Lifetime statistics must be an object',
      code: 'INVALID_TYPE'
    });
    return { isValid: false, errors, warnings };
  }

  // Validate numeric fields
  const numericFields = [
    'totalMatches', 'totalWins', 'totalPoints', 'averageSolveTime',
    'winRate', 'averageRank', 'bestStreak', 'currentStreak', 'totalPlayTime'
  ] as const;

  numericFields.forEach(field => {
    if (typeof stats[field] !== 'number' || isNaN(stats[field]) || stats[field] < 0) {
      errors.push({
        field,
        message: `${field} must be a non-negative number`,
        code: 'INVALID_NUMBER'
      });
    }
  });

  // Validate win rate is between 0 and 1
  if (stats.winRate > 1) {
    errors.push({
      field: 'winRate',
      message: 'Win rate must be between 0 and 1',
      code: 'OUT_OF_RANGE'
    });
  }

  // Validate that wins don't exceed total matches
  if (stats.totalWins > stats.totalMatches) {
    errors.push({
      field: 'totalWins',
      message: 'Total wins cannot exceed total matches',
      code: 'LOGICAL_INCONSISTENCY'
    });
  }

  // Validate arrays
  if (!Array.isArray(stats.favoriteThemes)) {
    errors.push({
      field: 'favoriteThemes',
      message: 'Favorite themes must be an array',
      code: 'INVALID_TYPE'
    });
  }

  if (!Array.isArray(stats.mostActiveSubreddits)) {
    errors.push({
      field: 'mostActiveSubreddits',
      message: 'Most active subreddits must be an array',
      code: 'INVALID_TYPE'
    });
  }

  // Validate dates
  if (!(stats.firstGameDate instanceof Date) || isNaN(stats.firstGameDate.getTime())) {
    errors.push({
      field: 'firstGameDate',
      message: 'First game date must be a valid Date object',
      code: 'INVALID_DATE'
    });
  }

  if (!(stats.lastGameDate instanceof Date) || isNaN(stats.lastGameDate.getTime())) {
    errors.push({
      field: 'lastGameDate',
      message: 'Last game date must be a valid Date object',
      code: 'INVALID_DATE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates a trophy object
 */
export function validateTrophy(trophy: Trophy): ProfileValidationResult {
  const errors: ProfileValidationError[] = [];
  const warnings: string[] = [];

  if (!trophy.id || typeof trophy.id !== 'string') {
    errors.push({
      field: 'id',
      message: 'Trophy ID is required and must be a string',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!trophy.name || typeof trophy.name !== 'string') {
    errors.push({
      field: 'name',
      message: 'Trophy name is required and must be a string',
      code: 'REQUIRED_FIELD'
    });
  }

  const validCategories = ['achievement', 'milestone', 'seasonal', 'special', 'community'];
  if (!validCategories.includes(trophy.category)) {
    errors.push({
      field: 'category',
      message: 'Trophy category must be one of: achievement, milestone, seasonal, special, community',
      code: 'INVALID_ENUM_VALUE'
    });
  }

  const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  if (!validRarities.includes(trophy.rarity)) {
    errors.push({
      field: 'rarity',
      message: 'Trophy rarity must be one of: common, uncommon, rare, epic, legendary',
      code: 'INVALID_ENUM_VALUE'
    });
  }

  if (!(trophy.earnedAt instanceof Date) || isNaN(trophy.earnedAt.getTime())) {
    errors.push({
      field: 'earnedAt',
      message: 'Earned at must be a valid Date object',
      code: 'INVALID_DATE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates a badge object
 */
export function validateBadge(badge: Badge): ProfileValidationResult {
  const errors: ProfileValidationError[] = [];
  const warnings: string[] = [];

  if (!badge.id || typeof badge.id !== 'string') {
    errors.push({
      field: 'id',
      message: 'Badge ID is required and must be a string',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!badge.name || typeof badge.name !== 'string') {
    errors.push({
      field: 'name',
      message: 'Badge name is required and must be a string',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!(badge.earnedAt instanceof Date) || isNaN(badge.earnedAt.getTime())) {
    errors.push({
      field: 'earnedAt',
      message: 'Earned at must be a valid Date object',
      code: 'INVALID_DATE'
    });
  }

  if (badge.level !== undefined && (typeof badge.level !== 'number' || badge.level < 1)) {
    errors.push({
      field: 'level',
      message: 'Badge level must be a positive number',
      code: 'INVALID_NUMBER'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates profile creation request
 */
export function validateCreateProfileRequest(request: CreateProfileRequest): ProfileValidationResult {
  const errors: ProfileValidationError[] = [];
  const warnings: string[] = [];

  if (!request.userId || typeof request.userId !== 'string') {
    errors.push({
      field: 'userId',
      message: 'User ID is required and must be a string',
      code: 'REQUIRED_FIELD'
    });
  }

  if (!request.redditUsername || typeof request.redditUsername !== 'string') {
    errors.push({
      field: 'redditUsername',
      message: 'Reddit username is required and must be a string',
      code: 'REQUIRED_FIELD'
    });
  }

  // Validate username format
  if (request.redditUsername && !/^[a-zA-Z0-9_-]{3,20}$/.test(request.redditUsername)) {
    errors.push({
      field: 'redditUsername',
      message: 'Reddit username must be 3-20 characters, alphanumeric with underscores and hyphens only',
      code: 'INVALID_FORMAT'
    });
  }

  // Validate optional preferences if provided
  if (request.initialPreferences) {
    // Create a minimal preferences object for validation
    const defaultPreferences: UserPreferences = {
      notifications: {
        emailNotifications: false,
        pushNotifications: true,
        gameStartReminders: true,
        achievementAlerts: true,
        weeklyDigest: false,
        frequency: 'daily'
      },
      gameSettings: {
        defaultDifficulty: 'medium',
        autoJoinEvents: false,
        showHints: true,
        preferredThemes: [],
        maxConcurrentGames: 3
      },
      accessibility: {
        reducedMotion: false,
        highContrast: false,
        largeText: false,
        screenReaderOptimized: false,
        colorBlindFriendly: false
      }
    };

    const mergedPreferences = { ...defaultPreferences, ...request.initialPreferences };
    const preferencesValidation = validateUserPreferences(mergedPreferences);
    errors.push(...preferencesValidation.errors);
    warnings.push(...preferencesValidation.warnings);
  }

  // Validate optional privacy settings if provided
  if (request.initialPrivacySettings) {
    const defaultPrivacySettings: PrivacySettings = {
      profileVisibility: 'public',
      showLifetimeStats: true,
      showTrophies: true,
      showRecentActivity: true,
      showSubredditStats: true,
      allowDataExport: true,
      allowCrossSubredditTracking: true,
      allowAnonymousMode: false
    };

    const mergedPrivacySettings = { ...defaultPrivacySettings, ...request.initialPrivacySettings };
    const privacyValidation = validatePrivacySettings(mergedPrivacySettings);
    errors.push(...privacyValidation.errors);
    warnings.push(...privacyValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates profile updates
 */
export function validateProfileUpdates(updates: ProfileUpdates): ProfileValidationResult {
  const errors: ProfileValidationError[] = [];
  const warnings: string[] = [];

  // Validate display name if provided
  if (updates.displayName !== undefined) {
    if (typeof updates.displayName !== 'string') {
      errors.push({
        field: 'displayName',
        message: 'Display name must be a string',
        code: 'INVALID_TYPE'
      });
    } else if (updates.displayName.length > 50) {
      errors.push({
        field: 'displayName',
        message: 'Display name cannot exceed 50 characters',
        code: 'MAX_LENGTH_EXCEEDED'
      });
    } else if (updates.displayName.trim().length === 0) {
      warnings.push('Display name is empty or contains only whitespace');
    }
  }

  // Validate preferences if provided
  if (updates.preferences) {
    // For partial updates, we need to validate only the provided fields
    // This is a simplified validation - in a real implementation, you'd want to
    // merge with existing preferences and validate the complete object
    if (updates.preferences.gameSettings?.maxConcurrentGames !== undefined) {
      if (updates.preferences.gameSettings.maxConcurrentGames < 1 || 
          updates.preferences.gameSettings.maxConcurrentGames > 10) {
        errors.push({
          field: 'preferences.gameSettings.maxConcurrentGames',
          message: 'Max concurrent games must be between 1 and 10',
          code: 'OUT_OF_RANGE'
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Creates default user preferences
 */
export function createDefaultUserPreferences(): UserPreferences {
  return {
    notifications: {
      emailNotifications: false,
      pushNotifications: true,
      gameStartReminders: true,
      achievementAlerts: true,
      weeklyDigest: false,
      frequency: 'daily'
    },
    gameSettings: {
      defaultDifficulty: 'medium',
      autoJoinEvents: false,
      showHints: true,
      preferredThemes: [],
      maxConcurrentGames: 3
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      screenReaderOptimized: false,
      colorBlindFriendly: false
    }
  };
}

/**
 * Creates default privacy settings
 */
export function createDefaultPrivacySettings(): PrivacySettings {
  return {
    profileVisibility: 'public',
    showLifetimeStats: true,
    showTrophies: true,
    showRecentActivity: true,
    showSubredditStats: true,
    allowDataExport: true,
    allowCrossSubredditTracking: true,
    allowAnonymousMode: false
  };
}

/**
 * Creates default lifetime statistics
 */
export function createDefaultLifetimeStatistics(): LifetimeStatistics {
  const now = new Date();
  return {
    totalMatches: 0,
    totalWins: 0,
    totalPoints: 0,
    averageSolveTime: 0,
    winRate: 0,
    averageRank: 0,
    bestStreak: 0,
    currentStreak: 0,
    favoriteThemes: [],
    mostActiveSubreddits: [],
    totalPlayTime: 0,
    firstGameDate: now,
    lastGameDate: now
  };
}