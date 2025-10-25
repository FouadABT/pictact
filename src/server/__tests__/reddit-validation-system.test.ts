import { 
  RedditValidationSystem, 
  EnhancedValidationResult, 
  ValidationConfig, 
  ModeratorOverrideRequest 
} from '../core/reddit-validation-system';
import { RedditComplianceService } from '../core/reddit-compliance-service';
import { RedditContentPolicyService } from '../core/reddit-content-policy-service';
import { RedditModerationService } from '../core/reddit-moderation-service';
import { DevvitContext, ContentValidation, ContentPolicyCheck } from '../../shared/types/reddit-compliance';

// Mock the dependencies
jest.mock('../core/reddit-compliance-service');
jest.mock('../core/reddit-content-policy-service');
jest.mock('../core/reddit-moderation-service');

describe('RedditValidationSystem', () => {
  let validationSystem: RedditValidationSystem;
  let mockComplianceService: jest.Mocked<RedditComplianceService>;
  let mockContentPolicyService: jest.Mocked<RedditContentPolicyService>;
  let mockModerationService: jest.Mocked<RedditModerationService>;

  const mockContext: DevvitContext = {
    postId: 'test_post_123',
    subreddit: 'test_subreddit',
    userId: 'test_user_123',
    moderatorPermissions: {
      canManagePosts: true,
      canManageComments: true,
      canManageUsers: true,
      canManageSettings: true,
      canViewModLog: true
    }
  };

  const mockValidationConfig: ValidationConfig = {
    enableRedditContentScanning: true,
    enableCommunityGuidelinesCheck: true,
    enableModeratorOverride: true,
    strictMode: false,
    customRules: ['no spam', 'be respectful'],
    subredditSpecificRules: new Map([
      ['test_subreddit', ['no memes', 'original content only']]
    ])
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mocked instances
    mockComplianceService = new RedditComplianceService() as jest.Mocked<RedditComplianceService>;
    mockContentPolicyService = new RedditContentPolicyService() as jest.Mocked<RedditContentPolicyService>;
    mockModerationService = new RedditModerationService() as jest.Mocked<RedditModerationService>;

    // Create validation system with test config
    validationSystem = new RedditValidationSystem(mockValidationConfig);

    // Replace the private services with mocks
    (validationSystem as any).complianceService = mockComplianceService;
    (validationSystem as any).contentPolicyService = mockContentPolicyService;
    (validationSystem as any).moderationService = mockModerationService;
  });

  describe('validateContentWithRedditScanning', () => {
    const testContent = 'This is a test submission for the photo contest.';

    it('should validate content with Reddit content scanning integration', async () => {
      // Mock basic validation
      const mockBasicValidation: ContentValidation = {
        isValid: true,
        isNSFW: false,
        contentWarnings: [],
        violatesPolicy: false,
        moderationRequired: false
      };

      mockComplianceService.validateContent.mockResolvedValue({
        success: true,
        data: mockBasicValidation
      });

      // Mock content policy check
      const mockPolicyCheck: ContentValidation = {
        isValid: true,
        isNSFW: false,
        contentWarnings: [],
        violatesPolicy: false,
        moderationRequired: false
      };

      mockContentPolicyService.validateContent.mockResolvedValue({
        success: true,
        data: mockPolicyCheck
      });

      // Mock subreddit permissions
      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      // Execute validation
      const result = await validationSystem.validateContentWithRedditScanning(testContent, mockContext);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.isValid).toBe(true);
        expect(result.data.isNSFW).toBe(false);
        expect(result.data.redditScanResult).toBeDefined();
        expect(result.data.communityGuidelines).toBeDefined();
        expect(result.data.moderatorOverride).toBeDefined();
        expect(result.data.validationMetadata).toBeDefined();
        
        // Check Reddit scan results
        expect(result.data.redditScanResult?.spamScore).toBeGreaterThanOrEqual(0);
        expect(result.data.redditScanResult?.toxicityScore).toBeGreaterThanOrEqual(0);
        expect(result.data.redditScanResult?.nsfwConfidence).toBeGreaterThanOrEqual(0);
        
        // Check community guidelines
        expect(result.data.communityGuidelines.violatesGuidelines).toBe(false);
        expect(result.data.communityGuidelines.severityLevel).toBe('low');
        
        // Check validation metadata
        expect(result.data.validationMetadata.validationMethod).toBe('automatic');
        expect(result.data.validationMetadata.confidenceScore).toBeGreaterThan(0);
      }

      // Verify service calls
      expect(mockComplianceService.validateContent).toHaveBeenCalledWith(testContent, mockContext.subreddit);
      expect(mockContentPolicyService.validateContent).toHaveBeenCalledWith(
        expect.any(String),
        'comment',
        testContent,
        mockContext
      );
      expect(mockComplianceService.validateSubredditPermissions).toHaveBeenCalledWith(
        mockContext.subreddit,
        'manage_comments'
      );
    });

    it('should detect spam content through Reddit scanning', async () => {
      const spamContent = 'BUY NOW BUY NOW BUY NOW CLICK HERE CLICK HERE CLICK HERE!!!';

      mockComplianceService.validateContent.mockResolvedValue({
        success: true,
        data: {
          isValid: true,
          isNSFW: false,
          contentWarnings: [],
          violatesPolicy: false,
          moderationRequired: false
        }
      });

      mockContentPolicyService.validateContent.mockResolvedValue({
        success: true,
        data: {
          isValid: false,
          isNSFW: false,
          contentWarnings: ['Spam detected'],
          violatesPolicy: true,
          moderationRequired: true,
          violations: [
            {
              type: 'spam',
              severity: 'high',
              description: 'Repetitive promotional content detected',
              rule: 'No spam or excessive self-promotion',
              autoModAction: 'remove'
            }
          ]
        } as any
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      const result = await validationSystem.validateContentWithRedditScanning(spamContent, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        // Should be marked as invalid due to spam detection
        expect(result.data.isValid).toBe(false);
        expect(result.data.communityGuidelines.violatesGuidelines).toBe(true);
        expect(result.data.communityGuidelines.severityLevel).toBe('high');
        expect(result.data.communityGuidelines.autoModAction).toBe('remove');
        expect(result.data.redditScanResult?.spamScore).toBeGreaterThan(0.5);
        expect(result.data.validationMetadata.requiresHumanReview).toBe(true);
      }
    });

    it('should detect NSFW content through Reddit scanning', async () => {
      const nsfwContent = 'This is explicit adult content that should be flagged as NSFW.';

      mockComplianceService.validateContent.mockResolvedValue({
        success: true,
        data: {
          isValid: true,
          isNSFW: true,
          contentWarnings: ['NSFW content detected'],
          violatesPolicy: false,
          moderationRequired: true
        }
      });

      mockContentPolicyService.validateContent.mockResolvedValue({
        success: true,
        data: {
          isValid: true,
          isNSFW: true,
          contentWarnings: ['NSFW content detected'],
          violatesPolicy: false,
          moderationRequired: true
        }
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      const result = await validationSystem.validateContentWithRedditScanning(nsfwContent, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.isNSFW).toBe(true);
        expect(result.data.contentWarnings).toContain('NSFW content detected');
        expect(result.data.redditScanResult?.nsfwConfidence).toBeGreaterThan(0);
        expect(result.data.moderationRequired).toBe(true);
      }
    });

    it('should handle subreddit-specific rule violations', async () => {
      const memeContent = 'This is a funny meme that violates subreddit rules.';

      mockComplianceService.validateContent.mockResolvedValue({
        success: true,
        data: {
          isValid: true,
          isNSFW: false,
          contentWarnings: [],
          violatesPolicy: false,
          moderationRequired: false
        }
      });

      mockContentPolicyService.validateContent.mockResolvedValue({
        success: true,
        data: {
          isValid: true,
          isNSFW: false,
          contentWarnings: [],
          violatesPolicy: false,
          moderationRequired: false
        }
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      const result = await validationSystem.validateContentWithRedditScanning(memeContent, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        // Should detect subreddit-specific rule violation
        expect(result.data.communityGuidelines.violationReasons).toContain(
          expect.stringContaining('Subreddit rule violation: no memes')
        );
      }
    });

    it('should fail when basic validation fails', async () => {
      mockComplianceService.validateContent.mockResolvedValue({
        success: false,
        error: 'Basic validation failed'
      });

      const result = await validationSystem.validateContentWithRedditScanning(testContent, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Basic validation failed');
    });
  });

  describe('processModeratorOverride', () => {
    const mockOverrideRequest: ModeratorOverrideRequest = {
      contentId: 'test_content_123',
      moderatorId: 'mod_user_456',
      overrideReason: 'Content is acceptable despite automated flagging',
      newValidationStatus: true,
      additionalNotes: 'Reviewed manually and approved'
    };

    beforeEach(async () => {
      // Set up a cached validation result
      const mockValidationResult: EnhancedValidationResult = {
        isValid: false,
        isNSFW: false,
        contentWarnings: ['Flagged by automated system'],
        violatesPolicy: true,
        moderationRequired: true,
        redditScanResult: {
          spamScore: 0.8,
          toxicityScore: 0.2,
          nsfwConfidence: 0.1,
          violationTypes: ['spam']
        },
        communityGuidelines: {
          violatesGuidelines: true,
          violationReasons: ['Potential spam detected'],
          severityLevel: 'medium',
          autoModAction: 'flag'
        },
        moderatorOverride: {
          canOverride: true
        },
        validationMetadata: {
          validatedAt: new Date(),
          validationMethod: 'automatic',
          confidenceScore: 0.4,
          requiresHumanReview: true
        }
      };

      // Cache the validation result
      (validationSystem as any).validationCache.set(mockOverrideRequest.contentId, mockValidationResult);
    });

    it('should process moderator override successfully', async () => {
      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      const result = await validationSystem.processModeratorOverride(mockOverrideRequest, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.isValid).toBe(true); // Overridden to valid
        expect(result.data.moderationRequired).toBe(false); // No longer requires moderation
        expect(result.data.moderatorOverride?.overriddenBy).toBe(mockOverrideRequest.moderatorId);
        expect(result.data.moderatorOverride?.overrideReason).toBe(mockOverrideRequest.overrideReason);
        expect(result.data.validationMetadata.validationMethod).toBe('manual');
      }

      expect(mockComplianceService.validateSubredditPermissions).toHaveBeenCalledWith(
        mockContext.subreddit,
        'manage_comments'
      );
    });

    it('should fail when moderator lacks permissions', async () => {
      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: false,
        data: false
      });

      const result = await validationSystem.processModeratorOverride(mockOverrideRequest, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient moderator permissions for override');
    });

    it('should fail when original validation result not found', async () => {
      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      const invalidRequest = {
        ...mockOverrideRequest,
        contentId: 'nonexistent_content'
      };

      const result = await validationSystem.processModeratorOverride(invalidRequest, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Original validation result not found');
    });
  });

  describe('configuration management', () => {
    it('should get validation configuration', () => {
      const config = validationSystem.getValidationConfig();

      expect(config.enableRedditContentScanning).toBe(true);
      expect(config.enableCommunityGuidelinesCheck).toBe(true);
      expect(config.enableModeratorOverride).toBe(true);
      expect(config.strictMode).toBe(false);
      expect(config.customRules).toEqual(['no spam', 'be respectful']);
    });

    it('should update validation configuration', () => {
      const newConfig: Partial<ValidationConfig> = {
        strictMode: true,
        enableRedditContentScanning: false,
        customRules: ['updated rule']
      };

      validationSystem.updateValidationConfig(newConfig);

      const updatedConfig = validationSystem.getValidationConfig();
      expect(updatedConfig.strictMode).toBe(true);
      expect(updatedConfig.enableRedditContentScanning).toBe(false);
      expect(updatedConfig.customRules).toEqual(['updated rule']);
      // Other settings should remain unchanged
      expect(updatedConfig.enableCommunityGuidelinesCheck).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should manage validation cache', async () => {
      // Add some validation results to cache
      mockComplianceService.validateContent.mockResolvedValue({
        success: true,
        data: {
          isValid: true,
          isNSFW: false,
          contentWarnings: [],
          violatesPolicy: false,
          moderationRequired: false
        }
      });

      mockContentPolicyService.checkContentPolicy.mockResolvedValue({
        success: true,
        data: {
          contentId: 'test_content',
          contentType: 'comment',
          isCompliant: true,
          violations: [],
          recommendedAction: 'approve',
          confidence: 0.9
        }
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      // Validate some content to populate cache
      await validationSystem.validateContent('test content 1', mockContext);
      await validationSystem.validateContent('test content 2', mockContext);

      // Check cache stats
      const stats = validationSystem.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.entries.length).toBeGreaterThan(0);

      // Clear cache
      validationSystem.clearCache();

      const clearedStats = validationSystem.getCacheStats();
      expect(clearedStats.size).toBe(0);
      expect(clearedStats.entries.length).toBe(0);
    });
  });

  describe('content analysis helpers', () => {
    it('should calculate spam scores correctly', async () => {
      const spamContent = 'CLICK HERE CLICK HERE CLICK HERE BUY NOW BUY NOW BUY NOW!!!';
      const normalContent = 'This is a normal message with varied vocabulary and proper formatting.';

      // Test spam content
      mockComplianceService.validateContent.mockResolvedValue({
        success: true,
        data: { isValid: true, isNSFW: false, contentWarnings: [], violatesPolicy: false, moderationRequired: false }
      });

      mockContentPolicyService.checkContentPolicy.mockResolvedValue({
        success: true,
        data: { contentId: 'test', contentType: 'comment', isCompliant: true, violations: [], recommendedAction: 'approve', confidence: 0.9 }
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      const spamResult = await validationSystem.validateContent(spamContent, mockContext);
      const normalResult = await validationSystem.validateContent(normalContent, mockContext);

      expect(spamResult.data?.redditScanResult?.spamScore).toBeGreaterThan(
        normalResult.data?.redditScanResult?.spamScore || 0
      );
    });

    it('should calculate toxicity scores correctly', async () => {
      const toxicContent = 'You are so stupid and I hate you, you should die!';
      const normalContent = 'Thank you for sharing this interesting perspective.';

      mockComplianceService.validateContent.mockResolvedValue({
        success: true,
        data: { isValid: true, isNSFW: false, contentWarnings: [], violatesPolicy: false, moderationRequired: false }
      });

      mockContentPolicyService.checkContentPolicy.mockResolvedValue({
        success: true,
        data: { contentId: 'test', contentType: 'comment', isCompliant: true, violations: [], recommendedAction: 'approve', confidence: 0.9 }
      });

      mockComplianceService.validateSubredditPermissions.mockResolvedValue({
        success: true,
        data: true
      });

      const toxicResult = await validationSystem.validateContent(toxicContent, mockContext);
      const normalResult = await validationSystem.validateContent(normalContent, mockContext);

      expect(toxicResult.data?.redditScanResult?.toxicityScore).toBeGreaterThan(
        normalResult.data?.redditScanResult?.toxicityScore || 0
      );
    });
  });
});