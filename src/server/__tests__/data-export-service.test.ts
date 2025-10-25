// Data export service tests

import { DataExportService, ExportOptions } from '../core/data-export-service-simple.js';
import { UserProfile, LifetimeStatistics, Trophy, Badge, PrivacySettings, UserPreferences } from '../../shared/types/profile.js';

// Mock the dependencies
jest.mock('../core/profile-storage.js', () => ({
  ProfileStorageService: jest.fn().mockImplementation(() => ({
    getProfile: jest.fn(),
  }))
}));

jest.mock('../core/cross-subreddit-manager.js', () => ({
  CrossSubredditManager: jest.fn().mockImplementation(() => ({
    getGlobalProfile: jest.fn(),
  }))
}));

describe('DataExportService', () => {
  let dataExportService: DataExportService;
  let mockProfile: UserProfile;

  beforeEach(() => {
    dataExportService = new DataExportService();
    
    // Create mock profile data
    const mockStats: LifetimeStatistics = {
      totalMatches: 50,
      totalWins: 30,
      totalPoints: 1500,
      averageSolveTime: 45.5,
      winRate: 0.6,
      averageRank: 2.5,
      bestStreak: 8,
      currentStreak: 3,
      favoriteThemes: ['nature', 'architecture'],
      mostActiveSubreddits: ['r/photography', 'r/earthporn'],
      totalPlayTime: 120,
      firstGameDate: new Date('2024-01-01'),
      lastGameDate: new Date('2024-10-15')
    };

    const mockTrophy: Trophy = {
      id: 'trophy-1',
      name: 'First Win',
      description: 'Won your first match',
      category: 'milestone',
      rarity: 'common',
      earnedAt: new Date('2024-01-02'),
      subredditEarned: 'photography'
    };

    const mockBadge: Badge = {
      id: 'badge-1',
      name: 'Quick Finder',
      description: 'Found image in under 30 seconds',
      earnedAt: new Date('2024-01-05'),
      level: 1
    };

    const mockPrivacySettings: PrivacySettings = {
      profileVisibility: 'public',
      showLifetimeStats: true,
      showTrophies: true,
      showRecentActivity: true,
      showSubredditStats: true,
      allowDataExport: true,
      allowCrossSubredditTracking: true,
      allowAnonymousMode: false
    };

    const mockPreferences: UserPreferences = {
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
        preferredThemes: ['nature'],
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

    mockProfile = {
      userId: 'user123',
      redditUsername: 'testuser',
      displayName: 'Test User',
      createdAt: new Date('2024-01-01'),
      lastActiveAt: new Date('2024-10-15'),
      lastProfileUpdate: new Date('2024-10-15'),
      preferences: mockPreferences,
      privacySettings: mockPrivacySettings,
      lifetimeStats: mockStats,
      trophyCollection: [mockTrophy],
      badges: [mockBadge],
      subredditStats: new Map(),
      profileVersion: 1
    };
  });

  describe('validateExportRequest', () => {
    it('should validate a valid export request', async () => {
      // Mock storage to return profile
      const mockStorage = (dataExportService as any).storage;
      mockStorage.getProfile.mockResolvedValue(mockProfile);

      const options: ExportOptions = {
        format: 'json',
        includePersonalData: true
      };

      const result = await dataExportService.validateExportRequest('user123', options);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject export when user disables data export', async () => {
      // Mock profile with data export disabled
      const profileWithoutExport = {
        ...mockProfile,
        privacySettings: {
          ...mockProfile.privacySettings,
          allowDataExport: false
        }
      };

      const mockStorage = (dataExportService as any).storage;
      mockStorage.getProfile.mockResolvedValue(profileWithoutExport);

      const options: ExportOptions = {
        format: 'json'
      };

      const result = await dataExportService.validateExportRequest('user123', options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User has disabled data export');
    });

    it('should reject export for non-existent user', async () => {
      const mockStorage = (dataExportService as any).storage;
      mockStorage.getProfile.mockResolvedValue(null);

      const options: ExportOptions = {
        format: 'json'
      };

      const result = await dataExportService.validateExportRequest('nonexistent', options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User profile not found');
    });

    it('should validate invalid format correctly', async () => {
      const mockStorage = (dataExportService as any).storage;
      mockStorage.getProfile.mockResolvedValue(mockProfile);

      const options: ExportOptions = {
        format: 'invalid' as any
      };

      const result = await dataExportService.validateExportRequest('user123', options);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid export format specified');
    });
  });

  describe('getExportSizeEstimate', () => {
    it('should estimate export size', async () => {
      const mockStorage = (dataExportService as any).storage;
      mockStorage.getProfile.mockResolvedValue(mockProfile);

      const options: ExportOptions = {
        format: 'json',
        includePersonalData: true
      };

      const size = await dataExportService.getExportSizeEstimate('user123', options);
      
      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it('should return 0 for non-existent user', async () => {
      const mockStorage = (dataExportService as any).storage;
      mockStorage.getProfile.mockResolvedValue(null);

      const options: ExportOptions = {
        format: 'json'
      };

      const size = await dataExportService.getExportSizeEstimate('nonexistent', options);
      
      expect(size).toBe(0);
    });
  });

  describe('exportUserData', () => {
    it('should export user data in JSON format', async () => {
      const mockStorage = (dataExportService as any).storage;
      mockStorage.getProfile.mockResolvedValue(mockProfile);

      const options: ExportOptions = {
        format: 'json',
        includePersonalData: true,
        includeTrophies: true
      };

      const result = await dataExportService.exportUserData('user123', options);
      
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('exportVersion');
      expect(result).toHaveProperty('userData');
      expect(result).toHaveProperty('metadata');
      
      const exportData = result as any;
      expect(exportData.userData.profile.userId).toBe('redacted'); // Reddit compliance - user IDs are redacted
      expect(exportData.userData.achievements).toHaveLength(1);
      expect(exportData.metadata.exportFormat).toBe('json');
      expect(exportData.metadata.redditCompliant).toBe(true);
      expect(exportData.metadata.dataSource).toBe('PicTact App');
    });

    it('should export user data in JSON format only (simplified version)', async () => {
      const mockStorage = (dataExportService as any).storage;
      mockStorage.getProfile.mockResolvedValue(mockProfile);

      const options: ExportOptions = {
        format: 'json',
        includePersonalData: true,
        includeTrophies: true
      };

      const result = await dataExportService.exportUserData('user123', options);
      
      expect(result).toHaveProperty('exportedAt');
      expect(result).toHaveProperty('exportVersion');
      expect(result).toHaveProperty('userData');
      expect(result).toHaveProperty('metadata');
      
      const exportData = result as any;
      expect(exportData.userData.profile.userId).toBe('redacted'); // Reddit compliance - user IDs are redacted
      expect(exportData.userData.profile.redditUsername).toBe('redacted'); // Reddit compliance - usernames are redacted
      expect(exportData.userData.achievements).toHaveLength(1);
      expect(exportData.metadata.exportFormat).toBe('json');
      expect(exportData.metadata.redditCompliant).toBe(true);
    });

    it('should throw error when user disables data export', async () => {
      const profileWithoutExport = {
        ...mockProfile,
        privacySettings: {
          ...mockProfile.privacySettings,
          allowDataExport: false
        }
      };

      const mockStorage = (dataExportService as any).storage;
      mockStorage.getProfile.mockResolvedValue(profileWithoutExport);

      const options: ExportOptions = {
        format: 'json'
      };

      await expect(dataExportService.exportUserData('user123', options))
        .rejects.toThrow('User has disabled data export');
    });

    it('should throw error for non-existent user', async () => {
      const mockStorage = (dataExportService as any).storage;
      mockStorage.getProfile.mockResolvedValue(null);

      const options: ExportOptions = {
        format: 'json'
      };

      await expect(dataExportService.exportUserData('nonexistent', options))
        .rejects.toThrow('Profile not found for user: nonexistent');
    });
  });
});