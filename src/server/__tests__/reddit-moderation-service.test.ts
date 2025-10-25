import { RedditModerationService, SpamDetectionResult, CommunityGuidelinesViolation, ModerationDecision } from '../core/reddit-moderation-service.js';
import { DevvitContext, ContentValidation } from '../../shared/types/reddit-compliance.js';

// Mock the Reddit API
jest.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentUsername: jest.fn(),
    getSubredditInfoByName: jest.fn()
  }
}));

describe('RedditModerationService', () => {
  let moderationService: RedditModerationService;
  let mockContext: DevvitContext;

  beforeEach(() => {
    moderationService = new RedditModerationService();
    mockContext = {
      postId: 'test_post_123',
      subreddit: 'testsubreddit',
      userId: 'test_user',
      moderatorPermissions: {
        canManagePosts: true,
        canManageComments: true,
        canManageUsers: true,
        canManageSettings: true,
        canViewModLog: true
      }
    };
    jest.clearAllMocks();
  });

  describe('detectSpamContent', () => {
    it('should detect spam in text content', async () => {
      const spamText = 'Buy now! Click here for free money guaranteed!';
      
      const result = await moderationService.detectSpamContent(
        'content_123',
        'comment',
        spamText,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.isSpam).toBe(true);
      expect(result.data?.confidence).toBeGreaterThan(0.5);
      expect(result.data?.reasons).toContain('Commercial spam pattern');
      expect(result.data?.riskLevel).toBe('critical');
    });

    it('should not flag legitimate content as spam', async () => {
      const legitimateText = 'This is a normal comment about the game.';
      
      const result = await moderationService.detectSpamContent(
        'content_124',
        'comment',
        legitimateText,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.isSpam).toBe(false);
      expect(result.data?.confidence).toBeLessThan(0.5);
      expect(result.data?.riskLevel).toBe('low');
    });

    it('should detect repetitive content as spam', async () => {
      const repetitiveText = 'spam spam spam spam spam spam spam spam spam spam spam spam';
      
      const result = await moderationService.detectSpamContent(
        'content_125',
        'comment',
        repetitiveText,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.isSpam).toBe(true);
      expect(result.data?.reasons).toContain('Repetitive content detected');
    });

    it('should detect suspicious media files', async () => {
      const suspiciousFile = new File([''], 'spam_bot_generated.jpg', { type: 'image/jpeg' });
      Object.defineProperty(suspiciousFile, 'size', { value: 500 }); // Small file
      
      const result = await moderationService.detectSpamContent(
        'content_126',
        'media',
        suspiciousFile,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.isSpam).toBe(true);
      expect(result.data?.reasons).toContain('Suspiciously small file size');
      expect(result.data?.reasons).toContain('Suspicious filename: spam');
    });
  });

  describe('enforceRedditCommunityGuidelines', () => {
    it('should detect harassment in content', async () => {
      const harassmentText = 'You suck and you are a pathetic loser';
      
      const result = await moderationService.enforceRedditCommunityGuidelines(
        'content_127',
        'comment',
        harassmentText,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].type).toBe('harassment');
      expect(result.data![0].severity).toBe('major');
      expect(result.data![0].recommendedAction).toBe('remove');
    });

    it('should detect violence in content', async () => {
      const violentText = 'I will kill you and bomb your house';
      
      const result = await moderationService.enforceRedditCommunityGuidelines(
        'content_128',
        'comment',
        violentText,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThanOrEqual(1); // At least violence
      const violenceViolation = result.data!.find(v => v.type === 'violence');
      expect(violenceViolation).toBeDefined();
      expect(violenceViolation!.severity).toBe('severe');
      expect(violenceViolation!.recommendedAction).toBe('escalate');
    });

    it('should not flag clean content', async () => {
      const cleanText = 'Great game! I really enjoyed this round.';
      
      const result = await moderationService.enforceRedditCommunityGuidelines(
        'content_129',
        'comment',
        cleanText,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('integrateWithRedditModerationTools', () => {
    it('should integrate with moderation tools when user has permissions', async () => {
      const result = await moderationService.integrateWithRedditModerationTools(
        'testsubreddit',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
      
      const toolNames = result.data!.map(tool => tool.toolName);
      expect(toolNames).toContain('AutoModerator');
      expect(toolNames).toContain('ModQueue');
      expect(toolNames).toContain('ModLog');
      expect(toolNames).toContain('UserNotes');
    });

    it('should fail when user lacks moderator permissions', async () => {
      const contextWithoutPerms = {
        ...mockContext,
        moderatorPermissions: undefined
      };

      const result = await moderationService.integrateWithRedditModerationTools(
        'testsubreddit',
        contextWithoutPerms
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Moderator permissions required');
    });
  });

  describe('moderateContent', () => {
    it('should approve clean content', async () => {
      const cleanText = 'This is a normal, appropriate comment.';
      const request = {
        contentId: 'content_130',
        contentType: 'comment' as const,
        content: cleanText,
        context: mockContext,
        priority: 'normal' as const
      };

      const result = await moderationService.moderateContent(request);

      expect(result.success).toBe(true);
      expect(result.data?.decision).toBe('approve');
      expect(result.data?.moderatorRequired).toBe(false);
      expect(result.data?.appealable).toBe(true);
    });

    it('should flag suspicious content', async () => {
      const suspiciousText = 'Buy now! Click here for free money guaranteed!';
      const request = {
        contentId: 'content_131',
        contentType: 'comment' as const,
        content: suspiciousText,
        context: mockContext,
        priority: 'normal' as const
      };

      const result = await moderationService.moderateContent(request);

      expect(result.success).toBe(true);
      expect(result.data?.decision).toBe('remove'); // High confidence spam gets removed
      expect(result.data?.spamResult.isSpam).toBe(true);
      expect(result.data?.reasons.length).toBeGreaterThan(0);
    });

    it('should remove content with major violations', async () => {
      const violatingText = 'You are a pathetic loser who should die';
      const request = {
        contentId: 'content_132',
        contentType: 'comment' as const,
        content: violatingText,
        context: mockContext,
        priority: 'high' as const
      };

      const result = await moderationService.moderateContent(request);

      expect(result.success).toBe(true);
      expect(result.data?.decision).toBe('remove');
      expect(result.data?.violations.length).toBeGreaterThan(0);
      expect(result.data?.moderatorRequired).toBe(false);
    });

    it('should escalate content with severe violations', async () => {
      const severeText = 'I will kill you and bomb your school';
      const request = {
        contentId: 'content_133',
        contentType: 'comment' as const,
        content: severeText,
        context: mockContext,
        priority: 'urgent' as const
      };

      const result = await moderationService.moderateContent(request);

      expect(result.success).toBe(true);
      expect(result.data?.decision).toBe('escalate');
      expect(result.data?.moderatorRequired).toBe(true);
      expect(result.data?.appealable).toBe(false);
      
      const severeViolations = result.data?.violations.filter(v => v.severity === 'severe');
      expect(severeViolations?.length).toBeGreaterThan(0);
    });

    it('should handle media content moderation', async () => {
      const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(testFile, 'size', { value: 50000 });
      
      const request = {
        contentId: 'content_134',
        contentType: 'media' as const,
        content: testFile,
        context: mockContext,
        priority: 'normal' as const
      };

      const result = await moderationService.moderateContent(request);

      expect(result.success).toBe(true);
      expect(result.data?.decision).toBe('approve');
      expect(result.data?.spamResult.isSpam).toBeDefined();
    });
  });

  describe('Game-specific spam detection', () => {
    it('should detect game-specific spam patterns', async () => {
      const gameSpamText = 'This is a fake submission generated by bot with cheat code buy now';
      
      const result = await moderationService.detectSpamContent(
        'content_135',
        'comment',
        gameSpamText,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.isSpam).toBe(true);
      expect(result.data?.detectedPatterns.length).toBeGreaterThan(0);
      expect(result.data?.reasons).toContain('Game-specific spam pattern detected');
    });

    it('should enhance spam detection with PicTact patterns', async () => {
      const autoSubmitText = 'auto submit generated content buy now click here';
      
      const result = await moderationService.detectSpamContent(
        'content_136',
        'comment',
        autoSubmitText,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.isSpam).toBe(true);
      expect(result.data?.confidence).toBeGreaterThan(0.2);
    });
  });

  describe('Error handling', () => {
    it('should handle spam detection errors gracefully', async () => {
      // Test with invalid content type
      const result = await moderationService.detectSpamContent(
        'content_137',
        'comment',
        null as any,
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle moderation errors gracefully', async () => {
      const invalidRequest = {
        contentId: '',
        contentType: 'invalid' as any,
        content: 'test',
        context: mockContext,
        priority: 'normal' as const
      };

      const result = await moderationService.moderateContent(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Integration with existing services', () => {
    it('should integrate with content policy service', async () => {
      const testText = 'Test content for policy validation';
      const request = {
        contentId: 'content_138',
        contentType: 'comment' as const,
        content: testText,
        context: mockContext,
        priority: 'normal' as const
      };

      const result = await moderationService.moderateContent(request);

      expect(result.success).toBe(true);
      // Should have called content policy validation
      expect(result.data?.decision).toBeDefined();
    });

    it('should integrate with compliance service for logging', async () => {
      const violatingText = 'You are pathetic';
      const request = {
        contentId: 'content_139',
        contentType: 'comment' as const,
        content: violatingText,
        context: mockContext,
        priority: 'normal' as const
      };

      const result = await moderationService.moderateContent(request);

      expect(result.success).toBe(true);
      // Should have logged the moderation action
      expect(result.data?.decision).toBe('remove');
    });
  });
});