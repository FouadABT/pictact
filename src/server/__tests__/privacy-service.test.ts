import { PrivacyService, DataType, UserRole } from '../core/privacy-service';
import { UserProfile, PrivacySettings, AnonymousProfile } from '../../shared/types/profile';

describe('PrivacyService', () => {
  let privacyService: PrivacyService;

  beforeEach(() => {
    jest.clearAllMocks();
    privacyService = new PrivacyService();
  });

  // Helper function to create a mock user profile
  const createMockProfile = (privacySettings?: Partial<PrivacySettings>): UserProfile => ({
    userId: 'user123',
    redditUsername: 'testuser',
    displayName: 'Test User',
    createdAt: new Date('2023-01-01'),
    lastActiveAt: new Date('2023-12-01'),
    lastProfileUpdate: new Date('2023-12-01'),
    preferences: {
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
        gameStartReminders: true,
        achievementAlerts: true,
        weeklyDigest: false,
        frequency: 'immediate'
      },
      gameSettings: {
        defaultDifficulty: 'medium',
        autoJoinEvents: false,
        showHints: true,
        preferredThemes: ['nature', 'architecture'],
        maxConcurrentGames: 3
      },
      accessibility: {
        reducedMotion: false,
        highContrast: false,
        largeText: false,
        screenReaderOptimized: false,
        colorBlindFriendly: false
      }
    },
    privacySettings: {
      profileVisibility: 'public',
      showLifetimeStats: true,
      showTrophies: true,
      showRecentActivity: true,
      showSubredditStats: true,
      allowDataExport: true,
      allowCrossSubredditTracking: true,
      allowAnonymousMode: false,
      ...privacySettings
    },
    lifetimeStats: {
      totalMatches: 100,
      totalWins: 75,
      totalPoints: 1500,
      averageSolveTime: 45.5,
      winRate: 0.75,
      averageRank: 5.2,
      bestStreak: 12,
      currentStreak: 3,
      favoriteThemes: ['nature', 'architecture'],
      mostActiveSubreddits: ['r/test', 'r/pictact'],
      totalPlayTime: 7200,
      firstGameDate: new Date('2023-01-01'),
      lastGameDate: new Date('2023-12-01')
    },
    trophyCollection: [
      {
        id: 'trophy1',
        name: 'First Win',
        description: 'Won your first match',
        category: 'achievement',
        rarity: 'common',
        earnedAt: new Date('2023-01-15')
      }
    ],
    badges: [
      {
        id: 'badge1',
        name: 'Speed Demon',
        description: 'Solved 10 matches in under 30 seconds',
        iconUrl: '/icons/speed-demon.png',
        earnedAt: new Date('2023-02-01')
      }
    ],
    subredditStats: new Map([
      ['r/test', {
        subredditName: 'r/test',
        joinedAt: new Date('2023-01-01'),
        lastActiveAt: new Date('2023-12-01'),
        matches: 50,
        wins: 35,
        points: 700,
        rank: 5,
        trophies: [],
        specialBadges: []
      }]
    ]),
    profileVersion: 1
  });

  describe('Data Filtering and Access Control', () => {
    describe('canViewData', () => {
      it('should allow owner to view all their own data', () => {
        const profile = createMockProfile();
        const dataTypes: DataType[] = ['profile', 'lifetimeStats', 'trophies', 'badges', 'subredditStats', 'recentActivity', 'displayName'];

        dataTypes.forEach(dataType => {
          const canView = privacyService.canViewData(profile.userId, profile.userId, dataType, profile.privacySettings);
          expect(canView).toBe(true);
        });
      });

      it('should respect profile visibility settings for public users', () => {
        const privateProfile = createMockProfile({ profileVisibility: 'private' });
        
        // Only display name should be visible for private profiles
        expect(privacyService.canViewData(privateProfile.userId, 'other_user', 'displayName', privateProfile.privacySettings)).toBe(true);
        expect(privacyService.canViewData(privateProfile.userId, 'other_user', 'profile', privateProfile.privacySettings)).toBe(false);
        expect(privacyService.canViewData(privateProfile.userId, 'other_user', 'lifetimeStats', privateProfile.privacySettings)).toBe(false);
      });

      it('should respect individual data visibility settings', () => {
        const profile = createMockProfile({
          profileVisibility: 'public',
          showLifetimeStats: false,
          showTrophies: false,
          showRecentActivity: false,
          showSubredditStats: false
        });

        expect(privacyService.canViewData(profile.userId, 'other_user', 'lifetimeStats', profile.privacySettings)).toBe(false);
        expect(privacyService.canViewData(profile.userId, 'other_user', 'trophies', profile.privacySettings)).toBe(false);
        expect(privacyService.canViewData(profile.userId, 'other_user', 'badges', profile.privacySettings)).toBe(false);
        expect(privacyService.canViewData(profile.userId, 'other_user', 'recentActivity', profile.privacySettings)).toBe(false);
        expect(privacyService.canViewData(profile.userId, 'other_user', 'subredditStats', profile.privacySettings)).toBe(false);
      });

      it('should handle anonymous viewers correctly', () => {
        const profile = createMockProfile({ profileVisibility: 'public' });
        
        // Anonymous users should be treated as public viewers
        expect(privacyService.canViewData(profile.userId, undefined, 'profile', profile.privacySettings)).toBe(true);
        expect(privacyService.canViewData(profile.userId, undefined, 'displayName', profile.privacySettings)).toBe(true);
      });

      it('should handle friends visibility setting', () => {
        const profile = createMockProfile({ profileVisibility: 'friends' });
        
        // Public users should not see friends-only profiles
        expect(privacyService.canViewData(profile.userId, 'other_user', 'profile', profile.privacySettings)).toBe(false);
        
        // In current implementation, all authenticated users are treated as 'public'
        // This test documents the current behavior
        expect(privacyService.canViewData(profile.userId, 'friend_user', 'profile', profile.privacySettings)).toBe(false);
      });
    });

    describe('getVisibleProfile', () => {
      it('should return full profile for owner', async () => {
        const profile = createMockProfile();
        
        const visibleProfile = await privacyService.getVisibleProfile(profile.userId, profile, profile.userId);
        
        expect(visibleProfile.userId).toBe(profile.userId);
        expect(visibleProfile.displayName).toBe(profile.displayName);
        expect(visibleProfile.lifetimeStats).toBeDefined();
        expect(visibleProfile.trophyCollection).toBeDefined();
        expect(visibleProfile.badges).toBeDefined();
        expect(visibleProfile.subredditStats).toBeDefined();
      });

      it('should return filtered profile for public viewers', async () => {
        const profile = createMockProfile({
          profileVisibility: 'public',
          showLifetimeStats: false,
          showTrophies: false
        });
        
        const visibleProfile = await privacyService.getVisibleProfile(profile.userId, profile, 'other_user');
        
        expect(visibleProfile.userId).toBe(profile.userId);
        expect(visibleProfile.displayName).toBe(profile.displayName);
        expect(visibleProfile.lifetimeStats).toBeUndefined();
        expect(visibleProfile.trophyCollection).toBeUndefined();
        expect(visibleProfile.badges).toBeUndefined();
      });

      it('should return minimal profile for private profiles viewed by others', async () => {
        const profile = createMockProfile({ profileVisibility: 'private' });
        
        const visibleProfile = await privacyService.getVisibleProfile(profile.userId, profile, 'other_user');
        
        expect(visibleProfile.userId).toBe(profile.userId);
        expect(visibleProfile.displayName).toBe(profile.displayName);
        expect(visibleProfile.joinedAt).toBeDefined();
        expect(visibleProfile.lifetimeStats).toBeUndefined();
        expect(visibleProfile.trophyCollection).toBeUndefined();
        expect(visibleProfile.badges).toBeUndefined();
        expect(visibleProfile.subredditStats).toBeUndefined();
      });

      it('should handle anonymous viewers', async () => {
        const profile = createMockProfile({ profileVisibility: 'public' });
        
        const visibleProfile = await privacyService.getVisibleProfile(profile.userId, profile);
        
        expect(visibleProfile.userId).toBe(profile.userId);
        expect(visibleProfile.displayName).toBe(profile.displayName);
        expect(visibleProfile.lifetimeStats).toBeDefined();
      });
    });

    describe('Data Filtering Methods', () => {
      it('should filter lifetime stats based on permissions', () => {
        const stats = {
          totalMatches: 100,
          totalWins: 75,
          totalPoints: 1500,
          averageSolveTime: 45.5,
          winRate: 0.75,
          averageRank: 5.2,
          bestStreak: 12,
          currentStreak: 3,
          favoriteThemes: ['nature'],
          mostActiveSubreddits: ['r/test'],
          totalPlayTime: 7200,
          firstGameDate: new Date('2023-01-01'),
          lastGameDate: new Date('2023-12-01')
        };

        expect(privacyService.filterLifetimeStats(stats, true)).toEqual(stats);
        expect(privacyService.filterLifetimeStats(stats, false)).toBeUndefined();
      });

      it('should filter trophies based on permissions', () => {
        const trophies = [
          {
            id: 'trophy1',
            name: 'First Win',
            description: 'Won your first match',
            category: 'achievement' as const,
            rarity: 'common' as const,
            earnedAt: new Date('2023-01-15')
          }
        ];

        expect(privacyService.filterTrophies(trophies, true)).toEqual(trophies);
        expect(privacyService.filterTrophies(trophies, false)).toBeUndefined();
      });

      it('should filter badges based on permissions', () => {
        const badges = [
          {
            id: 'badge1',
            name: 'Speed Demon',
            description: 'Fast solver',
            iconUrl: '/icons/speed.png',
            earnedAt: new Date('2023-02-01')
          }
        ];

        expect(privacyService.filterBadges(badges, true)).toEqual(badges);
        expect(privacyService.filterBadges(badges, false)).toBeUndefined();
      });

      it('should filter subreddit stats based on permissions', () => {
        const subredditStats = new Map([
          ['r/test', {
            subredditName: 'r/test',
            joinedAt: new Date('2023-01-01'),
            lastActiveAt: new Date('2023-12-01'),
            matches: 50,
            wins: 35,
            points: 700,
            rank: 5,
            trophies: [],
            specialBadges: []
          }]
        ]);

        const filtered = privacyService.filterSubredditStats(subredditStats, true);
        expect(filtered).toBeDefined();
        expect(filtered!.get('r/test')).toEqual(subredditStats.get('r/test'));

        expect(privacyService.filterSubredditStats(subredditStats, false)).toBeUndefined();
      });
    });
  });

  describe('Privacy Settings Management', () => {
    describe('updatePrivacySettings', () => {
      it('should validate and update privacy settings', async () => {
        const newSettings = {
          profileVisibility: 'private' as const,
          showLifetimeStats: false,
          showTrophies: true
        };

        const result = await privacyService.updatePrivacySettings('user123', newSettings);

        expect(result.profileVisibility).toBe('private');
        expect(result.showLifetimeStats).toBe(false);
        expect(result.showTrophies).toBe(true);
      });

      it('should reject invalid privacy settings', async () => {
        const invalidSettings = {
          profileVisibility: 'invalid' as any,
          showLifetimeStats: 'not_boolean' as any
        };

        const result = await privacyService.updatePrivacySettings('user123', invalidSettings);

        expect(result.profileVisibility).toBeUndefined();
        expect(result.showLifetimeStats).toBeUndefined();
      });
    });

    describe('validatePrivacySettings', () => {
      it('should validate profile visibility options', () => {
        const validSettings = { profileVisibility: 'public' as const };
        const invalidSettings = { profileVisibility: 'invalid' as any };

        expect(privacyService.validatePrivacySettings(validSettings).profileVisibility).toBe('public');
        expect(privacyService.validatePrivacySettings(invalidSettings).profileVisibility).toBeUndefined();
      });

      it('should validate boolean settings', () => {
        const validSettings = {
          showLifetimeStats: true,
          showTrophies: false,
          allowDataExport: true
        };

        const invalidSettings = {
          showLifetimeStats: 'yes' as any,
          showTrophies: 1 as any,
          allowDataExport: null as any
        };

        const validResult = privacyService.validatePrivacySettings(validSettings);
        expect(validResult.showLifetimeStats).toBe(true);
        expect(validResult.showTrophies).toBe(false);
        expect(validResult.allowDataExport).toBe(true);

        const invalidResult = privacyService.validatePrivacySettings(invalidSettings);
        expect(invalidResult.showLifetimeStats).toBeUndefined();
        expect(invalidResult.showTrophies).toBeUndefined();
        expect(invalidResult.allowDataExport).toBeUndefined();
      });
    });

    describe('getDefaultPrivacySettings', () => {
      it('should return secure default privacy settings', () => {
        const defaults = privacyService.getDefaultPrivacySettings();

        expect(defaults.profileVisibility).toBe('public');
        expect(defaults.showLifetimeStats).toBe(true);
        expect(defaults.showTrophies).toBe(true);
        expect(defaults.showRecentActivity).toBe(true);
        expect(defaults.showSubredditStats).toBe(true);
        expect(defaults.allowDataExport).toBe(true);
        expect(defaults.allowCrossSubredditTracking).toBe(true);
        expect(defaults.allowAnonymousMode).toBe(false);
      });
    });
  });

  describe('Anonymous Mode Functionality', () => {
    describe('Anonymous Profile Management', () => {
      it('should create anonymous profile with unique session ID', () => {
        const anonymousProfile = privacyService.createAnonymousProfile();

        expect(anonymousProfile.sessionId).toBeDefined();
        expect(anonymousProfile.sessionId).toMatch(/^anon_/);
        expect(anonymousProfile.temporaryStats).toEqual({
          sessionMatches: 0,
          sessionWins: 0,
          sessionPoints: 0
        });
        expect(anonymousProfile.createdAt).toBeInstanceOf(Date);
      });

      it('should create anonymous profile with custom session ID', () => {
        const customSessionId = 'custom_session_123';
        const anonymousProfile = privacyService.createAnonymousProfile(customSessionId);

        expect(anonymousProfile.sessionId).toBe(customSessionId);
      });

      it('should retrieve anonymous session by ID', () => {
        const anonymousProfile = privacyService.createAnonymousProfile();
        const sessionId = anonymousProfile.sessionId;

        const retrievedSession = privacyService.getAnonymousSession(sessionId);

        expect(retrievedSession).toEqual(anonymousProfile);
      });

      it('should return null for non-existent anonymous session', () => {
        const nonExistentSession = privacyService.getAnonymousSession('non_existent_session');

        expect(nonExistentSession).toBeNull();
      });
    });

    describe('Anonymous Statistics Management', () => {
      it('should update anonymous session statistics', () => {
        const anonymousProfile = privacyService.createAnonymousProfile();
        const sessionId = anonymousProfile.sessionId;

        const updatedProfile = privacyService.updateAnonymousStats(sessionId, {
          matchesPlayed: 3,
          wins: 2,
          points: 150
        });

        expect(updatedProfile).toBeDefined();
        expect(updatedProfile!.temporaryStats.sessionMatches).toBe(3);
        expect(updatedProfile!.temporaryStats.sessionWins).toBe(2);
        expect(updatedProfile!.temporaryStats.sessionPoints).toBe(150);
      });

      it('should accumulate anonymous statistics over multiple updates', () => {
        const anonymousProfile = privacyService.createAnonymousProfile();
        const sessionId = anonymousProfile.sessionId;

        // First update
        privacyService.updateAnonymousStats(sessionId, {
          matchesPlayed: 2,
          wins: 1,
          points: 50
        });

        // Second update
        const finalProfile = privacyService.updateAnonymousStats(sessionId, {
          matchesPlayed: 1,
          wins: 1,
          points: 75
        });

        expect(finalProfile!.temporaryStats.sessionMatches).toBe(3);
        expect(finalProfile!.temporaryStats.sessionWins).toBe(2);
        expect(finalProfile!.temporaryStats.sessionPoints).toBe(125);
      });

      it('should record anonymous match results', () => {
        const anonymousProfile = privacyService.createAnonymousProfile();
        const sessionId = anonymousProfile.sessionId;

        const updatedProfile = privacyService.recordAnonymousMatchResult(sessionId, {
          won: true,
          points: 100
        });

        expect(updatedProfile!.temporaryStats.sessionMatches).toBe(1);
        expect(updatedProfile!.temporaryStats.sessionWins).toBe(1);
        expect(updatedProfile!.temporaryStats.sessionPoints).toBe(100);
      });

      it('should handle anonymous match losses', () => {
        const anonymousProfile = privacyService.createAnonymousProfile();
        const sessionId = anonymousProfile.sessionId;

        const updatedProfile = privacyService.recordAnonymousMatchResult(sessionId, {
          won: false,
          points: 10
        });

        expect(updatedProfile!.temporaryStats.sessionMatches).toBe(1);
        expect(updatedProfile!.temporaryStats.sessionWins).toBe(0);
        expect(updatedProfile!.temporaryStats.sessionPoints).toBe(10);
      });
    });

    describe('Anonymous Session Management', () => {
      it('should identify anonymous sessions correctly', () => {
        const anonymousProfile = privacyService.createAnonymousProfile();
        const sessionId = anonymousProfile.sessionId;

        expect(privacyService.isAnonymousSession(sessionId)).toBe(true);
        expect(privacyService.isAnonymousSession('regular_session_id')).toBe(false);
        expect(privacyService.isAnonymousSession('anon_prefix_test')).toBe(true);
      });

      it('should delete anonymous sessions', () => {
        const anonymousProfile = privacyService.createAnonymousProfile();
        const sessionId = anonymousProfile.sessionId;

        // Verify session exists
        expect(privacyService.getAnonymousSession(sessionId)).toBeDefined();

        // Delete session
        privacyService.deleteAnonymousSession(sessionId);

        // Verify session is deleted
        expect(privacyService.getAnonymousSession(sessionId)).toBeNull();
      });

      it('should convert anonymous session to authenticated data', () => {
        const anonymousProfile = privacyService.createAnonymousProfile();
        const sessionId = anonymousProfile.sessionId;

        // Add some statistics
        privacyService.updateAnonymousStats(sessionId, {
          matchesPlayed: 5,
          wins: 3,
          points: 250
        });

        const conversionData = privacyService.convertAnonymousToAuthenticated(sessionId);

        expect(conversionData).toEqual({
          matches: 5,
          wins: 3,
          points: 250
        });

        // Session should be deleted after conversion
        expect(privacyService.getAnonymousSession(sessionId)).toBeNull();
      });

      it('should return null when converting non-existent anonymous session', () => {
        const conversionData = privacyService.convertAnonymousToAuthenticated('non_existent_session');

        expect(conversionData).toBeNull();
      });
    });

    describe('Anonymous Mode Settings', () => {
      it('should check if anonymous mode is enabled', () => {
        const enabledSettings = { allowAnonymousMode: true } as PrivacySettings;
        const disabledSettings = { allowAnonymousMode: false } as PrivacySettings;

        expect(privacyService.isAnonymousModeEnabled(enabledSettings)).toBe(true);
        expect(privacyService.isAnonymousModeEnabled(disabledSettings)).toBe(false);
      });
    });
  });

  describe('Profile Anonymization', () => {
    it('should create anonymized profile for deleted users', () => {
      const profile = createMockProfile();
      
      const anonymizedProfile = privacyService.anonymizeProfile(profile);

      expect(anonymizedProfile.sessionId).toMatch(/^anonymous_/);
      expect(anonymizedProfile.temporaryStats).toEqual({
        sessionMatches: 0,
        sessionWins: 0,
        sessionPoints: 0
      });
      expect(anonymizedProfile.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique anonymized profiles', () => {
      const profile = createMockProfile();
      
      const anonymized1 = privacyService.anonymizeProfile(profile);
      const anonymized2 = privacyService.anonymizeProfile(profile);

      expect(anonymized1.sessionId).not.toBe(anonymized2.sessionId);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined privacy settings gracefully', () => {
      const profile = createMockProfile();
      
      // Test with undefined viewerId
      expect(() => privacyService.canViewData(profile.userId, undefined, 'profile', profile.privacySettings)).not.toThrow();
      
      // Test with empty privacy settings
      const emptySettings = {} as PrivacySettings;
      expect(() => privacyService.canViewData(profile.userId, 'viewer', 'profile', emptySettings)).not.toThrow();
    });

    it('should handle invalid data types gracefully', () => {
      const profile = createMockProfile();
      
      const result = privacyService.canViewData(profile.userId, 'viewer', 'invalid_type' as DataType, profile.privacySettings);
      expect(result).toBe(false);
    });

    it('should handle operations on non-existent anonymous sessions', () => {
      const nonExistentSessionId = 'non_existent_session';

      expect(privacyService.updateAnonymousStats(nonExistentSessionId, { points: 100 })).toBeNull();
      expect(privacyService.recordAnonymousMatchResult(nonExistentSessionId, { won: true, points: 100 })).toBeNull();
      expect(() => privacyService.deleteAnonymousSession(nonExistentSessionId)).not.toThrow();
    });

    it('should handle concurrent anonymous session operations', () => {
      const anonymousProfile = privacyService.createAnonymousProfile();
      const sessionId = anonymousProfile.sessionId;

      // Simulate concurrent updates
      const updates = [
        { matchesPlayed: 1, points: 50 },
        { matchesPlayed: 1, points: 75 },
        { matchesPlayed: 1, points: 100 }
      ];

      updates.forEach(update => {
        privacyService.updateAnonymousStats(sessionId, update);
      });

      const finalSession = privacyService.getAnonymousSession(sessionId);
      expect(finalSession!.temporaryStats.sessionMatches).toBe(3);
      expect(finalSession!.temporaryStats.sessionPoints).toBe(225);
    });
  });
});