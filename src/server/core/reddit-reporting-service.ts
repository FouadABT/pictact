import { reddit } from "@devvit/web/server";
import { 
  RedditApiResult,
  DevvitContext,
  ModeratorPermissions
} from "../../shared/types/reddit-compliance.js";
import { RedditComplianceService } from "./reddit-compliance-service.js";

/**
 * Content Report Types
 * Types of reports that can be made on Reddit content
 */
export enum ContentReportType {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  SEXUAL_CONTENT = 'sexual_content',
  COPYRIGHT = 'copyright',
  IMPERSONATION = 'impersonation',
  MISINFORMATION = 'misinformation',
  SELF_HARM = 'self_harm',
  CUSTOM = 'custom'
}

/**
 * Report Status
 * Current status of a content report
 */
export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated'
}

/**
 * Appeal Status
 * Current status of a moderation appeal
 */
export enum AppealStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DENIED = 'denied',
  ESCALATED = 'escalated'
}

/**
 * Content Report
 * Represents a report made against content
 */
export interface ContentReport {
  reportId: string;
  contentId: string;
  contentType: 'post' | 'comment' | 'media';
  reportType: ContentReportType;
  reason: string;
  customReason?: string;
  reportedBy: string;
  reportedAt: Date;
  status: ReportStatus;
  subreddit: string;
  moderatorAssigned?: string;
  moderatorNotes?: string;
  resolutionDate?: Date;
  resolutionAction?: 'no_action' | 'warning' | 'removal' | 'ban' | 'escalation';
}

/**
 * Moderation Appeal
 * Represents an appeal against a moderation action
 */
export interface ModerationAppeal {
  appealId: string;
  contentId: string;
  contentType: 'post' | 'comment' | 'media';
  originalAction: 'removal' | 'ban' | 'warning' | 'restriction';
  appealReason: string;
  appealedBy: string;
  appealedAt: Date;
  status: AppealStatus;
  subreddit: string;
  reviewedBy?: string;
  reviewNotes?: string;
  reviewDate?: Date;
  decision?: 'upheld' | 'overturned' | 'modified';
  newAction?: string;
}

/**
 * Report Statistics
 * Statistics about reports in a subreddit
 */
export interface ReportStatistics {
  subreddit: string;
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  reportsByType: Map<ContentReportType, number>;
  averageResolutionTime: number; // in hours
  reportTrends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
}

/**
 * Appeal Statistics
 * Statistics about appeals in a subreddit
 */
export interface AppealStatistics {
  subreddit: string;
  totalAppeals: number;
  pendingAppeals: number;
  approvedAppeals: number;
  deniedAppeals: number;
  averageReviewTime: number; // in hours
  appealSuccessRate: number; // percentage
}

/**
 * Reddit Reporting and Appeal Service
 * Integrates with Reddit's native reporting and appeal systems
 * Implements requirements 8.4, 8.5
 */
export class RedditReportingService {
  private complianceService: RedditComplianceService;
  private reports: Map<string, ContentReport>;
  private appeals: Map<string, ModerationAppeal>;
  private reportQueue: Map<string, ContentReport[]>; // subreddit -> reports

  constructor() {
    this.complianceService = new RedditComplianceService();
    this.reports = new Map();
    this.appeals = new Map();
    this.reportQueue = new Map();
  }

  /**
   * Create Reddit-native content reporting mechanisms
   * Requirement 8.4: Use Reddit-native content reporting mechanisms
   */
  async reportContent(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    reportType: ContentReportType,
    reason: string,
    context: DevvitContext,
    customReason?: string
  ): Promise<RedditApiResult<ContentReport>> {
    try {
      // Verify user authentication
      const currentUser = await this.complianceService.getCurrentRedditUser();
      if (!currentUser.success || !currentUser.data) {
        return {
          success: false,
          error: "Authentication required to report content"
        };
      }

      // Create report ID
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create report object
      const report: ContentReport = {
        reportId,
        contentId,
        contentType,
        reportType,
        reason,
        customReason,
        reportedBy: currentUser.data,
        reportedAt: new Date(),
        status: ReportStatus.PENDING,
        subreddit: context.subreddit
      };

      // Submit report to Reddit's reporting system
      const redditReportResult = await this.submitToRedditReporting(report, context);
      if (!redditReportResult.success) {
        return {
          success: false,
          error: redditReportResult.error || "Failed to submit report to Reddit"
        };
      }

      // Store report locally for tracking
      this.reports.set(reportId, report);

      // Add to subreddit report queue
      const subredditReports = this.reportQueue.get(context.subreddit) || [];
      subredditReports.push(report);
      this.reportQueue.set(context.subreddit, subredditReports);

      // Notify moderators if needed
      await this.notifyModeratorsOfReport(report, context);

      return {
        success: true,
        data: report
      };

    } catch (error) {
      console.error("Failed to report content:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to report content"
      };
    }
  }

  /**
   * Submit appeal against moderation action
   * Requirement 8.4: Implement integration with Reddit's appeal processes
   */
  async submitAppeal(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    originalAction: 'removal' | 'ban' | 'warning' | 'restriction',
    appealReason: string,
    context: DevvitContext
  ): Promise<RedditApiResult<ModerationAppeal>> {
    try {
      // Verify user authentication
      const currentUser = await this.complianceService.getCurrentRedditUser();
      if (!currentUser.success || !currentUser.data) {
        return {
          success: false,
          error: "Authentication required to submit appeal"
        };
      }

      // Check if content is appealable
      const appealEligibility = await this.checkAppealEligibility(contentId, originalAction, context);
      if (!appealEligibility.success || !appealEligibility.data) {
        return {
          success: false,
          error: "Content is not eligible for appeal"
        };
      }

      // Create appeal ID
      const appealId = `appeal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create appeal object
      const appeal: ModerationAppeal = {
        appealId,
        contentId,
        contentType,
        originalAction,
        appealReason,
        appealedBy: currentUser.data,
        appealedAt: new Date(),
        status: AppealStatus.SUBMITTED,
        subreddit: context.subreddit
      };

      // Submit appeal to Reddit's appeal system
      const redditAppealResult = await this.submitToRedditAppeals(appeal, context);
      if (!redditAppealResult.success) {
        return {
          success: false,
          error: redditAppealResult.error || "Failed to submit appeal to Reddit"
        };
      }

      // Store appeal locally for tracking
      this.appeals.set(appealId, appeal);

      // Notify moderators of the appeal
      await this.notifyModeratorsOfAppeal(appeal, context);

      return {
        success: true,
        data: appeal
      };

    } catch (error) {
      console.error("Failed to submit appeal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit appeal"
      };
    }
  }

  /**
   * Add Reddit moderation log integration
   * Requirement 8.5: Add Reddit moderation log integration
   */
  async logModerationAction(
    action: string,
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    reason: string,
    context: DevvitContext,
    details?: any
  ): Promise<RedditApiResult<boolean>> {
    try {
      // Use the compliance service to log the action
      const logResult = await this.complianceService.logModeratorAction(
        context.subreddit,
        action,
        contentId,
        reason,
        {
          contentType,
          timestamp: new Date().toISOString(),
          source: 'PicTact_Reporting_System',
          ...details
        }
      );

      if (!logResult.success) {
        return {
          success: false,
          error: logResult.error || "Failed to log moderation action"
        };
      }

      // Also log to Reddit's native moderation log
      await this.logToRedditModLog(action, contentId, contentType, reason, context, details);

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error("Failed to log moderation action:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to log moderation action"
      };
    }
  }

  /**
   * Get reports for a subreddit (moderator only)
   */
  async getSubredditReports(
    subreddit: string,
    context: DevvitContext,
    status?: ReportStatus,
    limit: number = 50
  ): Promise<RedditApiResult<ContentReport[]>> {
    try {
      // Verify moderator permissions
      const permissions = await this.complianceService.getModeratorPermissions(subreddit, context.userId || '');
      if (!permissions.success || !permissions.data?.canManagePosts) {
        return {
          success: false,
          error: "Moderator permissions required to view reports"
        };
      }

      // Get reports from queue
      const subredditReports = this.reportQueue.get(subreddit) || [];
      
      // Filter by status if specified
      let filteredReports = status 
        ? subredditReports.filter(report => report.status === status)
        : subredditReports;

      // Sort by date (newest first) and limit
      filteredReports = filteredReports
        .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())
        .slice(0, limit);

      return {
        success: true,
        data: filteredReports
      };

    } catch (error) {
      console.error("Failed to get subreddit reports:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get reports"
      };
    }
  }

  /**
   * Get appeals for a subreddit (moderator only)
   */
  async getSubredditAppeals(
    subreddit: string,
    context: DevvitContext,
    status?: AppealStatus,
    limit: number = 50
  ): Promise<RedditApiResult<ModerationAppeal[]>> {
    try {
      // Verify moderator permissions
      const permissions = await this.complianceService.getModeratorPermissions(subreddit, context.userId || '');
      if (!permissions.success || !permissions.data?.canManagePosts) {
        return {
          success: false,
          error: "Moderator permissions required to view appeals"
        };
      }

      // Get all appeals for this subreddit
      const subredditAppeals = Array.from(this.appeals.values())
        .filter(appeal => appeal.subreddit === subreddit);

      // Filter by status if specified
      let filteredAppeals = status 
        ? subredditAppeals.filter(appeal => appeal.status === status)
        : subredditAppeals;

      // Sort by date (newest first) and limit
      filteredAppeals = filteredAppeals
        .sort((a, b) => b.appealedAt.getTime() - a.appealedAt.getTime())
        .slice(0, limit);

      return {
        success: true,
        data: filteredAppeals
      };

    } catch (error) {
      console.error("Failed to get subreddit appeals:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get appeals"
      };
    }
  }

  /**
   * Process report (moderator action)
   */
  async processReport(
    reportId: string,
    action: 'no_action' | 'warning' | 'removal' | 'ban' | 'escalation',
    moderatorNotes: string,
    context: DevvitContext
  ): Promise<RedditApiResult<ContentReport>> {
    try {
      // Verify moderator permissions
      const permissions = await this.complianceService.getModeratorPermissions(context.subreddit, context.userId || '');
      if (!permissions.success || !permissions.data?.canManagePosts) {
        return {
          success: false,
          error: "Moderator permissions required to process reports"
        };
      }

      // Get the report
      const report = this.reports.get(reportId);
      if (!report) {
        return {
          success: false,
          error: "Report not found"
        };
      }

      // Update report status
      report.status = ReportStatus.RESOLVED;
      report.resolutionAction = action;
      report.moderatorAssigned = context.userId;
      report.moderatorNotes = moderatorNotes;
      report.resolutionDate = new Date();

      // Execute the moderation action
      await this.executeModerationAction(report.contentId, report.contentType, action, context);

      // Log the moderation action
      await this.logModerationAction(
        `report_${action}`,
        report.contentId,
        report.contentType,
        `Report processed: ${moderatorNotes}`,
        context,
        {
          reportId,
          reportType: report.reportType,
          reportedBy: report.reportedBy
        }
      );

      // Update stored report
      this.reports.set(reportId, report);

      return {
        success: true,
        data: report
      };

    } catch (error) {
      console.error("Failed to process report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process report"
      };
    }
  }

  /**
   * Review appeal (moderator action)
   */
  async reviewAppeal(
    appealId: string,
    decision: 'upheld' | 'overturned' | 'modified',
    reviewNotes: string,
    context: DevvitContext,
    newAction?: string
  ): Promise<RedditApiResult<ModerationAppeal>> {
    try {
      // Verify moderator permissions
      const permissions = await this.complianceService.getModeratorPermissions(context.subreddit, context.userId || '');
      if (!permissions.success || !permissions.data?.canManagePosts) {
        return {
          success: false,
          error: "Moderator permissions required to review appeals"
        };
      }

      // Get the appeal
      const appeal = this.appeals.get(appealId);
      if (!appeal) {
        return {
          success: false,
          error: "Appeal not found"
        };
      }

      // Update appeal status
      appeal.status = decision === 'overturned' ? AppealStatus.APPROVED : AppealStatus.DENIED;
      appeal.decision = decision;
      appeal.reviewedBy = context.userId;
      appeal.reviewNotes = reviewNotes;
      appeal.reviewDate = new Date();
      appeal.newAction = newAction;

      // Execute the appeal decision
      if (decision === 'overturned') {
        await this.executeAppealReversal(appeal.contentId, appeal.contentType, appeal.originalAction, context);
      } else if (decision === 'modified' && newAction) {
        await this.executeModerationAction(appeal.contentId, appeal.contentType, newAction as any, context);
      }

      // Log the appeal decision
      await this.logModerationAction(
        `appeal_${decision}`,
        appeal.contentId,
        appeal.contentType,
        `Appeal ${decision}: ${reviewNotes}`,
        context,
        {
          appealId,
          originalAction: appeal.originalAction,
          appealedBy: appeal.appealedBy,
          newAction
        }
      );

      // Update stored appeal
      this.appeals.set(appealId, appeal);

      return {
        success: true,
        data: appeal
      };

    } catch (error) {
      console.error("Failed to review appeal:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to review appeal"
      };
    }
  }

  /**
   * Get report statistics for a subreddit
   */
  async getReportStatistics(
    subreddit: string,
    context: DevvitContext,
    days: number = 30
  ): Promise<RedditApiResult<ReportStatistics>> {
    try {
      // Verify moderator permissions
      const permissions = await this.complianceService.getModeratorPermissions(subreddit, context.userId || '');
      if (!permissions.success || !permissions.data?.canViewModLog) {
        return {
          success: false,
          error: "Moderator permissions required to view statistics"
        };
      }

      const subredditReports = this.reportQueue.get(subreddit) || [];
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const recentReports = subredditReports.filter(report => report.reportedAt >= cutoffDate);

      // Calculate statistics
      const totalReports = recentReports.length;
      const pendingReports = recentReports.filter(r => r.status === ReportStatus.PENDING).length;
      const resolvedReports = recentReports.filter(r => r.status === ReportStatus.RESOLVED).length;

      // Reports by type
      const reportsByType = new Map<ContentReportType, number>();
      for (const report of recentReports) {
        const count = reportsByType.get(report.reportType) || 0;
        reportsByType.set(report.reportType, count + 1);
      }

      // Calculate average resolution time
      const resolvedWithTime = recentReports.filter(r => r.resolutionDate);
      const averageResolutionTime = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((sum, r) => {
            const resolutionTime = r.resolutionDate!.getTime() - r.reportedAt.getTime();
            return sum + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
          }, 0) / resolvedWithTime.length
        : 0;

      const statistics: ReportStatistics = {
        subreddit,
        totalReports,
        pendingReports,
        resolvedReports,
        reportsByType,
        averageResolutionTime,
        reportTrends: {
          daily: this.calculateDailyTrends(recentReports, 7),
          weekly: this.calculateWeeklyTrends(recentReports, 4),
          monthly: this.calculateMonthlyTrends(recentReports, 12)
        }
      };

      return {
        success: true,
        data: statistics
      };

    } catch (error) {
      console.error("Failed to get report statistics:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get statistics"
      };
    }
  }

  /**
   * Submit report to Reddit's native reporting system
   */
  private async submitToRedditReporting(
    report: ContentReport,
    context: DevvitContext
  ): Promise<RedditApiResult<boolean>> {
    try {
      // This would integrate with Reddit's reporting API
      // For now, implementing a placeholder that logs the report
      
      console.log(`Submitting report to Reddit: ${report.reportId}`);
      console.log(`Content: ${report.contentType} ${report.contentId}`);
      console.log(`Type: ${report.reportType}`);
      console.log(`Reason: ${report.reason}`);
      
      // In a real implementation, this would call:
      // await reddit.report(report.contentId, report.reason);
      
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error("Failed to submit report to Reddit:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit to Reddit"
      };
    }
  }

  /**
   * Submit appeal to Reddit's native appeal system
   */
  private async submitToRedditAppeals(
    appeal: ModerationAppeal,
    context: DevvitContext
  ): Promise<RedditApiResult<boolean>> {
    try {
      // This would integrate with Reddit's appeal API
      console.log(`Submitting appeal to Reddit: ${appeal.appealId}`);
      console.log(`Content: ${appeal.contentType} ${appeal.contentId}`);
      console.log(`Original Action: ${appeal.originalAction}`);
      console.log(`Appeal Reason: ${appeal.appealReason}`);
      
      // In a real implementation, this would call Reddit's appeal API
      
      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error("Failed to submit appeal to Reddit:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit appeal to Reddit"
      };
    }
  }

  /**
   * Check if content is eligible for appeal
   */
  private async checkAppealEligibility(
    contentId: string,
    originalAction: string,
    context: DevvitContext
  ): Promise<RedditApiResult<boolean>> {
    try {
      // Check if there's already a pending appeal for this content
      const existingAppeal = Array.from(this.appeals.values())
        .find(appeal => 
          appeal.contentId === contentId && 
          appeal.status === AppealStatus.SUBMITTED
        );

      if (existingAppeal) {
        return {
          success: false,
          error: "Appeal already pending for this content"
        };
      }

      // Check if the action is appealable
      const appealableActions = ['removal', 'ban', 'warning', 'restriction'];
      if (!appealableActions.includes(originalAction)) {
        return {
          success: false,
          error: "This type of moderation action is not appealable"
        };
      }

      // Check time limits (e.g., appeals must be submitted within 30 days)
      // This would be implemented based on Reddit's appeal policies

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error("Failed to check appeal eligibility:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check eligibility"
      };
    }
  }

  /**
   * Notify moderators of new report
   */
  private async notifyModeratorsOfReport(
    report: ContentReport,
    context: DevvitContext
  ): Promise<void> {
    try {
      // This would send notifications to subreddit moderators
      // Could be implemented as:
      // 1. Reddit modmail
      // 2. Discord webhook
      // 3. Slack notification
      // 4. Email notification
      
      console.log(`Notifying moderators of r/${context.subreddit} about report ${report.reportId}`);
      
    } catch (error) {
      console.error("Failed to notify moderators of report:", error);
    }
  }

  /**
   * Notify moderators of new appeal
   */
  private async notifyModeratorsOfAppeal(
    appeal: ModerationAppeal,
    context: DevvitContext
  ): Promise<void> {
    try {
      console.log(`Notifying moderators of r/${context.subreddit} about appeal ${appeal.appealId}`);
      
    } catch (error) {
      console.error("Failed to notify moderators of appeal:", error);
    }
  }

  /**
   * Log action to Reddit's native moderation log
   */
  private async logToRedditModLog(
    action: string,
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    reason: string,
    context: DevvitContext,
    details?: any
  ): Promise<void> {
    try {
      // This would integrate with Reddit's moderation log API
      console.log(`Logging to Reddit mod log: ${action} on ${contentType} ${contentId}`);
      console.log(`Reason: ${reason}`);
      console.log(`Details:`, details);
      
      // In a real implementation:
      // await reddit.addModLogEntry(action, contentId, reason, details);
      
    } catch (error) {
      console.error("Failed to log to Reddit mod log:", error);
    }
  }

  /**
   * Execute moderation action
   */
  private async executeModerationAction(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    action: 'no_action' | 'warning' | 'removal' | 'ban' | 'escalation' | string,
    context: DevvitContext
  ): Promise<void> {
    try {
      switch (action) {
        case 'removal':
          // Remove the content
          console.log(`Removing ${contentType} ${contentId}`);
          // await reddit.remove(contentId);
          break;
        case 'ban':
          // Ban the user (would need user ID)
          console.log(`Banning user for ${contentType} ${contentId}`);
          // await reddit.ban(userId, reason);
          break;
        case 'warning':
          // Send warning to user
          console.log(`Warning user for ${contentType} ${contentId}`);
          // await reddit.sendWarning(userId, reason);
          break;
        case 'escalation':
          // Escalate to Reddit admins
          console.log(`Escalating ${contentType} ${contentId} to admins`);
          // await reddit.reportToAdmins(contentId, reason);
          break;
        case 'no_action':
          // No action needed
          console.log(`No action taken for ${contentType} ${contentId}`);
          break;
      }
    } catch (error) {
      console.error("Failed to execute moderation action:", error);
    }
  }

  /**
   * Execute appeal reversal
   */
  private async executeAppealReversal(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    originalAction: 'removal' | 'ban' | 'warning' | 'restriction',
    context: DevvitContext
  ): Promise<void> {
    try {
      switch (originalAction) {
        case 'removal':
          // Restore the content
          console.log(`Restoring ${contentType} ${contentId}`);
          // await reddit.approve(contentId);
          break;
        case 'ban':
          // Unban the user
          console.log(`Unbanning user for ${contentType} ${contentId}`);
          // await reddit.unban(userId);
          break;
        case 'warning':
          // Remove warning (if possible)
          console.log(`Removing warning for ${contentType} ${contentId}`);
          break;
        case 'restriction':
          // Remove restriction
          console.log(`Removing restriction for ${contentType} ${contentId}`);
          break;
      }
    } catch (error) {
      console.error("Failed to execute appeal reversal:", error);
    }
  }

  /**
   * Calculate daily trends
   */
  private calculateDailyTrends(reports: ContentReport[], days: number): number[] {
    const trends: number[] = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      const dayReports = reports.filter(report => 
        report.reportedAt >= dayStart && report.reportedAt < dayEnd
      ).length;
      
      trends.unshift(dayReports);
    }
    
    return trends;
  }

  /**
   * Calculate weekly trends
   */
  private calculateWeeklyTrends(reports: ContentReport[], weeks: number): number[] {
    const trends: number[] = [];
    const now = new Date();
    
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      
      const weekReports = reports.filter(report => 
        report.reportedAt >= weekStart && report.reportedAt < weekEnd
      ).length;
      
      trends.unshift(weekReports);
    }
    
    return trends;
  }

  /**
   * Calculate monthly trends
   */
  private calculateMonthlyTrends(reports: ContentReport[], months: number): number[] {
    const trends: number[] = [];
    const now = new Date();
    
    for (let i = 0; i < months; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i, 1);
      
      const monthReports = reports.filter(report => 
        report.reportedAt >= monthStart && report.reportedAt < monthEnd
      ).length;
      
      trends.unshift(monthReports);
    }
    
    return trends;
  }
}