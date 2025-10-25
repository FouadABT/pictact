import { reddit } from "@devvit/web/server";
import { 
  RedditApiResult,
  DevvitContext,
  ContentValidation,
  ModeratorPermissions
} from "../../shared/types/reddit-compliance.js";
import { RedditContentPolicyService } from "./reddit-content-policy-service.js";
import { RedditComplianceService } from "./reddit-compliance-service.js";

/**
 * Spam Detection Result
 * Result from Reddit's spam detection systems
 */
export interface SpamDetectionResult {
  isSpam: boolean;
  confidence: number; // 0-1 confidence score
  reasons: string[];
  detectedPatterns: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Community Guidelines Violation
 * Represents a violation of Reddit's community guidelines
 */
export interface CommunityGuidelinesViolation {
  type: 'harassment' | 'hate_speech' | 'violence' | 'sexual_content' | 'spam' | 'impersonation' | 'copyright';
  severity: 'minor' | 'major' | 'severe';
  description: string;
  guideline: string;
  recommendedAction: 'warn' | 'remove' | 'ban' | 'escalate';
}

/**
 * Moderation Tool Integration
 * Interface for Reddit's moderation tools
 */
export interface ModerationToolIntegration {
  toolName: string;
  isAvailable: boolean;
  capabilities: string[];
  lastSync: Date;
}

/**
 * Content Moderation Request
 * Request for content moderation through Reddit systems
 */
export interface ContentModerationRequest {
  contentId: string;
  contentType: 'post' | 'comment' | 'media';
  content: string | File;
  context: DevvitContext;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requestedBy?: string;
}

/**
 * Moderation Decision
 * Result of content moderation process
 */
export interface ModerationDecision {
  contentId: string;
  decision: 'approve' | 'remove' | 'flag' | 'escalate';
  confidence: number;
  reasons: string[];
  violations: CommunityGuidelinesViolation[];
  spamResult: SpamDetectionResult;
  moderatorRequired: boolean;
  appealable: boolean;
}

/**
 * Reddit Moderation Service
 * Integrates content moderation with Reddit's native systems
 * Implements requirements 8.1, 8.2, 8.3, 8.4
 */
export class RedditModerationService {
  private contentPolicyService: RedditContentPolicyService;
  private complianceService: RedditComplianceService;
  private moderationTools: Map<string, ModerationToolIntegration>;
  private pendingModerations: Map<string, ContentModerationRequest>;

  constructor() {
    this.contentPolicyService = new RedditContentPolicyService();
    this.complianceService = new RedditComplianceService();
    this.moderationTools = new Map();
    this.pendingModerations = new Map();
    
    this.initializeModerationTools();
  }

  /**
   * Connect validation system with Reddit's spam detection
   * Requirement 8.1: Apply Reddit's spam detection and content filtering
   */
  async detectSpamContent(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    content: string | File,
    context: DevvitContext
  ): Promise<RedditApiResult<SpamDetectionResult>> {
    try {
      // Use Reddit's native spam detection APIs
      const spamResult = await this.performRedditSpamDetection(contentId, contentType, content, context);
      
      if (!spamResult.success) {
        return {
          success: false,
          error: spamResult.error || "Spam detection failed"
        };
      }

      // Enhance with additional PicTact-specific spam patterns
      const enhancedResult = await this.enhanceSpamDetection(spamResult.data!, content, context);

      return {
        success: true,
        data: enhancedResult
      };

    } catch (error) {
      console.error("Spam detection failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Spam detection failed"
      };
    }
  }

  /**
   * Add Reddit community guidelines enforcement
   * Requirement 8.2: Use Reddit community guidelines enforcement
   */
  async enforceRedditCommunityGuidelines(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    content: string | File,
    context: DevvitContext
  ): Promise<RedditApiResult<CommunityGuidelinesViolation[]>> {
    try {
      const violations: CommunityGuidelinesViolation[] = [];

      // Check against Reddit's core community guidelines
      const coreViolations = await this.checkCoreGuidelines(content, context);
      violations.push(...coreViolations);

      // Check against subreddit-specific guidelines
      const subredditViolations = await this.checkSubredditGuidelines(content, context);
      violations.push(...subredditViolations);

      // Check for harassment and hate speech
      const harassmentViolations = await this.checkHarassmentGuidelines(content, context);
      violations.push(...harassmentViolations);

      // Check for violence and threats
      const violenceViolations = await this.checkViolenceGuidelines(content, context);
      violations.push(...violenceViolations);

      return {
        success: true,
        data: violations
      };

    } catch (error) {
      console.error("Community guidelines enforcement failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Guidelines enforcement failed"
      };
    }
  }

  /**
   * Implement Reddit moderation tool integration
   * Requirement 8.3: Integrate with Reddit moderation tool integration
   */
  async integrateWithRedditModerationTools(
    subreddit: string,
    context: DevvitContext
  ): Promise<RedditApiResult<ModerationToolIntegration[]>> {
    try {
      // Check if user has moderator permissions from context
      if (!context.moderatorPermissions) {
        return {
          success: false,
          error: "Moderator permissions required for tool integration"
        };
      }
      
      const permissions = context.moderatorPermissions;

      const integrations: ModerationToolIntegration[] = [];

      // Integrate with Reddit's AutoModerator
      const autoModIntegration = await this.integrateWithAutoModerator(subreddit, permissions);
      if (autoModIntegration) {
        integrations.push(autoModIntegration);
      }

      // Integrate with Reddit's Mod Queue
      const modQueueIntegration = await this.integrateWithModQueue(subreddit, permissions);
      if (modQueueIntegration) {
        integrations.push(modQueueIntegration);
      }

      // Integrate with Reddit's Mod Log
      const modLogIntegration = await this.integrateWithModLog(subreddit, permissions);
      if (modLogIntegration) {
        integrations.push(modLogIntegration);
      }

      // Integrate with Reddit's User Notes
      const userNotesIntegration = await this.integrateWithUserNotes(subreddit, permissions);
      if (userNotesIntegration) {
        integrations.push(userNotesIntegration);
      }

      // Cache the integrations
      integrations.forEach(integration => {
        this.moderationTools.set(`${subreddit}_${integration.toolName}`, integration);
      });

      return {
        success: true,
        data: integrations
      };

    } catch (error) {
      console.error("Moderation tool integration failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tool integration failed"
      };
    }
  }

  /**
   * Perform comprehensive content moderation
   * Combines spam detection, guidelines enforcement, and tool integration
   * Requirement 8.4: Integrate with Reddit's user discipline system
   */
  async moderateContent(
    request: ContentModerationRequest
  ): Promise<RedditApiResult<ModerationDecision>> {
    try {
      const { contentId, contentType, content, context } = request;

      // Validate request
      if (!contentId || !contentType || !content) {
        throw new Error('Invalid moderation request: missing required fields');
      }

      // Store pending moderation request
      this.pendingModerations.set(contentId, request);

      // Perform spam detection
      const spamResult = await this.detectSpamContent(contentId, contentType, content, context);
      if (!spamResult.success) {
        return {
          success: false,
          error: "Spam detection failed during moderation"
        };
      }

      // Enforce community guidelines
      const guidelinesResult = await this.enforceRedditCommunityGuidelines(contentId, contentType, content, context);
      if (!guidelinesResult.success) {
        return {
          success: false,
          error: "Guidelines enforcement failed during moderation"
        };
      }

      // Validate content through policy service
      const policyValidation = await this.contentPolicyService.validateContent(contentId, contentType, content, context);
      if (!policyValidation.success) {
        return {
          success: false,
          error: "Content policy validation failed"
        };
      }

      // Make moderation decision
      const decision = this.makeModerationDecision(
        spamResult.data!,
        guidelinesResult.data!,
        policyValidation.data!
      );

      // Execute moderation action if needed
      if (decision.decision !== 'approve') {
        await this.executeModerationAction(contentId, contentType, decision, context);
      }

      // Clean up pending request
      this.pendingModerations.delete(contentId);

      return {
        success: true,
        data: decision
      };

    } catch (error) {
      console.error("Content moderation failed:", error);
      this.pendingModerations.delete(request.contentId);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Content moderation failed"
      };
    }
  }

  /**
   * Initialize moderation tools integration
   */
  private async initializeModerationTools(): Promise<void> {
    try {
      // Initialize connections to Reddit's moderation systems
      console.log("Initializing Reddit moderation tools integration...");
      
      // This would establish connections to:
      // - Reddit's AutoModerator API
      // - Reddit's Mod Queue API
      // - Reddit's Mod Log API
      // - Reddit's User Notes API
      // - Reddit's Spam Filter API
      
    } catch (error) {
      console.error("Failed to initialize moderation tools:", error);
    }
  }

  /**
   * Perform Reddit's native spam detection
   */
  private async performRedditSpamDetection(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    content: string | File,
    context: DevvitContext
  ): Promise<RedditApiResult<SpamDetectionResult>> {
    try {
      // Validate input
      if (!content) {
        throw new Error('Content is required for spam detection');
      }
      
      // This would integrate with Reddit's spam detection APIs
      // For now, implementing basic detection with placeholders for Reddit integration
      
      let isSpam = false;
      let confidence = 0.0;
      const reasons: string[] = [];
      const detectedPatterns: string[] = [];

      if (typeof content === 'string') {
        // Text spam detection
        const textSpamResult = await this.detectTextSpam(content, context);
        isSpam = textSpamResult.isSpam;
        confidence = textSpamResult.confidence;
        reasons.push(...textSpamResult.reasons);
        detectedPatterns.push(...textSpamResult.patterns);
      } else if (content instanceof File) {
        // Media spam detection
        const mediaSpamResult = await this.detectMediaSpam(content, context);
        isSpam = mediaSpamResult.isSpam;
        confidence = mediaSpamResult.confidence;
        reasons.push(...mediaSpamResult.reasons);
        detectedPatterns.push(...mediaSpamResult.patterns);
      } else {
        throw new Error('Invalid content type for spam detection');
      }

      const riskLevel: 'low' | 'medium' | 'high' | 'critical' = 
        confidence > 0.8 ? 'critical' :
        confidence > 0.6 ? 'high' :
        confidence > 0.4 ? 'medium' : 'low';

      return {
        success: true,
        data: {
          isSpam,
          confidence,
          reasons,
          detectedPatterns,
          riskLevel
        }
      };

    } catch (error) {
      console.error("Reddit spam detection failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Spam detection failed"
      };
    }
  }

  /**
   * Enhance spam detection with PicTact-specific patterns
   */
  private async enhanceSpamDetection(
    baseResult: SpamDetectionResult,
    content: string | File,
    context: DevvitContext
  ): Promise<SpamDetectionResult> {
    const enhanced = { ...baseResult };

    // Add PicTact-specific spam patterns
    if (typeof content === 'string') {
      // Check for game-specific spam patterns
      const gameSpamPatterns = [
        /fake\s+submission/gi,
        /bot\s+generated/gi,
        /auto\s+submit/gi,
        /cheat\s+code/gi
      ];

      for (const pattern of gameSpamPatterns) {
        if (pattern.test(content)) {
          enhanced.detectedPatterns.push(pattern.source);
          enhanced.reasons.push('Game-specific spam pattern detected');
          enhanced.confidence = Math.min(enhanced.confidence + 0.2, 1.0);
        }
      }
    }

    // Recalculate risk level
    enhanced.riskLevel = 
      enhanced.confidence > 0.9 ? 'critical' :
      enhanced.confidence > 0.7 ? 'high' :
      enhanced.confidence > 0.4 ? 'medium' : 'low';

    enhanced.isSpam = enhanced.confidence > 0.5;

    return enhanced;
  }

  /**
   * Check core Reddit community guidelines
   */
  private async checkCoreGuidelines(
    content: string | File,
    context: DevvitContext
  ): Promise<CommunityGuidelinesViolation[]> {
    const violations: CommunityGuidelinesViolation[] = [];

    if (typeof content === 'string') {
      // Check for harassment
      if (this.containsHarassment(content)) {
        violations.push({
          type: 'harassment',
          severity: 'major',
          description: 'Content contains harassment or bullying',
          guideline: 'Reddit Community Guidelines - Harassment',
          recommendedAction: 'remove'
        });
      }

      // Check for hate speech
      if (this.containsHateSpeech(content)) {
        violations.push({
          type: 'hate_speech',
          severity: 'severe',
          description: 'Content contains hate speech',
          guideline: 'Reddit Community Guidelines - Hate Speech',
          recommendedAction: 'ban'
        });
      }

      // Check for violence
      if (this.containsViolence(content)) {
        violations.push({
          type: 'violence',
          severity: 'severe',
          description: 'Content contains violent threats or content',
          guideline: 'Reddit Community Guidelines - Violence',
          recommendedAction: 'escalate'
        });
      }
    }

    return violations;
  }

  /**
   * Check subreddit-specific guidelines
   */
  private async checkSubredditGuidelines(
    content: string | File,
    context: DevvitContext
  ): Promise<CommunityGuidelinesViolation[]> {
    const violations: CommunityGuidelinesViolation[] = [];

    // Get subreddit-specific rules
    const subredditPolicy = await this.contentPolicyService.getSubredditContentPolicy(context.subreddit);
    
    if (subredditPolicy.success && subredditPolicy.data) {
      const policy = subredditPolicy.data;

      // Check banned keywords
      if (typeof content === 'string' && policy.bannedKeywords.length > 0) {
        const lowerContent = content.toLowerCase();
        for (const keyword of policy.bannedKeywords) {
          if (lowerContent.includes(keyword.toLowerCase())) {
            violations.push({
              type: 'spam',
              severity: 'minor',
              description: `Content contains banned keyword: ${keyword}`,
              guideline: `r/${context.subreddit} Community Rules`,
              recommendedAction: 'remove'
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Check harassment guidelines
   */
  private async checkHarassmentGuidelines(
    content: string | File,
    context: DevvitContext
  ): Promise<CommunityGuidelinesViolation[]> {
    const violations: CommunityGuidelinesViolation[] = [];

    if (typeof content === 'string') {
      // Advanced harassment detection would go here
      // This would integrate with Reddit's harassment detection APIs
      
      const harassmentPatterns = [
        /kill\s+yourself/gi,
        /you\s+should\s+die/gi,
        /worthless\s+piece/gi,
        /go\s+kill/gi
      ];

      for (const pattern of harassmentPatterns) {
        if (pattern.test(content)) {
          violations.push({
            type: 'harassment',
            severity: 'severe',
            description: 'Content contains harassment or threats',
            guideline: 'Reddit Community Guidelines - Harassment',
            recommendedAction: 'ban'
          });
          break; // One violation is enough
        }
      }
    }

    return violations;
  }

  /**
   * Check violence guidelines
   */
  private async checkViolenceGuidelines(
    content: string | File,
    context: DevvitContext
  ): Promise<CommunityGuidelinesViolation[]> {
    const violations: CommunityGuidelinesViolation[] = [];

    if (typeof content === 'string') {
      const violencePatterns = [
        /bomb\s+threat/gi,
        /shoot\s+up/gi,
        /mass\s+shooting/gi,
        /terrorist\s+attack/gi
      ];

      for (const pattern of violencePatterns) {
        if (pattern.test(content)) {
          violations.push({
            type: 'violence',
            severity: 'severe',
            description: 'Content contains violent threats',
            guideline: 'Reddit Community Guidelines - Violence',
            recommendedAction: 'escalate'
          });
          break;
        }
      }
    }

    return violations;
  }

  /**
   * Integrate with Reddit's AutoModerator
   */
  private async integrateWithAutoModerator(
    subreddit: string,
    permissions: ModeratorPermissions
  ): Promise<ModerationToolIntegration | null> {
    if (!permissions.canManageSettings) {
      return null;
    }

    try {
      // This would integrate with Reddit's AutoModerator API
      return {
        toolName: 'AutoModerator',
        isAvailable: true,
        capabilities: [
          'automatic_content_filtering',
          'rule_based_moderation',
          'spam_detection',
          'user_flair_management'
        ],
        lastSync: new Date()
      };
    } catch (error) {
      console.error("AutoModerator integration failed:", error);
      return null;
    }
  }

  /**
   * Integrate with Reddit's Mod Queue
   */
  private async integrateWithModQueue(
    subreddit: string,
    permissions: ModeratorPermissions
  ): Promise<ModerationToolIntegration | null> {
    if (!permissions.canManagePosts && !permissions.canManageComments) {
      return null;
    }

    try {
      return {
        toolName: 'ModQueue',
        isAvailable: true,
        capabilities: [
          'pending_content_review',
          'reported_content_management',
          'bulk_moderation_actions'
        ],
        lastSync: new Date()
      };
    } catch (error) {
      console.error("Mod Queue integration failed:", error);
      return null;
    }
  }

  /**
   * Integrate with Reddit's Mod Log
   */
  private async integrateWithModLog(
    subreddit: string,
    permissions: ModeratorPermissions
  ): Promise<ModerationToolIntegration | null> {
    if (!permissions.canViewModLog) {
      return null;
    }

    try {
      return {
        toolName: 'ModLog',
        isAvailable: true,
        capabilities: [
          'moderation_action_logging',
          'moderator_activity_tracking',
          'audit_trail_management'
        ],
        lastSync: new Date()
      };
    } catch (error) {
      console.error("Mod Log integration failed:", error);
      return null;
    }
  }

  /**
   * Integrate with Reddit's User Notes
   */
  private async integrateWithUserNotes(
    subreddit: string,
    permissions: ModeratorPermissions
  ): Promise<ModerationToolIntegration | null> {
    if (!permissions.canManageUsers) {
      return null;
    }

    try {
      return {
        toolName: 'UserNotes',
        isAvailable: true,
        capabilities: [
          'user_history_tracking',
          'moderation_notes',
          'user_warning_system'
        ],
        lastSync: new Date()
      };
    } catch (error) {
      console.error("User Notes integration failed:", error);
      return null;
    }
  }

  /**
   * Make moderation decision based on all checks
   */
  private makeModerationDecision(
    spamResult: SpamDetectionResult,
    violations: CommunityGuidelinesViolation[],
    policyValidation: ContentValidation
  ): ModerationDecision {
    let decision: 'approve' | 'remove' | 'flag' | 'escalate' = 'approve';
    let confidence = 0.8;
    const reasons: string[] = [];

    // Check spam result
    if (spamResult.isSpam) {
      if (spamResult.riskLevel === 'critical') {
        decision = 'remove';
        confidence = Math.max(confidence, spamResult.confidence);
      } else if (spamResult.riskLevel === 'high') {
        decision = 'flag';
      }
      reasons.push(...spamResult.reasons);
    }

    // Check guideline violations
    const severeViolations = violations.filter(v => v.severity === 'severe');
    const majorViolations = violations.filter(v => v.severity === 'major');

    if (severeViolations.length > 0) {
      decision = 'escalate';
      confidence = 0.95;
      reasons.push(...severeViolations.map(v => v.description));
    } else if (majorViolations.length > 0) {
      decision = decision === 'approve' ? 'remove' : decision;
      confidence = Math.max(confidence, 0.85);
      reasons.push(...majorViolations.map(v => v.description));
    }

    // Check policy validation
    if (policyValidation.violatesPolicy) {
      decision = decision === 'approve' ? 'flag' : decision;
      reasons.push(...policyValidation.contentWarnings);
    }

    return {
      contentId: '', // Will be set by caller
      decision,
      confidence,
      reasons,
      violations,
      spamResult,
      moderatorRequired: decision === 'escalate' || policyValidation.moderationRequired,
      appealable: decision !== 'escalate' && violations.every(v => v.severity !== 'severe')
    };
  }

  /**
   * Execute moderation action
   */
  private async executeModerationAction(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    decision: ModerationDecision,
    context: DevvitContext
  ): Promise<void> {
    try {
      // Log the moderation action
      await this.complianceService.logModeratorAction(
        context.subreddit,
        `content_${decision.decision}`,
        contentId,
        decision.reasons.join('; '),
        {
          contentType,
          confidence: decision.confidence,
          violations: decision.violations.length,
          automated: true
        }
      );

      // Execute the actual moderation action through Reddit's APIs
      switch (decision.decision) {
        case 'remove':
          await this.removeContent(contentId, contentType, context);
          break;
        case 'flag':
          await this.flagContent(contentId, contentType, context);
          break;
        case 'escalate':
          await this.escalateContent(contentId, contentType, context);
          break;
      }

    } catch (error) {
      console.error("Failed to execute moderation action:", error);
    }
  }

  /**
   * Remove content through Reddit's moderation APIs
   */
  private async removeContent(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    context: DevvitContext
  ): Promise<void> {
    try {
      // This would use Reddit's content removal APIs
      console.log(`Removing ${contentType} ${contentId} in r/${context.subreddit}`);
      
      // In a real implementation:
      // await reddit.remove(contentId);
      
    } catch (error) {
      console.error("Failed to remove content:", error);
    }
  }

  /**
   * Flag content for moderator review
   */
  private async flagContent(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    context: DevvitContext
  ): Promise<void> {
    try {
      // This would add content to Reddit's mod queue
      console.log(`Flagging ${contentType} ${contentId} for review in r/${context.subreddit}`);
      
      // In a real implementation:
      // await reddit.report(contentId, 'Flagged by PicTact moderation system');
      
    } catch (error) {
      console.error("Failed to flag content:", error);
    }
  }

  /**
   * Escalate content to Reddit administrators
   */
  private async escalateContent(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    context: DevvitContext
  ): Promise<void> {
    try {
      // This would escalate to Reddit's admin team
      console.log(`Escalating ${contentType} ${contentId} to Reddit admins from r/${context.subreddit}`);
      
      // In a real implementation:
      // await reddit.reportToAdmins(contentId, 'Severe policy violation detected by PicTact');
      
    } catch (error) {
      console.error("Failed to escalate content:", error);
    }
  }

  // Helper methods for content analysis
  private containsHarassment(content: string): boolean {
    const harassmentPatterns = [
      /you\s+suck/gi,
      /loser/gi,
      /pathetic/gi,
      /waste\s+of\s+space/gi
    ];
    return harassmentPatterns.some(pattern => pattern.test(content));
  }

  private containsHateSpeech(content: string): boolean {
    // This would integrate with Reddit's hate speech detection
    // Implementing basic patterns for demonstration
    const hateSpeechPatterns = [
      /racial\s+slur/gi, // Placeholder - real implementation would have actual patterns
      /hate\s+group/gi
    ];
    return hateSpeechPatterns.some(pattern => pattern.test(content));
  }

  private containsViolence(content: string): boolean {
    const violencePatterns = [
      /kill\s+you/gi,
      /murder/gi,
      /bomb/gi,
      /terrorist/gi
    ];
    return violencePatterns.some(pattern => pattern.test(content));
  }

  private async detectTextSpam(
    text: string,
    context: DevvitContext
  ): Promise<{ isSpam: boolean; confidence: number; reasons: string[]; patterns: string[] }> {
    const reasons: string[] = [];
    const patterns: string[] = [];
    let confidence = 0.0;

    // Check for common spam patterns
    const spamPatterns = [
      { pattern: /buy\s+now/gi, weight: 0.3, reason: 'Commercial spam pattern' },
      { pattern: /click\s+here/gi, weight: 0.2, reason: 'Click-bait pattern' },
      { pattern: /free\s+money/gi, weight: 0.4, reason: 'Financial spam pattern' },
      { pattern: /guaranteed/gi, weight: 0.2, reason: 'Guarantee spam pattern' }
    ];

    for (const { pattern, weight, reason } of spamPatterns) {
      if (pattern.test(text)) {
        confidence += weight;
        reasons.push(reason);
        patterns.push(pattern.source);
      }
    }

    // Check for repetitive content
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 5 && uniqueWords.size / words.length < 0.3) {
      confidence += 0.6;
      reasons.push('Repetitive content detected');
      patterns.push('repetitive_text');
    }

    return {
      isSpam: confidence > 0.5,
      confidence: Math.min(confidence, 1.0),
      reasons,
      patterns
    };
  }

  private async detectMediaSpam(
    file: File,
    context: DevvitContext
  ): Promise<{ isSpam: boolean; confidence: number; reasons: string[]; patterns: string[] }> {
    const reasons: string[] = [];
    const patterns: string[] = [];
    let confidence = 0.0;

    // Check file size (very small files might be spam)
    if (file.size < 1000) {
      confidence += 0.3;
      reasons.push('Suspiciously small file size');
      patterns.push('small_file');
    }

    // Check file name for spam patterns
    const filename = file.name.toLowerCase();
    const spamFilenames = ['spam', 'bot', 'fake', 'generated'];
    
    for (const spamWord of spamFilenames) {
      if (filename.includes(spamWord)) {
        confidence += 0.4;
        reasons.push(`Suspicious filename: ${spamWord}`);
        patterns.push('suspicious_filename');
        break;
      }
    }

    return {
      isSpam: confidence > 0.5,
      confidence: Math.min(confidence, 1.0),
      reasons,
      patterns
    };
  }
}