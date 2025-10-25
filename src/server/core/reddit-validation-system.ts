
import { RedditComplianceService } from "./reddit-compliance-service";
import { RedditContentPolicyService } from "./reddit-content-policy-service";

import {
  RedditApiResult,
  DevvitContext,
  ContentValidation,

} from "../../shared/types/reddit-compliance";

/**
 * Enhanced Validation Result
 * Extends basic ContentValidation with Reddit-specific validation data
 */
export interface EnhancedValidationResult extends ContentValidation {
  // Reddit Content Scanning Results
  redditScanResult?: {
    spamScore: number;
    toxicityScore: number;
    nsfwConfidence: number;
    violationTypes: string[];
  };
  
  // Community Guidelines Assessment
  communityGuidelines: {
    violatesGuidelines: boolean;
    violationReasons: string[];
    severityLevel: 'low' | 'medium' | 'high' | 'critical';
    autoModAction?: 'none' | 'flag' | 'remove' | 'escalate';
  };
  
  // Moderator Override Information
  moderatorOverride?: {
    canOverride: boolean;
    overrideReason?: string;
    overriddenBy?: string;
    overriddenAt?: Date;
  };
  
  // Validation Metadata
  validationMetadata: {
    validatedAt: Date;
    validationMethod: 'automatic' | 'manual' | 'hybrid';
    confidenceScore: number;
    requiresHumanReview: boolean;
  };
}

/**
 * Validation Configuration
 */
export interface ValidationConfig {
  enableRedditContentScanning: boolean;
  enableCommunityGuidelinesCheck: boolean;
  enableModeratorOverride: boolean;
  strictMode: boolean;
  customRules?: string[];
  subredditSpecificRules?: Map<string, string[]>;
}

/**
 * Moderator Override Request
 */
export interface ModeratorOverrideRequest {
  contentId: string;
  moderatorId: string;
  overrideReason: string;
  newValidationStatus: boolean;
  additionalNotes?: string;
}

/**
 * Reddit Validation System
 * Enhanced validation system that integrates with Reddit's content scanning,
 * community guidelines, and moderator override tools
 * Implements requirements 4.2, 4.3, 8.1, 8.2
 */
export class RedditValidationSystem {
  private complianceService: RedditComplianceService;
  private contentPolicyService: RedditContentPolicyService;

  private validationConfig: ValidationConfig;
  
  // Cache for validation results to avoid redundant API calls
  private validationCache: Map<string, EnhancedValidationResult>;
  private cacheExpiry: Map<string, Date>;
  
  constructor(config?: Partial<ValidationConfig>) {
    this.complianceService = new RedditComplianceService();
    this.contentPolicyService = new RedditContentPolicyService();

    
    // Default validation configuration
    this.validationConfig = {
      enableRedditContentScanning: true,
      enableCommunityGuidelinesCheck: true,
      enableModeratorOverride: true,
      strictMode: false,
      customRules: [],
      subredditSpecificRules: new Map(),
      ...config
    };
    
    this.validationCache = new Map();
    this.cacheExpiry = new Map();
  }

  /**
   * Integrate validation with Reddit's content scanning
   * Requirement 8.1: Integrate validation with Reddit's content scanning
   */
  async validateContentWithRedditScanning(
    content: string | File,
    context: DevvitContext
  ): Promise<RedditApiResult<EnhancedValidationResult>> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(content, context);
      
      // Check cache first
      const cachedResult = this.getCachedValidation(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          data: cachedResult
        };
      }

      // Start with basic content validation
      const basicValidation = await this.complianceService.validateContent(content, context.subreddit);
      if (!basicValidation.success) {
        return {
          success: false,
          error: basicValidation.error || "Basic content validation failed"
        };
      }

      // Perform Reddit content scanning if enabled
      let redditScanResult;
      if (this.validationConfig.enableRedditContentScanning) {
        const scanResult = await this.performRedditContentScan(content, context);
        if (scanResult.success && scanResult.data) {
          redditScanResult = scanResult.data;
        }
      }

      // Check community guidelines if enabled
      let communityGuidelines;
      if (this.validationConfig.enableCommunityGuidelinesCheck) {
        const guidelinesResult = await this.checkCommunityGuidelines(content, context);
        if (guidelinesResult.success && guidelinesResult.data) {
          communityGuidelines = guidelinesResult.data;
        }
      }

      // Determine moderator override capabilities
      const moderatorOverride = await this.getModeratorOverrideInfo(context);

      // Create enhanced validation result
      const enhancedResult: EnhancedValidationResult = {
        // Basic validation properties
        isValid: basicValidation.data?.isValid || false,
        isNSFW: basicValidation.data?.isNSFW || false,
        contentWarnings: basicValidation.data?.contentWarnings || [],
        violatesPolicy: basicValidation.data?.violatesPolicy || false,
        moderationRequired: basicValidation.data?.moderationRequired || false,
        
        // Enhanced properties
        ...(redditScanResult && { redditScanResult }),
        communityGuidelines: communityGuidelines || {
          violatesGuidelines: false,
          violationReasons: [],
          severityLevel: 'low'
        },
        ...(moderatorOverride && { moderatorOverride }),
        validationMetadata: {
          validatedAt: new Date(),
          validationMethod: 'automatic',
          confidenceScore: this.calculateConfidenceScore(basicValidation.data, redditScanResult, communityGuidelines),
          requiresHumanReview: this.requiresHumanReview(basicValidation.data, redditScanResult, communityGuidelines)
        }
      };

      // Apply final validation logic
      enhancedResult.isValid = this.determineOverallValidity(enhancedResult);
      enhancedResult.moderationRequired = this.determineModerationRequired(enhancedResult);

      // Cache the result
      this.cacheValidation(cacheKey, enhancedResult);

      return {
        success: true,
        data: enhancedResult
      };

    } catch (error) {
      console.error("Failed to validate content with Reddit scanning:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Content validation failed"
      };
    }
  }

  /**
   * Add Reddit community guidelines to validation logic
   * Requirement 8.2: Add Reddit community guidelines to validation logic
   */
  private async checkCommunityGuidelines(
    content: string | File,
    context: DevvitContext
  ): Promise<RedditApiResult<EnhancedValidationResult['communityGuidelines']>> {
    try {
      // Get content policy check from the content policy service
      const policyCheck = await this.contentPolicyService.validateContent(
        'content_' + Date.now(),
        typeof content === 'string' ? 'comment' : 'media',
        content,
        context
      );
      if (!policyCheck.success || !policyCheck.data) {
        return {
          success: false,
          error: "Failed to check content policy"
        };
      }

      const policy = policyCheck.data;
      
      // Check for community guidelines violations
      const violationReasons: string[] = [];
      let severityLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let autoModAction: 'none' | 'flag' | 'remove' | 'escalate' = 'none';

      // Analyze policy violations (if available)
      const violations = (policy as any).violations || [];
      for (const violation of violations) {
        violationReasons.push(`${violation.type}: ${violation.description}`);
        
        // Determine severity level (use highest severity found)
        if (violation.severity === 'critical') {
          severityLevel = 'critical';
          autoModAction = 'escalate';
        } else if (violation.severity === 'high' && severityLevel !== 'critical') {
          severityLevel = 'high';
          autoModAction = 'remove';
        } else if (violation.severity === 'medium' && !['critical', 'high'].includes(severityLevel)) {
          severityLevel = 'medium';
          autoModAction = 'flag';
        }
      }

      // Check subreddit-specific rules
      const subredditRules = this.validationConfig.subredditSpecificRules?.get(context.subreddit) || [];
      for (const rule of subredditRules) {
        if (this.violatesCustomRule(content, rule)) {
          violationReasons.push(`Subreddit rule violation: ${rule}`);
          if (severityLevel === 'low') {
            severityLevel = 'medium';
            autoModAction = 'flag';
          }
        }
      }

      // Check custom rules
      for (const rule of this.validationConfig.customRules || []) {
        if (this.violatesCustomRule(content, rule)) {
          violationReasons.push(`Custom rule violation: ${rule}`);
        }
      }

      const guidelines = {
        violatesGuidelines: violationReasons.length > 0,
        violationReasons,
        severityLevel,
        autoModAction
      };

      return {
        success: true,
        data: guidelines
      };

    } catch (error) {
      console.error("Failed to check community guidelines:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Community guidelines check failed"
      };
    }
  }

  /**
   * Update moderator override system to use Reddit moderation tools
   * Requirement 8.2: Update moderator override system to use Reddit moderation tools
   */
  async processModeratorOverride(
    overrideRequest: ModeratorOverrideRequest,
    context: DevvitContext
  ): Promise<RedditApiResult<EnhancedValidationResult>> {
    try {
      // Verify moderator permissions
      const permissionCheck = await this.complianceService.validateSubredditPermissions(
        context.subreddit,
        'manage_comments'
      );

      if (!permissionCheck.success || !permissionCheck.data) {
        return {
          success: false,
          error: "Insufficient moderator permissions for override"
        };
      }

      // Get the original validation result
      const originalValidation = this.validationCache.get(overrideRequest.contentId);
      if (!originalValidation) {
        return {
          success: false,
          error: "Original validation result not found"
        };
      }

      // Create overridden validation result
      const overriddenResult: EnhancedValidationResult = {
        ...originalValidation,
        isValid: overrideRequest.newValidationStatus,
        moderationRequired: false, // Moderator has made the decision
        moderatorOverride: {
          canOverride: true,
          overrideReason: overrideRequest.overrideReason,
          overriddenBy: overrideRequest.moderatorId,
          overriddenAt: new Date()
        },
        validationMetadata: {
          ...originalValidation.validationMetadata,
          validationMethod: 'manual',
          validatedAt: new Date()
        }
      };

      // Log the moderator action using Reddit's moderation tools
      await this.logModeratorAction(overrideRequest, context);

      // Update cache with overridden result
      this.cacheValidation(overrideRequest.contentId, overriddenResult);

      return {
        success: true,
        data: overriddenResult
      };

    } catch (error) {
      console.error("Failed to process moderator override:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Moderator override failed"
      };
    }
  }

  /**
   * Perform Reddit content scanning
   */
  private async performRedditContentScan(
    content: string | File,
    _context: DevvitContext
  ): Promise<RedditApiResult<EnhancedValidationResult['redditScanResult']>> {
    try {
      // This would integrate with Reddit's actual content scanning APIs
      // For now, implementing a simulation of the scanning process
      
      const contentText = typeof content === 'string' ? content : content.name;
      
      // Simulate spam detection
      const spamScore = this.calculateSpamScore(contentText);
      
      // Simulate toxicity detection
      const toxicityScore = this.calculateToxicityScore(contentText);
      
      // Simulate NSFW detection
      const nsfwConfidence = this.calculateNSFWConfidence(contentText);
      
      // Determine violation types
      const violationTypes: string[] = [];
      if (spamScore > 0.7) violationTypes.push('spam');
      if (toxicityScore > 0.6) violationTypes.push('toxicity');
      if (nsfwConfidence > 0.8) violationTypes.push('nsfw');

      const scanResult = {
        spamScore,
        toxicityScore,
        nsfwConfidence,
        violationTypes
      };

      return {
        success: true,
        data: scanResult
      };

    } catch (error) {
      console.error("Failed to perform Reddit content scan:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Content scan failed"
      };
    }
  }

  /**
   * Get moderator override information
   */
  private async getModeratorOverrideInfo(_context: DevvitContext): Promise<EnhancedValidationResult['moderatorOverride']> {
    try {
      if (!this.validationConfig.enableModeratorOverride) {
        return {
          canOverride: false
        };
      }

      // Check if current user has moderator permissions
      const permissionCheck = await this.complianceService.validateSubredditPermissions(
        _context.subreddit,
        'manage_comments'
      );

      return {
        canOverride: permissionCheck.success && !!permissionCheck.data
      };

    } catch (error) {
      console.error("Failed to get moderator override info:", error);
      return {
        canOverride: false
      };
    }
  }

  /**
   * Log moderator action using Reddit's moderation tools
   */
  private async logModeratorAction(
    overrideRequest: ModeratorOverrideRequest,
    _context: DevvitContext
  ): Promise<void> {
    try {
      // This would integrate with Reddit's moderation log API
      const logEntry = {
        action: 'content_validation_override',
        moderator: overrideRequest.moderatorId,
        target: overrideRequest.contentId,
        reason: overrideRequest.overrideReason,
        details: {
          newStatus: overrideRequest.newValidationStatus,
          notes: overrideRequest.additionalNotes
        },
        timestamp: new Date(),
        subreddit: _context.subreddit
      };

      // In a real implementation, this would call Reddit's moderation log API
      console.log('Moderator action logged:', logEntry);

    } catch (error) {
      console.error("Failed to log moderator action:", error);
    }
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidenceScore(
    basicValidation?: ContentValidation,
    redditScan?: EnhancedValidationResult['redditScanResult'],
    guidelines?: EnhancedValidationResult['communityGuidelines']
  ): number {
    let confidence = 0.5; // Base confidence

    // Factor in basic validation
    if (basicValidation?.isValid) {
      confidence += 0.2;
    }

    // Factor in Reddit scan results
    if (redditScan) {
      const avgScore = (redditScan.spamScore + redditScan.toxicityScore + redditScan.nsfwConfidence) / 3;
      confidence += (1 - avgScore) * 0.2; // Higher confidence for lower violation scores
    }

    // Factor in community guidelines
    if (guidelines && !guidelines.violatesGuidelines) {
      confidence += 0.1;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Determine if human review is required
   */
  private requiresHumanReview(
    basicValidation?: ContentValidation,
    redditScan?: EnhancedValidationResult['redditScanResult'],
    guidelines?: EnhancedValidationResult['communityGuidelines']
  ): boolean {
    // Require human review if confidence is low
    const confidence = this.calculateConfidenceScore(basicValidation, redditScan, guidelines);
    if (confidence < 0.6) return true;

    // Require human review for high-severity violations
    if (guidelines?.severityLevel === 'high' || guidelines?.severityLevel === 'critical') {
      return true;
    }

    // Require human review if Reddit scan shows potential issues
    if (redditScan) {
      const hasHighRiskScores = redditScan.spamScore > 0.6 || 
                               redditScan.toxicityScore > 0.6 || 
                               redditScan.nsfwConfidence > 0.7;
      if (hasHighRiskScores) return true;
    }

    return false;
  }

  /**
   * Determine overall validity
   */
  private determineOverallValidity(result: EnhancedValidationResult): boolean {
    // If moderator has overridden, use their decision
    if (result.moderatorOverride?.overriddenBy) {
      return result.isValid;
    }

    // Fail if basic validation fails
    if (!result.isValid) return false;

    // Fail if community guidelines are violated with high severity
    if (result.communityGuidelines.violatesGuidelines && 
        ['high', 'critical'].includes(result.communityGuidelines.severityLevel)) {
      return false;
    }

    // Fail if Reddit scan shows critical issues
    if (result.redditScanResult) {
      const hasCriticalIssues = result.redditScanResult.spamScore > 0.8 ||
                               result.redditScanResult.toxicityScore > 0.8;
      if (hasCriticalIssues) return false;
    }

    return true;
  }

  /**
   * Determine if moderation is required
   */
  private determineModerationRequired(result: EnhancedValidationResult): boolean {
    // No moderation needed if moderator has already reviewed
    if (result.moderatorOverride?.overriddenBy) {
      return false;
    }

    // Require moderation for medium+ severity violations
    if (result.communityGuidelines.violatesGuidelines && 
        ['medium', 'high', 'critical'].includes(result.communityGuidelines.severityLevel)) {
      return true;
    }

    // Require moderation if human review is needed
    return result.validationMetadata.requiresHumanReview;
  }

  /**
   * Cache management methods
   */
  private generateCacheKey(content: string | File, context: DevvitContext): string {
    const contentHash = typeof content === 'string' ? 
      content.substring(0, 100) : 
      `${content.name}_${content.size}`;
    return `${context.subreddit}_${contentHash}_${Date.now()}`;
  }

  private getCachedValidation(cacheKey: string): EnhancedValidationResult | null {
    const expiry = this.cacheExpiry.get(cacheKey);
    if (!expiry || expiry < new Date()) {
      this.validationCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
      return null;
    }
    return this.validationCache.get(cacheKey) || null;
  }

  private cacheValidation(cacheKey: string, result: EnhancedValidationResult): void {
    this.validationCache.set(cacheKey, result);
    // Cache for 1 hour
    this.cacheExpiry.set(cacheKey, new Date(Date.now() + 60 * 60 * 1000));
  }

  /**
   * Helper methods for content analysis
   */
  private calculateSpamScore(content: string): number {
    // Simple spam detection heuristics
    let score = 0;
    
    // Check for excessive repetition
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
      score += 0.3;
    }
    
    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5) {
      score += 0.2;
    }
    
    // Check for suspicious patterns
    if (content.includes('http') && content.split('http').length > 3) {
      score += 0.4;
    }
    
    return Math.min(1, score);
  }

  private calculateToxicityScore(content: string): number {
    // Simple toxicity detection
    const toxicWords = ['hate', 'stupid', 'idiot', 'kill', 'die'];
    const words = content.toLowerCase().split(/\s+/);
    const toxicCount = words.filter(word => toxicWords.some(toxic => word.includes(toxic))).length;
    
    return Math.min(1, toxicCount / Math.max(1, words.length) * 10);
  }

  private calculateNSFWConfidence(content: string): number {
    // Simple NSFW detection
    const nsfwWords = ['nsfw', 'adult', 'explicit'];
    const words = content.toLowerCase().split(/\s+/);
    const nsfwCount = words.filter(word => nsfwWords.some(nsfw => word.includes(nsfw))).length;
    
    return Math.min(1, nsfwCount / Math.max(1, words.length) * 5);
  }

  private violatesCustomRule(content: string | File, rule: string): boolean {
    const contentText = typeof content === 'string' ? content : content.name;
    // Simple rule matching - in real implementation, this would be more sophisticated
    return contentText.toLowerCase().includes(rule.toLowerCase());
  }

  /**
   * Public API methods
   */

  /**
   * Validate content with full Reddit integration
   */
  async validateContent(
    content: string | File,
    context: DevvitContext
  ): Promise<RedditApiResult<EnhancedValidationResult>> {
    return this.validateContentWithRedditScanning(content, context);
  }

  /**
   * Get validation configuration
   */
  getValidationConfig(): ValidationConfig {
    return { ...this.validationConfig };
  }

  /**
   * Update validation configuration
   */
  updateValidationConfig(config: Partial<ValidationConfig>): void {
    this.validationConfig = { ...this.validationConfig, ...config };
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.validationCache.size,
      entries: Array.from(this.validationCache.keys())
    };
  }
}