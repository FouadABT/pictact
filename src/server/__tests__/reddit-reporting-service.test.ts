import { 
  RedditReportingService, 
  ContentReportType, 
  ReportStatus, 
  AppealStatus,
  ContentReport,
  ModerationAppeal 
} from '../core/reddit-reporting-service.js';
import { DevvitContext } from '../../shared/types/reddit-compliance.js';

// Mock the Reddit API
jest.mock('@devvit/web/server', () => ({
  reddit: {
    getCurrentUsername: jest.fn().mockResolvedValue('test_user'),
    getSubredditInfoByName: jest.fn()
  }
}));

// Mock the compliance service
jest.mock('../core/reddit-compliance-service.js', () => ({
  RedditComplianceService: jest.fn().mockImplementation(() => ({
    getCurrentRedditUser: jest.fn().mockResolvedValue({
      success: true,
      data: 'test_user'
    }),
    getModeratorPermissions: jest.fn().mockResolvedValue({
      success: true,
      data: {
        canManagePosts: true,
        canManageComments: true,
        canManageUsers: true,
        canManageSettings: true,
        canViewModLog: true
      }
    }),
    logModeratorAction: jest.fn().mockResolvedValue({
      success: true,
      data: true
    })
  }))
}));

describe('RedditReportingService', () => {
  let reportingService: RedditReportingService;
  let mockContext: DevvitContext;

  beforeEach(() => {
    reportingService = new RedditReportingService();
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

  describe('reportContent', () => {
    it('should successfully report spam content', async () => {
      const result = await reportingService.reportContent(
        'content_123',
        'comment',
        ContentReportType.SPAM,
        'This comment contains spam',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.reportType).toBe(ContentReportType.SPAM);
      expect(result.data?.status).toBe(ReportStatus.PENDING);
      expect(result.data?.subreddit).toBe('testsubreddit');
      expect(result.data?.reportId).toBeDefined();
    });

    it('should successfully report harassment content', async () => {
      const result = await reportingService.reportContent(
        'content_124',
        'comment',
        ContentReportType.HARASSMENT,
        'This comment contains harassment',
        mockContext,
        'User is being abusive and threatening'
      );

      expect(result.success).toBe(true);
      expect(result.data?.reportType).toBe(ContentReportType.HARASSMENT);
      expect(result.data?.customReason).toBe('User is being abusive and threatening');
      expect(result.data?.status).toBe(ReportStatus.PENDING);
    });

    it('should report hate speech content', async () => {
      const result = await reportingService.reportContent(
        'content_125',
        'post',
        ContentReportType.HATE_SPEECH,
        'This post contains hate speech',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.reportType).toBe(ContentReportType.HATE_SPEECH);
      expect(result.data?.contentType).toBe('post');
    });

    it('should report violence content', async () => {
      const result = await reportingService.reportContent(
        'content_126',
        'comment',
        ContentReportType.VIOLENCE,
        'This comment contains violent threats',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.reportType).toBe(ContentReportType.VIOLENCE);
    });

    it('should report sexual content', async () => {
      const result = await reportingService.reportContent(
        'content_127',
        'media',
        ContentReportType.SEXUAL_CONTENT,
        'This media contains inappropriate sexual content',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.reportType).toBe(ContentReportType.SEXUAL_CONTENT);
      expect(result.data?.contentType).toBe('media');
    });

    it('should handle custom report types', async () => {
      const result = await reportingService.reportContent(
        'content_128',
        'comment',
        ContentReportType.CUSTOM,
        'Custom violation',
        mockContext,
        'This violates our specific game rules'
      );

      expect(result.success).toBe(true);
      expect(result.data?.reportType).toBe(ContentReportType.CUSTOM);
      expect(result.data?.customReason).toBe('This violates our specific game rules');
    });

    it('should fail when user is not authenticated', async () => {
      // Mock authentication failure
      const mockComplianceService = require('../core/reddit-compliance-service.js');
      mockComplianceService.RedditComplianceService.mockImplementationOnce(() => ({
        getCurrentRedditUser: jest.fn().mockResolvedValue({
          success: false,
          error: 'Authentication required'
        })
      }));
      
      const unauthenticatedService = new RedditReportingService();
      const contextWithoutUser = { ...mockContext, userId: undefined };
      
      const result = await unauthenticatedService.reportContent(
        'content_129',
        'comment',
        ContentReportType.SPAM,
        'Spam content',
        contextWithoutUser
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });
  });

  describe('submitAppeal', () => {
    it('should successfully submit appeal for removed content', async () => {
      const result = await reportingService.submitAppeal(
        'content_130',
        'comment',
        'removal',
        'This content was removed incorrectly. It does not violate any rules.',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.originalAction).toBe('removal');
      expect(result.data?.status).toBe(AppealStatus.SUBMITTED);
      expect(result.data?.appealReason).toContain('removed incorrectly');
      expect(result.data?.appealId).toBeDefined();
    });

    it('should successfully submit appeal for ban', async () => {
      const result = await reportingService.submitAppeal(
        'content_131',
        'post',
        'ban',
        'The ban was unjustified. I was following all community guidelines.',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.originalAction).toBe('ban');
      expect(result.data?.contentType).toBe('post');
      expect(result.data?.status).toBe(AppealStatus.SUBMITTED);
    });

    it('should successfully submit appeal for warning', async () => {
      const result = await reportingService.submitAppeal(
        'content_132',
        'comment',
        'warning',
        'The warning was issued in error.',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.originalAction).toBe('warning');
      expect(result.data?.status).toBe(AppealStatus.SUBMITTED);
    });

    it('should fail when user is not authenticated', async () => {
      // Mock authentication failure
      const mockComplianceService = require('../core/reddit-compliance-service.js');
      mockComplianceService.RedditComplianceService.mockImplementationOnce(() => ({
        getCurrentRedditUser: jest.fn().mockResolvedValue({
          success: false,
          error: 'Authentication required'
        })
      }));
      
      const unauthenticatedService = new RedditReportingService();
      const contextWithoutUser = { ...mockContext, userId: undefined };
      
      const result = await unauthenticatedService.submitAppeal(
        'content_133',
        'comment',
        'removal',
        'Appeal reason',
        contextWithoutUser
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });
  });

  describe('getSubredditReports', () => {
    beforeEach(async () => {
      // Create some test reports
      await reportingService.reportContent(
        'content_200',
        'comment',
        ContentReportType.SPAM,
        'Spam report',
        mockContext
      );
      
      await reportingService.reportContent(
        'content_201',
        'post',
        ContentReportType.HARASSMENT,
        'Harassment report',
        mockContext
      );
    });

    it('should get all reports for moderators', async () => {
      const result = await reportingService.getSubredditReports(
        'testsubreddit',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThanOrEqual(2);
      expect(result.data?.every(report => report.subreddit === 'testsubreddit')).toBe(true);
    });

    it('should filter reports by status', async () => {
      const result = await reportingService.getSubredditReports(
        'testsubreddit',
        mockContext,
        ReportStatus.PENDING
      );

      expect(result.success).toBe(true);
      expect(result.data?.every(report => report.status === ReportStatus.PENDING)).toBe(true);
    });

    it('should limit number of reports returned', async () => {
      const result = await reportingService.getSubredditReports(
        'testsubreddit',
        mockContext,
        undefined,
        1
      );

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeLessThanOrEqual(1);
    });

    it('should fail for non-moderators', async () => {
      // Mock no moderator permissions
      const mockComplianceService = require('../core/reddit-compliance-service.js');
      mockComplianceService.RedditComplianceService.mockImplementationOnce(() => ({
        getCurrentRedditUser: jest.fn().mockResolvedValue({
          success: true,
          data: 'test_user'
        }),
        getModeratorPermissions: jest.fn().mockResolvedValue({
          success: true,
          data: {
            canManagePosts: false,
            canManageComments: false,
            canManageUsers: false,
            canManageSettings: false,
            canViewModLog: false
          }
        })
      }));
      
      const nonModService = new RedditReportingService();
      const contextWithoutPerms = {
        ...mockContext,
        moderatorPermissions: {
          canManagePosts: false,
          canManageComments: false,
          canManageUsers: false,
          canManageSettings: false,
          canViewModLog: false
        }
      };

      const result = await nonModService.getSubredditReports(
        'testsubreddit',
        contextWithoutPerms
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Moderator permissions required');
    });
  });

  describe('getSubredditAppeals', () => {
    beforeEach(async () => {
      // Create some test appeals
      await reportingService.submitAppeal(
        'content_300',
        'comment',
        'removal',
        'Appeal for removal',
        mockContext
      );
      
      await reportingService.submitAppeal(
        'content_301',
        'post',
        'ban',
        'Appeal for ban',
        mockContext
      );
    });

    it('should get all appeals for moderators', async () => {
      const result = await reportingService.getSubredditAppeals(
        'testsubreddit',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThanOrEqual(2);
      expect(result.data?.every(appeal => appeal.subreddit === 'testsubreddit')).toBe(true);
    });

    it('should filter appeals by status', async () => {
      const result = await reportingService.getSubredditAppeals(
        'testsubreddit',
        mockContext,
        AppealStatus.SUBMITTED
      );

      expect(result.success).toBe(true);
      expect(result.data?.every(appeal => appeal.status === AppealStatus.SUBMITTED)).toBe(true);
    });

    it('should fail for non-moderators', async () => {
      const contextWithoutPerms = {
        ...mockContext,
        moderatorPermissions: {
          canManagePosts: false,
          canManageComments: false,
          canManageUsers: false,
          canManageSettings: false,
          canViewModLog: false
        }
      };

      const result = await reportingService.getSubredditAppeals(
        'testsubreddit',
        contextWithoutPerms
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Moderator permissions required');
    });
  });

  describe('processReport', () => {
    let testReportId: string;

    beforeEach(async () => {
      const reportResult = await reportingService.reportContent(
        'content_400',
        'comment',
        ContentReportType.SPAM,
        'Test spam report',
        mockContext
      );
      testReportId = reportResult.data!.reportId;
    });

    it('should process report with no action', async () => {
      const result = await reportingService.processReport(
        testReportId,
        'no_action',
        'Report reviewed - no violation found',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(ReportStatus.RESOLVED);
      expect(result.data?.resolutionAction).toBe('no_action');
      expect(result.data?.moderatorNotes).toBe('Report reviewed - no violation found');
      expect(result.data?.resolutionDate).toBeDefined();
    });

    it('should process report with removal action', async () => {
      const result = await reportingService.processReport(
        testReportId,
        'removal',
        'Content removed for spam',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.resolutionAction).toBe('removal');
      expect(result.data?.moderatorAssigned).toBe('test_user');
    });

    it('should process report with ban action', async () => {
      const result = await reportingService.processReport(
        testReportId,
        'ban',
        'User banned for repeated violations',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.resolutionAction).toBe('ban');
    });

    it('should fail for non-existent report', async () => {
      const result = await reportingService.processReport(
        'nonexistent_report',
        'no_action',
        'Test notes',
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Report not found');
    });

    it('should fail for non-moderators', async () => {
      const contextWithoutPerms = {
        ...mockContext,
        moderatorPermissions: {
          canManagePosts: false,
          canManageComments: false,
          canManageUsers: false,
          canManageSettings: false,
          canViewModLog: false
        }
      };

      const result = await reportingService.processReport(
        testReportId,
        'no_action',
        'Test notes',
        contextWithoutPerms
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Moderator permissions required');
    });
  });

  describe('reviewAppeal', () => {
    let testAppealId: string;

    beforeEach(async () => {
      const appealResult = await reportingService.submitAppeal(
        'content_500',
        'comment',
        'removal',
        'Test appeal',
        mockContext
      );
      testAppealId = appealResult.data!.appealId;
    });

    it('should approve appeal (overturn decision)', async () => {
      const result = await reportingService.reviewAppeal(
        testAppealId,
        'overturned',
        'Appeal approved - content restored',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(AppealStatus.APPROVED);
      expect(result.data?.decision).toBe('overturned');
      expect(result.data?.reviewNotes).toBe('Appeal approved - content restored');
      expect(result.data?.reviewedBy).toBe('test_user');
      expect(result.data?.reviewDate).toBeDefined();
    });

    it('should deny appeal (uphold decision)', async () => {
      const result = await reportingService.reviewAppeal(
        testAppealId,
        'upheld',
        'Appeal denied - original action was correct',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(AppealStatus.DENIED);
      expect(result.data?.decision).toBe('upheld');
    });

    it('should modify appeal decision', async () => {
      const result = await reportingService.reviewAppeal(
        testAppealId,
        'modified',
        'Appeal partially approved - action modified',
        mockContext,
        'warning'
      );

      expect(result.success).toBe(true);
      expect(result.data?.decision).toBe('modified');
      expect(result.data?.newAction).toBe('warning');
    });

    it('should fail for non-existent appeal', async () => {
      const result = await reportingService.reviewAppeal(
        'nonexistent_appeal',
        'upheld',
        'Test notes',
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Appeal not found');
    });

    it('should fail for non-moderators', async () => {
      const contextWithoutPerms = {
        ...mockContext,
        moderatorPermissions: {
          canManagePosts: false,
          canManageComments: false,
          canManageUsers: false,
          canManageSettings: false,
          canViewModLog: false
        }
      };

      const result = await reportingService.reviewAppeal(
        testAppealId,
        'upheld',
        'Test notes',
        contextWithoutPerms
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Moderator permissions required');
    });
  });

  describe('getReportStatistics', () => {
    beforeEach(async () => {
      // Create test reports for statistics
      await reportingService.reportContent('content_600', 'comment', ContentReportType.SPAM, 'Spam 1', mockContext);
      await reportingService.reportContent('content_601', 'comment', ContentReportType.HARASSMENT, 'Harassment 1', mockContext);
      await reportingService.reportContent('content_602', 'post', ContentReportType.SPAM, 'Spam 2', mockContext);
    });

    it('should get report statistics for moderators', async () => {
      const result = await reportingService.getReportStatistics(
        'testsubreddit',
        mockContext,
        30
      );

      expect(result.success).toBe(true);
      expect(result.data?.subreddit).toBe('testsubreddit');
      expect(result.data?.totalReports).toBeGreaterThanOrEqual(3);
      expect(result.data?.pendingReports).toBeGreaterThanOrEqual(3);
      expect(result.data?.reportsByType.get(ContentReportType.SPAM)).toBeGreaterThanOrEqual(2);
      expect(result.data?.reportsByType.get(ContentReportType.HARASSMENT)).toBeGreaterThanOrEqual(1);
      expect(result.data?.reportTrends).toBeDefined();
      expect(result.data?.reportTrends.daily).toBeInstanceOf(Array);
      expect(result.data?.reportTrends.weekly).toBeInstanceOf(Array);
      expect(result.data?.reportTrends.monthly).toBeInstanceOf(Array);
    });

    it('should fail for non-moderators', async () => {
      const contextWithoutPerms = {
        ...mockContext,
        moderatorPermissions: {
          canManagePosts: false,
          canManageComments: false,
          canManageUsers: false,
          canManageSettings: false,
          canViewModLog: false
        }
      };

      const result = await reportingService.getReportStatistics(
        'testsubreddit',
        contextWithoutPerms
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Moderator permissions required');
    });
  });

  describe('logModerationAction', () => {
    it('should log moderation actions successfully', async () => {
      const result = await reportingService.logModerationAction(
        'content_removal',
        'content_700',
        'comment',
        'Content removed for spam',
        mockContext,
        { automated: false, reportId: 'report_123' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should log different types of moderation actions', async () => {
      const actions = ['user_ban', 'content_approval', 'user_warning', 'content_lock'];
      
      for (const action of actions) {
        const result = await reportingService.logModerationAction(
          action,
          'content_701',
          'post',
          `Action: ${action}`,
          mockContext
        );

        expect(result.success).toBe(true);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle invalid report types gracefully', async () => {
      const result = await reportingService.reportContent(
        'content_800',
        'comment',
        'invalid_type' as ContentReportType,
        'Invalid report',
        mockContext
      );

      // Should still succeed but with the invalid type
      expect(result.success).toBe(true);
      expect(result.data?.reportType).toBe('invalid_type');
    });

    it('should handle missing context gracefully', async () => {
      const invalidContext = { ...mockContext, subreddit: '' };
      
      const result = await reportingService.reportContent(
        'content_801',
        'comment',
        ContentReportType.SPAM,
        'Test report',
        invalidContext
      );

      expect(result.success).toBe(true);
      expect(result.data?.subreddit).toBe('');
    });
  });

  describe('Integration with Reddit APIs', () => {
    it('should integrate with Reddit reporting system', async () => {
      const result = await reportingService.reportContent(
        'content_900',
        'comment',
        ContentReportType.SPAM,
        'Integration test report',
        mockContext
      );

      expect(result.success).toBe(true);
      // Should have attempted to submit to Reddit's reporting system
      expect(result.data?.reportId).toBeDefined();
    });

    it('should integrate with Reddit appeal system', async () => {
      const result = await reportingService.submitAppeal(
        'content_901',
        'comment',
        'removal',
        'Integration test appeal',
        mockContext
      );

      expect(result.success).toBe(true);
      // Should have attempted to submit to Reddit's appeal system
      expect(result.data?.appealId).toBeDefined();
    });
  });
});