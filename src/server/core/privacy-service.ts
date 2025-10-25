// Privacy service - manages user privacy controls and data visibility

import { 
  UserProfile, 
  PublicProfile, 
  PrivacySettings,
  AnonymousProfile,
  LifetimeStatistics,
  Trophy,
  Badge,
  SubredditStats
} from "../../shared/types/profile.js";
import { AnonymousSessionManager } from "./anonymous-session-manager.js";

/**
 * Data types that can be controlled by privacy settings
 */
export type DataType = 
  | 'profile' 
  | 'lifetimeStats' 
  | 'trophies' 
  | 'badges'
  | 'subredditStats' 
  | 'recentActivity'
  | 'displayName';

/**
 * User roles for access control
 */
export type UserRole = 'owner' | 'friend' | 'public' | 'anonymous';

/**
 * Privacy Service
 * Manages user privacy controls and data visibility filtering
 */
export class PrivacyService {
  private anonymousSessionManager: AnonymousSessionManager;

  constructor() {
    this.anonymousSessionManager = new AnonymousSessionManager();
  }

  /**
   * Get visible profile data based on privacy settings and viewer relationship
   */
  async getVisibleProfile(userId: string, profile: UserProfile, viewerId?: string): Promise<PublicProfile> {
    const viewerRole = this.determineViewerRole(userId, viewerId);
    return this.filterProfileByRole(profile, viewerRole);
  }

  /**
   * Update privacy settings for a user
   */
  async updatePrivacySettings(_userId: string, settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    // Validate privacy settings
    const validatedSettings = this.validatePrivacySettings(settings);
    
    // In a real implementation, this would update the storage
    // For now, we'll return the validated settings
    return validatedSettings as PrivacySettings;
  }

  /**
   * Check if a viewer can access specific data type for a user
   */
  canViewData(userId: string, viewerId: string | undefined, dataType: DataType, privacySettings: PrivacySettings): boolean {
    const viewerRole = this.determineViewerRole(userId, viewerId);
    
    // Owner can always view their own data
    if (viewerRole === 'owner') {
      return true;
    }

    // Check profile visibility first
    if (privacySettings.profileVisibility === 'private' && viewerRole === 'public') {
      return dataType === 'displayName'; // Only display name visible for private profiles
    }

    // Check specific data type permissions
    switch (dataType) {
      case 'profile':
        return privacySettings.profileVisibility === 'public' || 
               (privacySettings.profileVisibility === 'friends' && viewerRole === 'friend');
      
      case 'lifetimeStats':
        return privacySettings.showLifetimeStats;
      
      case 'trophies':
        return privacySettings.showTrophies;
      
      case 'badges':
        return privacySettings.showTrophies; // Badges follow trophy visibility
      
      case 'subredditStats':
        return privacySettings.showSubredditStats;
      
      case 'recentActivity':
        return privacySettings.showRecentActivity;
      
      case 'displayName':
        return true; // Display name is always visible if profile is accessible
      
      default:
        return false;
    }
  }

  /**
   * Create anonymized version of profile for deleted users
   */
  anonymizeProfile(_profile: UserProfile): AnonymousProfile {
    return {
      sessionId: `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      temporaryStats: {
        sessionMatches: 0,
        sessionWins: 0,
        sessionPoints: 0
      },
      createdAt: new Date()
    };
  }

  /**
   * Create anonymous profile for temporary users
   */
  createAnonymousProfile(sessionId?: string): AnonymousProfile {
    return this.anonymousSessionManager.createAnonymousSession(sessionId);
  }

  /**
   * Get anonymous session by ID
   */
  getAnonymousSession(sessionId: string): AnonymousProfile | null {
    return this.anonymousSessionManager.getAnonymousSession(sessionId);
  }

  /**
   * Update anonymous session statistics
   */
  updateAnonymousStats(
    sessionId: string, 
    updates: { matchesPlayed?: number; wins?: number; points?: number }
  ): AnonymousProfile | null {
    return this.anonymousSessionManager.updateAnonymousStats(sessionId, updates);
  }

  /**
   * Record match result for anonymous user
   */
  recordAnonymousMatchResult(
    sessionId: string,
    matchResult: { won: boolean; points: number }
  ): AnonymousProfile | null {
    return this.anonymousSessionManager.recordAnonymousMatchResult(sessionId, matchResult);
  }

  /**
   * Delete anonymous session
   */
  deleteAnonymousSession(sessionId: string): void {
    this.anonymousSessionManager.deleteAnonymousSession(sessionId);
  }

  /**
   * Check if a session ID belongs to an anonymous user
   */
  isAnonymousSession(sessionId: string): boolean {
    return this.anonymousSessionManager.isAnonymousSession(sessionId);
  }

  /**
   * Convert anonymous session to authenticated profile data
   */
  convertAnonymousToAuthenticated(sessionId: string): {
    matches: number;
    wins: number;
    points: number;
  } | null {
    return this.anonymousSessionManager.convertAnonymousToAuthenticated(sessionId);
  }

  /**
   * Check if user has enabled anonymous participation mode
   */
  isAnonymousModeEnabled(privacySettings: PrivacySettings): boolean {
    return privacySettings.allowAnonymousMode;
  }

  /**
   * Get default privacy settings for new users
   */
  getDefaultPrivacySettings(): PrivacySettings {
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
   * Validate and sanitize privacy settings
   */
  validatePrivacySettings(settings: Partial<PrivacySettings>): Partial<PrivacySettings> {
    const validated: Partial<PrivacySettings> = {};

    // Validate profile visibility
    if (settings.profileVisibility) {
      if (['public', 'friends', 'private'].includes(settings.profileVisibility)) {
        validated.profileVisibility = settings.profileVisibility;
      }
    }

    // Validate boolean settings
    const booleanSettings: (keyof PrivacySettings)[] = [
      'showLifetimeStats',
      'showTrophies', 
      'showRecentActivity',
      'showSubredditStats',
      'allowDataExport',
      'allowCrossSubredditTracking',
      'allowAnonymousMode'
    ];

    for (const setting of booleanSettings) {
      if (typeof settings[setting] === 'boolean') {
        (validated as any)[setting] = settings[setting];
      }
    }

    return validated;
  }

  /**
   * Apply privacy-based data filtering to profile statistics
   */
  filterLifetimeStats(stats: LifetimeStatistics, canView: boolean): Partial<LifetimeStatistics> | undefined {
    if (!canView) {
      return undefined;
    }
    return stats;
  }

  /**
   * Apply privacy-based filtering to trophy collection
   */
  filterTrophies(trophies: Trophy[], canView: boolean): Trophy[] | undefined {
    if (!canView) {
      return undefined;
    }
    return trophies;
  }

  /**
   * Apply privacy-based filtering to badge collection
   */
  filterBadges(badges: Badge[], canView: boolean): Badge[] | undefined {
    if (!canView) {
      return undefined;
    }
    return badges;
  }

  /**
   * Apply privacy-based filtering to subreddit statistics
   */
  filterSubredditStats(
    subredditStats: Map<string, SubredditStats>, 
    canView: boolean
  ): Map<string, Partial<SubredditStats>> | undefined {
    if (!canView) {
      return undefined;
    }

    // Return full subreddit stats if allowed
    const filteredStats = new Map<string, Partial<SubredditStats>>();
    for (const [subreddit, stats] of subredditStats) {
      filteredStats.set(subreddit, stats);
    }
    return filteredStats;
  }

  // Private helper methods

  /**
   * Determine the relationship between viewer and profile owner
   */
  private determineViewerRole(userId: string, viewerId?: string): UserRole {
    if (!viewerId) {
      return 'anonymous';
    }
    
    if (userId === viewerId) {
      return 'owner';
    }

    // In a real implementation, this would check friendship/relationship status
    // For now, we'll treat all authenticated users as 'public'
    return 'public';
  }

  /**
   * Filter profile data based on viewer role and privacy settings
   */
  private filterProfileByRole(profile: UserProfile, viewerRole: UserRole): PublicProfile {
    const settings = profile.privacySettings;
    const isOwner = viewerRole === 'owner';

    // If profile is private and viewer is not the owner, return minimal data
    if (settings.profileVisibility === 'private' && !isOwner) {
      return {
        userId: profile.userId,
        displayName: profile.displayName,
        joinedAt: profile.createdAt
      };
    }

    // Build public profile based on privacy settings and viewer role
    const publicProfile: PublicProfile = {
      userId: profile.userId,
      displayName: profile.displayName,
      joinedAt: profile.createdAt
    };

    // Add optional data based on privacy settings or ownership
    const canViewStats = this.canViewData(profile.userId, isOwner ? profile.userId : undefined, 'lifetimeStats', settings);
    if (canViewStats) {
      const filteredStats = this.filterLifetimeStats(profile.lifetimeStats, true);
      if (filteredStats) {
        publicProfile.lifetimeStats = filteredStats;
      }
    }

    const canViewTrophies = this.canViewData(profile.userId, isOwner ? profile.userId : undefined, 'trophies', settings);
    if (canViewTrophies) {
      const filteredTrophies = this.filterTrophies(profile.trophyCollection, true);
      const filteredBadges = this.filterBadges(profile.badges, true);
      if (filteredTrophies) {
        publicProfile.trophyCollection = filteredTrophies;
      }
      if (filteredBadges) {
        publicProfile.badges = filteredBadges;
      }
    }

    const canViewSubredditStats = this.canViewData(profile.userId, isOwner ? profile.userId : undefined, 'subredditStats', settings);
    if (canViewSubredditStats) {
      const filteredSubredditStats = this.filterSubredditStats(profile.subredditStats, true);
      if (filteredSubredditStats) {
        publicProfile.subredditStats = filteredSubredditStats;
      }
    }

    return publicProfile;
  }
}