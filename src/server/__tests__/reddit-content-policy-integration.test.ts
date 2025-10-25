import { RedditMediaHandler } from '../core/reddit-media-handler.js';
import { DevvitContext } from '../../shared/types/reddit-compliance.js';

// Mock the reddit client
jest.mock('@devvit/web/server', () => ({
  reddit: {
    getSubredditInfoByName: jest.fn()
  }
}));

describe('Reddit Content Policy Integration', () => {
  let mediaHandler: RedditMediaHandler;
  let mockContext: DevvitContext;

  beforeEach(() => {
    mediaHandler = new RedditMediaHandler();
    mockContext = {
      postId: 'test_post_123',
      subreddit: 'testsubreddit',
      userId: 'test_user_456',
      moderatorPermissions: {
        canManagePosts: true,
        canManageComments: true,
        canManageUsers: false,
        canManageSettings: false,
        canViewModLog: true
      }
    };

    jest.clearAllMocks();
  });

  describe('Content Policy Integration', () => {
    it('should validate content through the media handler', async () => {
      const mockFile = new File(['test image data'], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await mediaHandler.uploadImage(mockFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.mediaUrl).toMatch(/^https:\/\/i\.redd\.it\//);
    });

    it('should handle NSFW content detection', async () => {
      const mockFile = new File(['test image data'], 'nsfw_content.jpg', { type: 'image/jpeg' });
      
      const result = await mediaHandler.uploadImage(mockFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // The content policy service should detect NSFW content based on filename
    });

    it('should reject oversized files', async () => {
      // Create a mock file larger than 20MB
      const largeData = new Array(21 * 1024 * 1024).fill('x').join('');
      const mockFile = new File([largeData], 'large.jpg', { type: 'image/jpeg' });
      
      const result = await mediaHandler.uploadImage(mockFile, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should reject unsupported file types', async () => {
      const mockFile = new File(['test data'], 'test.txt', { type: 'text/plain' });
      
      const result = await mediaHandler.uploadImage(mockFile, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File type text/plain not allowed');
    });

    it('should validate Reddit media URLs', async () => {
      const validUrl = 'https://i.redd.it/test123.jpg';
      
      const result = await mediaHandler.validateImageContent(validUrl, mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(true);
    });

    it('should reject invalid media URLs', async () => {
      const invalidUrl = 'https://example.com/image.jpg';
      
      const result = await mediaHandler.validateImageContent(invalidUrl, mockContext);

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(false);
      expect(result.data?.violatesPolicy).toBe(true);
    });

    it('should extract metadata from Reddit URLs', async () => {
      const mediaUrl = 'https://i.redd.it/abc123def456.jpg';
      
      const result = await mediaHandler.getImageMetadata(mediaUrl);

      expect(result.success).toBe(true);
      expect(result.data?.filename).toBe('abc123def456.jpg');
      expect(result.data?.mimeType).toBe('image/jpeg');
    });

    it('should handle NSFW content appropriately', async () => {
      const mediaUrl = 'https://i.redd.it/nsfw123.jpg';
      const nsfwValidation = {
        isValid: true,
        isNSFW: true,
        contentWarnings: ['NSFW content detected'],
        violatesPolicy: false,
        moderationRequired: false
      };

      const result = await mediaHandler.handleNSFWContent(mediaUrl, 'testsubreddit', nsfwValidation);

      expect(result.success).toBe(true);
      expect(result.data?.isNSFW).toBe(true);
      expect(result.data?.action).toBe('remove'); // Conservative default
    });
  });

  describe('Content Policy Enforcement', () => {
    it('should enforce file size limits', async () => {
      const oversizedFile = new File(['x'.repeat(25 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
      
      const result = await mediaHandler.uploadImage(oversizedFile, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should enforce file type restrictions', async () => {
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/exe' });
      
      const result = await mediaHandler.uploadImage(invalidFile, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should validate file integrity', async () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      
      const result = await mediaHandler.uploadImage(emptyFile, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty or corrupted');
    });

    it('should require valid filenames', async () => {
      const unnamedFile = new File(['test'], '', { type: 'image/jpeg' });
      
      const result = await mediaHandler.uploadImage(unnamedFile, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('valid name');
    });
  });

  describe('Reddit URL Validation', () => {
    it('should accept valid Reddit media URLs', async () => {
      const validUrls = [
        'https://i.redd.it/abc123.jpg',
        'https://preview.redd.it/def456.png',
        'https://external-preview.redd.it/ghi789.gif',
        'https://www.reddit.com/media/jkl012.webp'
      ];

      for (const url of validUrls) {
        const result = await mediaHandler.getImageMetadata(url);
        expect(result.success).toBe(true);
      }
    });

    it('should reject non-Reddit URLs', async () => {
      const invalidUrls = [
        'https://imgur.com/abc123.jpg',
        'https://example.com/image.png',
        'https://cdn.example.com/photo.gif'
      ];

      for (const url of invalidUrls) {
        const result = await mediaHandler.getImageMetadata(url);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid Reddit media URL');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed files gracefully', async () => {
      const malformedFile = {} as File;
      
      const result = await mediaHandler.uploadImage(malformedFile, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing context gracefully', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const incompleteContext = { postId: 'test', subreddit: '' } as DevvitContext;
      
      const result = await mediaHandler.uploadImage(mockFile, incompleteContext);

      // Should still attempt upload with available context
      expect(result.success).toBe(true);
    });
  });
});