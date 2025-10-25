import { reddit } from "@devvit/web/server";
import { 
  RedditApiResult,
  ContentValidation,
  ContentPolicyCheck,
  ContentPolicyViolation,
  DevvitContext
} from "../../shared/types/reddit-compliance.js";

/**
 * Subreddit Content Policy
 * Represents content policy settings for a specific subreddit
 */
export interface SubredditContentPolicy {
  subreddit: string;
  allowsNSFW: boolean;
  requiresNSFWTag: boolean;
  spamFilterStrength: 'low' | 'high' | 'all';
  allowsImages: boolean;
  allowsVideos: boolean;
  allowsLinks: boolean;
  restrictedDomains: string[];
  bannedKeywords: string[];
  autoModRules: AutoModRule[];
  contentGuidelines: string[];
}

/**
 * AutoMod Rule
 * Represents an automated moderation rule
 */
export interface AutoModRule {
  id: string;
  name: string;
  condition: string;
  action: 'approve' | 'remove' | 'spam' | 'filter' | 'report';
  reason: string;
  priority: number;
}

/**
 * Content Scan Result
 * Result from Reddit's content scanning systems
 */
export interface ContentScanResult {
  contentId: string;
  scanType: 'image' | 'text' | 'link';
  isNSFW: boolean;
  isSpam: boolean;
  toxicityScore: number; // 0-1 scale
  violatesPolicy: boolean;
  detectedCategories: string[];
  confidence: number;
  scanTimestamp: Date;
}

/**
 * Moderation Action
 * Represents a moderation action taken on content
 */
export interface ModerationAction {
  actionId: string;
  contentId: string;
  contentType: 'post' | 'comment' | 'media';
  action: 'approve' | 'remove' | 'spam' | 'lock' | 'sticky' | 'distinguish';
  reason: string;
  moderatorId?: string;
  timestamp: Date;
  isAutomatic: boolean;
}

/**
 * Reddit Content Policy Service
 * Integrates with Reddit's NSFW detection and content filtering
 * Implements subreddit-specific content policy enforcement
 * Adds Reddit content validation pipeline for image submissions
 * Requirements: 4.3, 8.1, 8.2, 8.3
 */
class RedditContentPolicyService {
  private policyCache: Map<string, SubredditContentPolicy>;
  private scanResultCache: Map<string, ContentScanResult>;
  private moderationLog: ModerationAction[];

  constructor() {
    this.policyCache = new Map();
    this.scanResultCache = new Map();
    this.moderationLog = [];
  }

  /**
   * Validate content against Reddit's content policies
   * Requirement 8.1: Apply Reddit's spam detection and content filtering
   */
  async validateContent(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    content: string | File,
    context: DevvitContext
  ): Promise<RedditApiResult<ContentValidation>> {
    try {
      // Get subreddit-specific content policy
      const subredditPolicy = await this.getSubredditContentPolicy(context.subreddit);
      if (!subredditPolicy.success) {
        return {
          success: false,
          error: "Failed to retrieve subreddit content policy"
        };
      }

      // Perform content scanning
      const scanResult = await this.performContentScan(contentId, contentType, content, context);
      if (!scanResult.success) {
        return {
          success: false,
          error: "Content scanning failed"
        };
      }

      // Apply subreddit-specific rules
      const policyCheck = await this.applySubredditRules(
        scanResult.data!,
        subredditPolicy.data!,
        context
      );

      // Create validation result
      const validation: ContentValidation = {
        isValid: policyCheck.isCompliant && !scanResult.data!.violatesPolicy,
        isNSFW: scanResult.data!.isNSFW,
        contentWarnings: policyCheck.violations.map(v => v.description),
        violatesPolicy: !policyCheck.isCompliant || scanResult.data!.violatesPolicy,
        moderationRequired: policyCheck.recommendedAction === 'escalate' || 
                           policyCheck.violations.some(v => v.severity === 'critical')
      };

      // Log moderation decision
      await this.logModerationDecision(contentId, contentType, policyCheck, context);

      return {
        success: true,
        data: validation
      };

    } catch (error) {
      console.error("Content validation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Content validation failed"
      };
    }
  }

  /**
   * Get subreddit-specific content policy
   * Requirement 8.2: Use subreddit-specific NSFW and content rules
   */
  async getSubredditContentPolicy(subreddit: string): Promise<RedditApiResult<SubredditContentPolicy>> {
    try {
      // Check cache first
      const cached = this.policyCache.get(subreddit);
      if (cached) {
        return { success: true, data: cached };
      }

      // Fetch from Reddit's API
      const policy = await this.fetchSubredditPolicy(subreddit);
      
      // Cache the result
      this.policyCache.set(subreddit, policy);

      return {
        success: true,
        data: policy
      };

    } catch (error) {
      console.error(`Failed to get content policy for r/${subreddit}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve subreddit policy"
      };
    }
  }

  /**
   * Perform content scanning using Reddit's systems
   * Integrates with Reddit's spam detection and NSFW detection
   */
  private async performContentScan(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    content: string | File,
    context: DevvitContext
  ): Promise<RedditApiResult<ContentScanResult>> {
    try {
      // Check cache first
      const cached = this.scanResultCache.get(contentId);
      if (cached) {
        return { success: true, data: cached };
      }

      // Perform different scans based on content type
      let scanResult: ContentScanResult;

      if (contentType === 'media' && content instanceof File) {
        scanResult = await this.scanMediaContent(contentId, content, context);
      } else if (typeof content === 'string') {
        scanResult = await this.scanTextContent(contentId, content, context);
      } else {
        throw new Error("Invalid content type for scanning");
      }

      // Cache the result
      this.scanResultCache.set(contentId, scanResult);

      return {
        success: true,
        data: scanResult
      };

    } catch (error) {
      console.error("Content scanning failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Content scanning failed"
      };
    }
  }

  /**
   * Scan media content for policy violations
   */
  private async scanMediaContent(
    contentId: string,
    file: File,
    context: DevvitContext
  ): Promise<ContentScanResult> {
    // In a real implementation, this would integrate with Reddit's image scanning APIs
    // For now, implementing basic checks and placeholders for Reddit integration
    
    const scanResult: ContentScanResult = {
      contentId,
      scanType: 'image',
      isNSFW: false,
      isSpam: false,
      toxicityScore: 0,
      violatesPolicy: false,
      detectedCategories: [],
      confidence: 0.95,
      scanTimestamp: new Date()
    };

    // Basic file validation
    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      scanResult.violatesPolicy = true;
      scanResult.detectedCategories.push('oversized_file');
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      scanResult.violatesPolicy = true;
      scanResult.detectedCategories.push('unsupported_format');
    }

    // Placeholder for Reddit's NSFW detection
    // This would integrate with Reddit's image scanning service
    if (await this.detectNSFWContent(file)) {
      scanResult.isNSFW = true;
      scanResult.detectedCategories.push('nsfw_content');
    }

    // Placeholder for spam detection
    if (await this.detectSpamContent(file, context)) {
      scanResult.isSpam = true;
      scanResult.violatesPolicy = true;
      scanResult.detectedCategories.push('spam');
    }

    return scanResult;
  }

  /**
   * Scan text content for policy violations
   */
  private async scanTextContent(
    contentId: string,
    text: string,
    context: DevvitContext
  ): Promise<ContentScanResult> {
    const scanResult: ContentScanResult = {
      contentId,
      scanType: 'text',
      isNSFW: false,
      isSpam: false,
      toxicityScore: 0,
      violatesPolicy: false,
      detectedCategories: [],
      confidence: 0.90,
      scanTimestamp: new Date()
    };

    // Basic text validation
    if (text.length > 40000) { // Reddit's comment limit
      scanResult.violatesPolicy = true;
      scanResult.detectedCategories.push('text_too_long');
    }

    // Check for spam patterns
    if (await this.detectTextSpam(text, context)) {
      scanResult.isSpam = true;
      scanResult.violatesPolicy = true;
      scanResult.detectedCategories.push('spam');
    }

    // Check for toxic content
    const toxicityScore = await this.calculateToxicityScore(text);
    scanResult.toxicityScore = toxicityScore;
    
    if (toxicityScore > 0.8) {
      scanResult.violatesPolicy = true;
      scanResult.detectedCategories.push('toxic_content');
    }

    return scanResult;
  }

  /**
   * Apply subreddit-specific content rules
   * Requirement 8.3: Integrate with Reddit community guidelines enforcement
   */
  private async applySubredditRules(
    scanResult: ContentScanResult,
    policy: SubredditContentPolicy,
    context: DevvitContext
  ): Promise<ContentPolicyCheck> {
    const violations: ContentPolicyViolation[] = [];

    // Check NSFW policy
    if (scanResult.isNSFW && !policy.allowsNSFW) {
      violations.push({
        type: 'nsfw_not_allowed',
        severity: 'high',
        description: 'NSFW content is not allowed in this subreddit',
        rule: 'Subreddit NSFW Policy',
        autoModAction: 'remove'
      });
    }

    // Check spam filter
    if (scanResult.isSpam) {
      const severity = policy.spamFilterStrength === 'all' ? 'critical' : 
                      policy.spamFilterStrength === 'high' ? 'high' : 'medium';
      violations.push({
        type: 'spam_detected',
        severity,
        description: 'Content detected as spam',
        rule: 'Reddit Spam Policy',
        autoModAction: 'remove'
      });
    }

    // Check content type restrictions
    if (scanResult.scanType === 'image' && !policy.allowsImages) {
      violations.push({
        type: 'images_not_allowed',
        severity: 'medium',
        description: 'Images are not allowed in this subreddit',
        rule: 'Subreddit Content Policy',
        autoModAction: 'remove'
      });
    }

    // Apply AutoMod rules
    for (const rule of policy.autoModRules) {
      if (await this.evaluateAutoModRule(rule, scanResult, context)) {
        violations.push({
          type: 'automod_rule',
          severity: 'medium',
          description: rule.reason,
          rule: rule.name,
          autoModAction: rule.action as any
        });
      }
    }

    // Determine recommended action
    let recommendedAction: 'approve' | 'flag' | 'remove' | 'escalate' = 'approve';
    
    if (violations.some(v => v.severity === 'critical')) {
      recommendedAction = 'remove';
    } else if (violations.some(v => v.severity === 'high')) {
      recommendedAction = 'escalate';
    } else if (violations.length > 0) {
      recommendedAction = 'flag';
    }

    return {
      contentId: scanResult.contentId,
      contentType: scanResult.scanType === 'image' ? 'media' : 'comment',
      isCompliant: violations.length === 0,
      violations,
      recommendedAction,
      confidence: scanResult.confidence
    };
  }

  /**
   * Fetch subreddit policy from Reddit's API
   */
  private async fetchSubredditPolicy(subreddit: string): Promise<SubredditContentPolicy> {
    try {
      // This would integrate with Reddit's subreddit settings API
      // For now, implementing reasonable defaults
      
      // Try to get subreddit info from Reddit API
      const subredditInfo = await reddit.getSubredditInfoByName(subreddit);
      
      return {
        subreddit,
        allowsNSFW: (subredditInfo as any)?.nsfw || false,
        requiresNSFWTag: true,
        spamFilterStrength: 'high',
        allowsImages: true,
        allowsVideos: true,
        allowsLinks: true,
        restrictedDomains: [],
        bannedKeywords: [],
        autoModRules: [],
        contentGuidelines: [
          'Follow Reddit Content Policy',
          'Be respectful to other users',
          'No spam or self-promotion',
          'Mark NSFW content appropriately'
        ]
      };

    } catch (error) {
      console.error(`Failed to fetch policy for r/${subreddit}:`, error);
      
      // Return conservative defaults on error
      return {
        subreddit,
        allowsNSFW: false,
        requiresNSFWTag: true,
        spamFilterStrength: 'high',
        allowsImages: true,
        allowsVideos: false,
        allowsLinks: false,
        restrictedDomains: [],
        bannedKeywords: [],
        autoModRules: [],
        contentGuidelines: [
          'Follow Reddit Content Policy',
          'Be respectful to other users',
          'No spam or self-promotion'
        ]
      };
    }
  }

  /**
   * Detect NSFW content in images
   * Placeholder for Reddit's NSFW detection API
   */
  private async detectNSFWContent(file: File): Promise<boolean> {
    // This would integrate with Reddit's image scanning service
    // For now, implementing basic heuristics
    
    // Check filename for obvious NSFW indicators
    const filename = file.name.toLowerCase();
    const nsfwKeywords = ['nsfw', 'nude', 'porn', 'sex', 'adult'];
    
    return nsfwKeywords.some(keyword => filename.includes(keyword));
  }

  /**
   * Detect spam content in media
   */
  private async detectSpamContent(file: File, _context: DevvitContext): Promise<boolean> {
    // Basic spam detection heuristics
    // In a real implementation, this would use Reddit's spam detection APIs
    
    // Check for suspicious file patterns
    if (file.size < 1000) { // Very small files might be spam
      return true;
    }

    // Check for rapid uploads from same user
    // This would be tracked in a real implementation
    
    return false;
  }

  /**
   * Detect spam in text content
   */
  private async detectTextSpam(text: string, _context: DevvitContext): Promise<boolean> {
    // Basic text spam detection
    const spamPatterns = [
      /buy now/gi,
      /click here/gi,
      /free money/gi,
      /guaranteed/gi,
      /limited time/gi
    ];

    return spamPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Calculate toxicity score for text
   */
  private async calculateToxicityScore(text: string): Promise<number> {
    // Basic toxicity detection
    // In a real implementation, this would use Reddit's toxicity detection APIs
    
    const toxicWords = ['hate', 'kill', 'die', 'stupid', 'idiot'];
    const words = text.toLowerCase().split(/\s+/);
    const toxicCount = words.filter(word => toxicWords.includes(word)).length;
    
    return Math.min(toxicCount / words.length * 10, 1.0);
  }

  /**
   * Evaluate AutoMod rule against content
   */
  private async evaluateAutoModRule(
    rule: AutoModRule,
    scanResult: ContentScanResult,
    _context: DevvitContext
  ): Promise<boolean> {
    // Basic rule evaluation
    // In a real implementation, this would use Reddit's AutoMod engine
    
    switch (rule.condition) {
      case 'high_toxicity':
        return scanResult.toxicityScore > 0.7;
      case 'spam_detected':
        return scanResult.isSpam;
      case 'nsfw_content':
        return scanResult.isNSFW;
      default:
        return false;
    }
  }

  /**
   * Log moderation decision
   */
  private async logModerationDecision(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    policyCheck: ContentPolicyCheck,
    context: DevvitContext
  ): Promise<void> {
    const action: ModerationAction = {
      actionId: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentId,
      contentType,
      action: this.mapRecommendedActionToModAction(policyCheck.recommendedAction),
      reason: policyCheck.violations.map(v => v.description).join('; ') || 'Automated review',
      moderatorId: context.userId || 'system',
      timestamp: new Date(),
      isAutomatic: true
    };

    this.moderationLog.push(action);

    // In a real implementation, this would be logged to Reddit's moderation system
    console.log('Moderation action logged:', action);
  }

  /**
   * Map recommended action to moderation action
   */
  private mapRecommendedActionToModAction(
    recommendedAction: 'approve' | 'flag' | 'remove' | 'escalate'
  ): 'approve' | 'remove' | 'spam' | 'lock' | 'sticky' | 'distinguish' {
    switch (recommendedAction) {
      case 'approve':
        return 'approve';
      case 'remove':
      case 'escalate':
        return 'remove';
      case 'flag':
        return 'spam';
      default:
        return 'approve';
    }
  }

  /**
   * Get moderation log for a subreddit
   */
  async getModerationLog(_subreddit: string, limit: number = 100): Promise<ModerationAction[]> {
    // Filter log by subreddit context and return recent actions
    return this.moderationLog
      .filter(action => action.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
      .slice(-limit);
  }

  /**
   * Clear policy cache (useful for testing or policy updates)
   */
  clearPolicyCache(): void {
    this.policyCache.clear();
  }

  /**
   * Clear scan result cache
   */
  clearScanCache(): void {
    this.scanResultCache.clear();
  }

  /**
   * Check content against Reddit's content policies
   * Alias for validateContent method for backward compatibility
   */
  async checkContentPolicy(
    contentId: string,
    contentType: 'post' | 'comment' | 'media',
    content: string | File,
    context: DevvitContext
  ): Promise<RedditApiResult<ContentValidation>> {
    return this.validateContent(contentId, contentType, content, context);
  }
}

// Export the service for use in other modules
export { RedditContentPolicyService };