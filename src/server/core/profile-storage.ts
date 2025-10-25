// Profile storage service using Devvit KV store
// Note: Currently using in-memory storage as placeholder until Devvit KV store API is confirmed
import { 
  UserProfile, 
  CreateProfileRequest, 
  ProfileUpdates, 
  GlobalProfile,
  SubredditStats,
  LifetimeStatistics,
  Trophy
} from "../../shared/types/profile.js";
import { 
  validateUserProfile, 
  validateCreateProfileRequest,
  validateProfileUpdates,
  createDefaultUserPreferences,
  createDefaultPrivacySettings,
  createDefaultLifetimeStatistics
} from "../../shared/validation/profile-validation.js";

/**
 * Profile Storage Service
 * Handles persistent storage of user profiles using Devvit KV store
 * Note: Currently using in-memory storage as placeholder
 */
export class ProfileStorageService {
  // In-memory storage (placeholder for Devvit KV store)
  private static profiles: Map<string, string> = new Map();
  private static globalProfiles: Map<string, string> = new Map();
  private static subredditProfiles: Map<string, string> = new Map();
  private static profileIndex: string[] = [];

  /**
   * Clear all in-memory storage (for testing purposes)
   */
  static clearAllData(): void {
    ProfileStorageService.profiles.clear();
    ProfileStorageService.globalProfiles.clear();
    ProfileStorageService.subredditProfiles.clear();
    ProfileStorageService.profileIndex.length = 0;
  }

  // KV key patterns
  private static readonly PROFILE_KEY_PREFIX = "profile:";
  private static readonly GLOBAL_PROFILE_KEY_PREFIX = "global:";
  private static readonly SUBREDDIT_PROFILE_KEY_PREFIX = "subreddit:";
  private static readonly PROFILE_VERSION = 1;

  /**
   * Create a new user profile
   */
  async createProfile(request: CreateProfileRequest): Promise<UserProfile> {
    // Validate the request
    const validation = validateCreateProfileRequest(request);
    if (!validation.isValid) {
      throw new Error(`Profile creation validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const now = new Date();
    const profileKey = this.getProfileKey(request.userId);

    // Check if profile already exists
    const existingProfile = await this.getProfile(request.userId);
    if (existingProfile) {
      throw new Error(`Profile already exists for user: ${request.userId}`);
    }

    // Create the profile object
    const profile: UserProfile = {
      userId: request.userId,
      redditUsername: request.redditUsername,
      displayName: request.redditUsername, // Default to Reddit username
      createdAt: now,
      lastActiveAt: now,
      lastProfileUpdate: now,
      preferences: request.initialPreferences ? 
        { ...createDefaultUserPreferences(), ...request.initialPreferences } :
        createDefaultUserPreferences(),
      privacySettings: request.initialPrivacySettings ?
        { ...createDefaultPrivacySettings(), ...request.initialPrivacySettings } :
        createDefaultPrivacySettings(),
      lifetimeStats: createDefaultLifetimeStatistics(),
      trophyCollection: [],
      badges: [],
      subredditStats: new Map<string, SubredditStats>(),
      profileVersion: ProfileStorageService.PROFILE_VERSION
    };

    // Validate the complete profile
    const profileValidation = validateUserProfile(profile);
    if (!profileValidation.isValid) {
      throw new Error(`Profile validation failed: ${profileValidation.errors.map(e => e.message).join(', ')}`);
    }

    try {
      // Store the profile atomically
      this.storeProfileAtomic(profileKey, profile);
      
      // Update profile index
      this.addToProfileIndex(request.userId);

      // Create global profile entry
      this.createGlobalProfile(request.userId);

      console.log(`Profile created successfully for user: ${request.userId}`);
      return profile;
    } catch (error) {
      console.error(`Failed to create profile for user ${request.userId}:`, error);
      throw new Error(`Profile creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a user profile by user ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profileKey = this.getProfileKey(userId);
      const profileData = ProfileStorageService.profiles.get(profileKey);
      
      if (!profileData) {
        return null;
      }

      // Parse the stored profile data
      const profile = this.deserializeProfile(profileData);
      
      // Validate the retrieved profile
      const validation = validateUserProfile(profile);
      if (!validation.isValid) {
        console.warn(`Retrieved profile for user ${userId} has validation issues:`, validation.errors);
        // Still return the profile but log the issues
      }

      return profile;
    } catch (error) {
      console.error(`Failed to get profile for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update a user profile
   */
  async updateProfile(userId: string, updates: ProfileUpdates): Promise<UserProfile> {
    // Validate the updates
    const validation = validateProfileUpdates(updates);
    if (!validation.isValid) {
      throw new Error(`Profile update validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    try {
      const profileKey = this.getProfileKey(userId);
      
      // Get existing profile
      const existingProfile = await this.getProfile(userId);
      if (!existingProfile) {
        throw new Error(`Profile not found for user: ${userId}`);
      }

      // Apply updates
      const updatedProfile: UserProfile = {
        ...existingProfile,
        ...updates,
        lastProfileUpdate: new Date(),
        // Merge nested objects properly
        preferences: updates.preferences ? 
          { ...existingProfile.preferences, ...updates.preferences } :
          existingProfile.preferences,
        privacySettings: updates.privacySettings ?
          { ...existingProfile.privacySettings, ...updates.privacySettings } :
          existingProfile.privacySettings
      };

      // Validate the updated profile
      const profileValidation = validateUserProfile(updatedProfile);
      if (!profileValidation.isValid) {
        throw new Error(`Updated profile validation failed: ${profileValidation.errors.map(e => e.message).join(', ')}`);
      }

      // Store the updated profile atomically
      this.storeProfileAtomic(profileKey, updatedProfile);

      console.log(`Profile updated successfully for user: ${userId}`);
      return updatedProfile;
    } catch (error) {
      console.error(`Failed to update profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a user profile
   */
  async deleteProfile(userId: string): Promise<void> {
    try {
      const profileKey = this.getProfileKey(userId);
      const globalProfileKey = this.getGlobalProfileKey(userId);

      // Get existing profile to check subreddit participation
      const existingProfile = await this.getProfile(userId);
      if (existingProfile) {
        // Delete subreddit-specific data
        for (const subredditName of existingProfile.subredditStats.keys()) {
          const subredditKey = this.getSubredditProfileKey(subredditName, userId);
          ProfileStorageService.subredditProfiles.delete(subredditKey);
        }
      }

      // Delete main profile and global profile
      ProfileStorageService.profiles.delete(profileKey);
      ProfileStorageService.globalProfiles.delete(globalProfileKey);

      // Remove from profile index
      this.removeFromProfileIndex(userId);

      console.log(`Profile deleted successfully for user: ${userId}`);
    } catch (error) {
      console.error(`Failed to delete profile for user ${userId}:`, error);
      throw new Error(`Profile deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get global profile for cross-subreddit identity
   */
  async getGlobalProfile(userId: string): Promise<GlobalProfile | null> {
    try {
      const globalKey = this.getGlobalProfileKey(userId);
      const globalData = ProfileStorageService.globalProfiles.get(globalKey);
      
      if (!globalData) {
        return null;
      }

      return JSON.parse(globalData) as GlobalProfile;
    } catch (error) {
      console.error(`Failed to get global profile for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update global profile statistics
   */
  async updateGlobalProfile(userId: string, stats: Partial<GlobalProfile>): Promise<void> {
    try {
      const globalKey = this.getGlobalProfileKey(userId);
      const existingGlobal = await this.getGlobalProfile(userId);
      
      if (!existingGlobal) {
        throw new Error(`Global profile not found for user: ${userId}`);
      }

      const updatedGlobal: GlobalProfile = {
        ...existingGlobal,
        ...stats,
        lastSyncAt: new Date()
      };

      ProfileStorageService.globalProfiles.set(globalKey, JSON.stringify(updatedGlobal));
    } catch (error) {
      console.error(`Failed to update global profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get subreddit-specific profile data
   */
  async getSubredditProfile(userId: string, subredditName: string): Promise<SubredditStats | null> {
    try {
      const subredditKey = this.getSubredditProfileKey(subredditName, userId);
      const subredditData = ProfileStorageService.subredditProfiles.get(subredditKey);
      
      if (!subredditData) {
        return null;
      }

      return JSON.parse(subredditData) as SubredditStats;
    } catch (error) {
      console.error(`Failed to get subreddit profile for user ${userId} in ${subredditName}:`, error);
      return null;
    }
  }

  /**
   * Update subreddit-specific profile data
   */
  async updateSubredditProfile(userId: string, subredditName: string, stats: SubredditStats): Promise<void> {
    try {
      const subredditKey = this.getSubredditProfileKey(subredditName, userId);
      ProfileStorageService.subredditProfiles.set(subredditKey, JSON.stringify(stats));

      // Also update the main profile's subreddit stats
      const profile = await this.getProfile(userId);
      if (profile) {
        profile.subredditStats.set(subredditName, stats);
        profile.lastActiveAt = new Date();
        this.storeProfileAtomic(this.getProfileKey(userId), profile);
      }
    } catch (error) {
      console.error(`Failed to update subreddit profile for user ${userId} in ${subredditName}:`, error);
      throw error;
    }
  }

  /**
   * Add trophy to user profile
   */
  async addTrophy(userId: string, trophy: Trophy): Promise<void> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) {
        throw new Error(`Profile not found for user: ${userId}`);
      }

      // Check if trophy already exists
      const existingTrophy = profile.trophyCollection.find(t => t.id === trophy.id);
      if (existingTrophy) {
        console.warn(`Trophy ${trophy.id} already exists for user ${userId}`);
        return;
      }

      profile.trophyCollection.push(trophy);
      profile.lastProfileUpdate = new Date();

      this.storeProfileAtomic(this.getProfileKey(userId), profile);
      console.log(`Trophy ${trophy.id} added to user ${userId}`);
    } catch (error) {
      console.error(`Failed to add trophy to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update lifetime statistics
   */
  async updateLifetimeStats(userId: string, statsUpdate: Partial<LifetimeStatistics>): Promise<void> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) {
        throw new Error(`Profile not found for user: ${userId}`);
      }

      profile.lifetimeStats = {
        ...profile.lifetimeStats,
        ...statsUpdate
      };
      profile.lastActiveAt = new Date();
      profile.lastProfileUpdate = new Date();

      this.storeProfileAtomic(this.getProfileKey(userId), profile);
    } catch (error) {
      console.error(`Failed to update lifetime stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all user IDs (for admin/maintenance purposes)
   */
  async getAllUserIds(): Promise<string[]> {
    try {
      const indexData = ProfileStorageService.profileIndex.length > 0 ? 
        JSON.stringify(ProfileStorageService.profileIndex) : null;
      if (!indexData) {
        return [];
      }
      return JSON.parse(indexData) as string[];
    } catch (error) {
      console.error('Failed to get user IDs from profile index:', error);
      return [];
    }
  }

  // Private helper methods

  private getProfileKey(userId: string): string {
    return `${ProfileStorageService.PROFILE_KEY_PREFIX}${userId}`;
  }

  private getGlobalProfileKey(userId: string): string {
    return `${ProfileStorageService.GLOBAL_PROFILE_KEY_PREFIX}${userId}`;
  }

  private getSubredditProfileKey(subredditName: string, userId: string): string {
    return `${ProfileStorageService.SUBREDDIT_PROFILE_KEY_PREFIX}${subredditName}:${userId}`;
  }

  private storeProfileAtomic(key: string, profile: UserProfile): void {
    const serializedProfile = this.serializeProfile(profile);
    ProfileStorageService.profiles.set(key, serializedProfile);
  }

  private serializeProfile(profile: UserProfile): string {
    // Convert Map to object for JSON serialization
    const serializable = {
      ...profile,
      subredditStats: Object.fromEntries(profile.subredditStats)
    };
    return JSON.stringify(serializable);
  }

  private deserializeProfile(data: string): UserProfile {
    const parsed = JSON.parse(data);
    
    // Convert dates back to Date objects
    const profile: UserProfile = {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      lastActiveAt: new Date(parsed.lastActiveAt),
      lastProfileUpdate: new Date(parsed.lastProfileUpdate),
      lifetimeStats: {
        ...parsed.lifetimeStats,
        firstGameDate: new Date(parsed.lifetimeStats.firstGameDate),
        lastGameDate: new Date(parsed.lifetimeStats.lastGameDate)
      },
      trophyCollection: parsed.trophyCollection.map((trophy: any) => ({
        ...trophy,
        earnedAt: new Date(trophy.earnedAt)
      })),
      badges: parsed.badges.map((badge: any) => ({
        ...badge,
        earnedAt: new Date(badge.earnedAt)
      })),
      subredditStats: new Map(Object.entries(parsed.subredditStats || {}))
    };

    return profile;
  }

  private createGlobalProfile(userId: string): void {
    const globalProfile: GlobalProfile = {
      userId,
      totalMatches: 0,
      totalWins: 0,
      globalRanking: 0,
      subredditParticipation: [],
      lastSyncAt: new Date()
    };

    const globalKey = this.getGlobalProfileKey(userId);
    ProfileStorageService.globalProfiles.set(globalKey, JSON.stringify(globalProfile));
  }

  private addToProfileIndex(userId: string): void {
    try {
      if (!ProfileStorageService.profileIndex.includes(userId)) {
        ProfileStorageService.profileIndex.push(userId);
      }
    } catch (error) {
      console.error('Failed to update profile index:', error);
      // Don't throw - this is not critical for profile creation
    }
  }

  private removeFromProfileIndex(userId: string): void {
    try {
      ProfileStorageService.profileIndex = ProfileStorageService.profileIndex.filter(id => id !== userId);
    } catch (error) {
      console.error('Failed to update profile index:', error);
      // Don't throw - this is not critical for profile deletion
    }
  }
}