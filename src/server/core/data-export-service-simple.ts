// Reddit Devvit compliant data export service for user profile data
// 
// REDDIT COMPLIANCE NOTES:
// - Only exports app-specific data (game statistics, achievements, preferences)
// - Does not export Reddit user identifiers or personal information
// - Respects user privacy settings and Reddit's data policies
// - Provides audit logging for data export activities
// - Requires explicit user consent for personal data inclusion

import { ProfileStorageService } from "./profile-storage.js";
import { 
  UserProfile, 
  ProfileExport
} from "../../shared/types/profile.js";

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
}

/**
 * Reddit Devvit Compliant Data Export Service
 * 
 * This service handles exporting user profile data while maintaining compliance
 * with Reddit's Developer Platform policies and data protection requirements.
 * 
 * Key compliance features:
 * - Only exports app-specific data (not Reddit user data)
 * - Requires explicit user consent for personal data
 * - Provides audit logging for all export activities
 * - Respects user privacy settings
 * - Sanitizes Reddit identifiers from exports
 */
export class DataExportService {
  private storage: ProfileStorageService;

  constructor() {
    this.storage = new ProfileStorageService();
  }

  /**
   * Export complete user profile data in JSON format
   * Reddit Devvit compliant - only exports app-specific data, not Reddit user data
   */
  async exportUserData(userId: string, options: ExportOptions): Promise<ProfileExport> {
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

      // Filter profile data to comply with Reddit's data policies
      const filteredProfile = this.filterProfileData(profile, options);

      // Create export data - only app-specific data, not Reddit user data
      const exportData: ProfileExport = {
        exportedAt: new Date(),
        exportVersion: '1.0',
        userData: {
          profile: filteredProfile,
          matchHistory: [], // Will be populated when match system is implemented
          achievements: options.includeTrophies ? profile.trophyCollection : [],
          badges: options.includeTrophies ? profile.badges : []
        },
        metadata: {
          totalDataSize: 0, // Will be calculated after serialization
          exportFormat: 'json',
          includesPersonalData: options.includePersonalData || false,
          dataSource: 'PicTact App', // Clearly identify this as app data
          redditCompliant: true,
          disclaimer: 'This export contains only PicTact app-specific data. Reddit user data is not included.'
        }
      };

      // Calculate total data size
      const serialized = JSON.stringify(exportData);
      exportData.metadata.totalDataSize = serialized.length;

      // Log export for audit trail (Reddit compliance requirement)
      console.log(`Data export generated for user ${userId}, size: ${exportData.metadata.totalDataSize} bytes`);

      return exportData;
    } catch (error) {
      console.error(`Failed to export data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Filter profile data based on export options and Reddit compliance
   */
  private filterProfileData(profile: UserProfile, options: ExportOptions): UserProfile {
    const filteredProfile = { ...profile };

    // Always remove Reddit-specific identifiers for privacy compliance
    // Keep only app-specific data
    filteredProfile.userId = 'redacted'; // Don't export actual Reddit user ID
    
    // Remove personal data if not explicitly requested
    if (!options.includePersonalData) {
      delete filteredProfile.displayName;
      filteredProfile.preferences = {
        notifications: { 
          ...filteredProfile.preferences.notifications, 
          emailNotifications: false // Never export email preferences
        },
        gameSettings: filteredProfile.preferences.gameSettings,
        accessibility: filteredProfile.preferences.accessibility
      };
    } else {
      // Even when personal data is requested, sanitize sensitive information
      filteredProfile.preferences.notifications.emailNotifications = false;
    }

    // Always remove any potentially sensitive Reddit-specific data
    // Keep only game-related statistics and achievements
    return {
      ...filteredProfile,
      // Ensure we only export app-specific game data
      redditUsername: 'redacted', // Don't export actual Reddit username
      userId: 'redacted' // Don't export actual Reddit user ID
    };
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
  async getExportSizeEstimate(userId: string, _options: ExportOptions): Promise<number> {
    try {
      const profile = await this.storage.getProfile(userId);
      if (!profile) {
        return 0;
      }

      // Rough size estimation based on profile data
      return JSON.stringify(profile).length;
    } catch (error) {
      console.error(`Error estimating export size for user ${userId}:`, error);
      return 0;
    }
  }
}