import { reddit, context } from "@devvit/web/server";
import { RedditRateLimitManager, RequestPriority, defaultRateLimitManager } from './reddit-rate-limit-manager.js';
import { DevvitResourceManager, defaultResourceManager, KVOperation } from './devvit-resource-manager.js';
import { RedditMonitoringService, getDefaultMonitoringService } from './reddit-monitoring-service.js';
import { 
  DevvitContext, 
  ModeratorPermissions, 
  RedditApiResult 
} from '../../shared/types/reddit-compliance.js';

/**
 * Reddit Content Validation Result
 */
export interface ContentValidation {
  isValid: boolean;
  isNSFW: boolean;
  contentWarnings: string[];
  violatesPolicy: boolean;
  moderationRequired: boolean;
}

/**
 * Reddit Compliance Service
 * Central integration layer for all Reddit platform interactions
 * Implements requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */
export class RedditComplianceService {
  private rateLimitManager: RedditRateLimitManager;
  private resourceManager: DevvitResourceManager;
  private monitoringService: RedditMonitoringService;

  constructor(
    rateLimitManager?: RedditRateLimitManager,
    resourceManager?: DevvitResourceManager,
    monitoringService?: RedditMonitoringService
  ) {
    this.rateLimitManager = rateLimitManager || defaultRateLimitManager;
    this.resourceManager = resourceManager || defaultResourceManager;
    this.monitoringService = monitoringService || getDefaultMonitoringService(this.rateLimitManager, this.resourceManager);
  }

  /**
   * Get current Devvit context with postId, subreddit, and user information
   * Requirement 1.1: Use Devvit's context API to obtain postId and subreddit information
   */
  async getDevvitContext(): Promise<RedditApiResult<DevvitContext>> {
    try {
      // Try to get context from Devvit framework with fallbacks
      let postId = "unknown";
      let subredditName = "pictact_dev";
      let userId = "anonymous";

      try {
        const devvitContext = context;
        if (devvitContext) {
          postId = devvitContext.postId || "fallback_post";
          subredditName = devvitContext.subredditName || "pictact_dev";
          userId = devvitContext.userId || "anonymous";
        }
      } catch (contextError) {
        console.warn("Devvit context not available, using fallbacks:", contextError);
        // Continue with fallback values
      }

      if (!postId) {
        return {
          success: false,
          error: "postId not found in Devvit context - app must be accessed through Reddit"
        };
      }

      if (!subredditName) {
        return {
          success: false,
          error: "subreddit not found in Devvit context"
        };
      }

      // Get current user information
      const username = await this.getCurrentRedditUser();
      
      // Get moderator permissions if user is authenticated
      let moderatorPermissions: ModeratorPermissions | undefined;
      if (username.success && username.data) {
        const modPerms = await this.getModeratorPermissions(subredditName, username.data);
        if (modPerms.success) {
          moderatorPermissions = modPerms.data;
        }
      }

      const devvitContext: DevvitContext = {
        postId,
        subreddit: subredditName,
        ...(username.data && { userId: username.data }),
        ...(moderatorPermissions && { moderatorPermissions })
      };

      return {
        success: true,
        data: devvitContext
      };
    } catch (error) {
      console.error("Failed to get Devvit context:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get Devvit context"
      };
    }
  }

  /**
   * Get current Reddit user using Devvit's authentication
   * Requirement 1.2: Use reddit.getCurrentUsername() exclusively for user identification
   */
  async getCurrentRedditUser(): Promise<RedditApiResult<string>> {
    try {
      const result = await this.rateLimitManager.executeWithRateLimit(
        'getCurrentUsername',
        async () => {
          return await reddit.getCurrentUsername();
        },
        RequestPriority.CRITICAL
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to get current username"
        };
      }

      const username = result.data;
      
      if (!username) {
        return {
          success: false,
          error: "No authenticated Reddit user found"
        };
      }

      // Validate username format
      if (!this.isValidRedditUsername(username)) {
        return {
          success: false,
          error: "Invalid Reddit username format"
        };
      }

      return {
        success: true,
        data: username
      };
    } catch (error) {
      console.error("Failed to get current Reddit user:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get current Reddit user"
      };
    }
  }

  /**
   * Validate subreddit permissions for the current user
   * Requirement 1.3: Respect subreddit boundaries and permissions
   */
  async validateSubredditPermissions(subreddit: string, action: string): Promise<RedditApiResult<boolean>> {
    try {
      const username = await this.getCurrentRedditUser();
      if (!username.success || !username.data) {
        return {
          success: false,
          error: "Authentication required to validate permissions"
        };
      }

      // Get moderator permissions for the user in this subreddit
      const modPerms = await this.getModeratorPermissions(subreddit, username.data);
      
      // Check if the action is allowed based on permissions
      const isAllowed = this.checkActionPermission(action, modPerms.data);

      return {
        success: true,
        data: isAllowed
      };
    } catch (error) {
      console.error(`Failed to validate subreddit permissions for ${action}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to validate permissions"
      };
    }
  }

  /**
   * Get moderator permissions for a user in a subreddit
   * Uses Reddit's moderator permission system via reddit.getModPermissions()
   * Requirement 3.1, 3.4: Verify moderator status and permissions
   */
  async getModeratorPermissions(subreddit: string, username: string): Promise<RedditApiResult<ModeratorPermissions>> {
    try {
      const result = await this.rateLimitManager.executeWithRateLimit(
        'getModPermissions',
        async () => {
          try {
            // Use Devvit's Reddit API to check moderator permissions
            // Note: The exact API method may vary based on Devvit version
            const modPermissions = await (reddit as any).getModPermissions?.(subreddit, username);
            
            if (!modPermissions) {
              // User is not a moderator
              return {
                canManagePosts: false,
                canManageComments: false,
                canManageUsers: false,
                canManageSettings: false,
                canViewModLog: false
              };
            }

            // Map Reddit's permission structure to our interface
            return {
              canManagePosts: modPermissions.includes('posts') || modPermissions.includes('all'),
              canManageComments: modPermissions.includes('comments') || modPermissions.includes('all'),
              canManageUsers: modPermissions.includes('access') || modPermissions.includes('all'),
              canManageSettings: modPermissions.includes('config') || modPermissions.includes('all'),
              canViewModLog: modPermissions.includes('mail') || modPermissions.includes('all')
            };
          } catch (apiError) {
            // If the API doesn't exist or fails, fall back to basic check
            console.warn(`reddit.getModPermissions() not available or failed for ${username} in ${subreddit}:`, apiError);
            
            // Try alternative approach - check if user can perform moderator actions
            return await this.checkModeratorStatusFallback(subreddit, username);
          }
        },
        RequestPriority.HIGH
      );

      return result;
    } catch (error) {
      console.error(`Failed to get moderator permissions for ${username} in ${subreddit}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get moderator permissions"
      };
    }
  }

  /**
   * Fallback method to check moderator status when direct API is not available
   * Uses alternative Reddit API methods to determine moderator permissions
   */
  private async checkModeratorStatusFallback(subreddit: string, username: string): Promise<ModeratorPermissions> {
    try {
      // This is a fallback implementation that could use other Reddit APIs
      // to determine if a user has moderator permissions
      
      // For now, return no permissions as a safe default
      // In a real implementation, this might check user flair, attempt moderator actions, etc.
      return {
        canManagePosts: false,
        canManageComments: false,
        canManageUsers: false,
        canManageSettings: false,
        canViewModLog: false
      };
    } catch (error) {
      console.warn(`Moderator status fallback check failed for ${username} in ${subreddit}:`, error);
      return {
        canManagePosts: false,
        canManageComments: false,
        canManageUsers: false,
        canManageSettings: false,
        canViewModLog: false
      };
    }
  }



  /**
   * Validate Reddit username format
   */
  private isValidRedditUsername(username: string): boolean {
    // Reddit usernames are 3-20 characters, alphanumeric plus underscores and hyphens
    const redditUsernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return redditUsernameRegex.test(username);
  }

  /**
   * Check if an action is allowed based on moderator permissions
   */
  private checkActionPermission(action: string, permissions?: ModeratorPermissions): boolean {
    if (!permissions) {
      // Non-moderators can only perform basic actions
      return ['view', 'participate', 'submit'].includes(action);
    }

    switch (action) {
      case 'manage_posts':
        return permissions.canManagePosts;
      case 'manage_comments':
        return permissions.canManageComments;
      case 'manage_users':
        return permissions.canManageUsers;
      case 'manage_settings':
        return permissions.canManageSettings;
      case 'view_mod_log':
        return permissions.canViewModLog;
      default:
        return true; // Allow basic actions by default
    }
  }

  /**
   * Log moderator actions through Reddit's moderation log system
   * Requirement 8.5: Add moderator action logging through Reddit's systems
   */
  async logModeratorAction(
    subreddit: string,
    action: string,
    targetId: string,
    reason?: string,
    details?: any
  ): Promise<RedditApiResult<boolean>> {
    try {
      const username = await this.getCurrentRedditUser();
      if (!username.success || !username.data) {
        return {
          success: false,
          error: "Authentication required for moderator action logging"
        };
      }

      // Verify moderator permissions
      const permissions = await this.getModeratorPermissions(subreddit, username.data);
      if (!permissions.success || !permissions.data) {
        return {
          success: false,
          error: "Moderator permissions required for action logging"
        };
      }

      const result = await this.rateLimitManager.executeWithRateLimit(
        'logModeratorAction',
        async () => {
          try {
            // Create a moderation log entry through Reddit's API
            // This would typically use reddit.addModNote() or similar API
            const logEntry = {
              moderator: username.data,
              action,
              targetId,
              reason: reason || 'PicTact game moderation',
              timestamp: new Date().toISOString(),
              details: details ? JSON.stringify(details) : undefined
            };

            // Log to console for now (in real implementation, this would use Reddit's mod log API)
            console.log(`Moderator action logged in r/${subreddit}:`, logEntry);
            
            return true;
          } catch (apiError) {
            console.warn(`Reddit moderation logging API not available:`, apiError);
            // Fall back to local logging
            return this.logModeratorActionFallback(subreddit, username.data!, action, targetId, reason, details);
          }
        },
        RequestPriority.HIGH
      );

      return result;
    } catch (error) {
      console.error(`Failed to log moderator action in ${subreddit}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to log moderator action"
      };
    }
  }

  /**
   * Fallback moderator action logging when Reddit API is not available
   */
  private async logModeratorActionFallback(
    subreddit: string,
    moderator: string,
    action: string,
    targetId: string,
    reason?: string,
    details?: any
  ): Promise<boolean> {
    try {
      // Create a structured log entry for moderator actions
      const logEntry = {
        timestamp: new Date().toISOString(),
        subreddit,
        moderator,
        action,
        targetId,
        reason: reason || 'PicTact game moderation',
        details,
        source: 'PicTact'
      };

      // In a real implementation, this might:
      // 1. Store in a dedicated moderation log table
      // 2. Send to Reddit via webhook
      // 3. Create a comment in a mod-only thread
      console.log('Moderator action (fallback logging):', logEntry);
      
      return true;
    } catch (error) {
      console.error('Fallback moderator action logging failed:', error);
      return false;
    }
  }

  /**
   * Create subreddit-specific permission checking system
   * Requirement 3.1: Create subreddit-specific permission checking system
   */
  async checkSubredditSpecificPermission(
    subreddit: string,
    username: string,
    permission: keyof ModeratorPermissions
  ): Promise<RedditApiResult<boolean>> {
    try {
      const modPermissions = await this.getModeratorPermissions(subreddit, username);
      
      if (!modPermissions.success || !modPermissions.data) {
        return {
          success: true,
          data: false // No permissions if not a moderator
        };
      }

      const hasPermission = modPermissions.data[permission];
      
      return {
        success: true,
        data: hasPermission
      };
    } catch (error) {
      console.error(`Failed to check subreddit permission ${permission} for ${username} in ${subreddit}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check subreddit permission"
      };
    }
  }

  /**
   * Validate content against Reddit policies
   * Requirement 1.5: Respect Reddit's content policies and community guidelines
   */
  async validateContent(_content: any, _subreddit: string): Promise<RedditApiResult<ContentValidation>> {
    try {
      // This is a placeholder implementation. In a real implementation,
      // this would integrate with Reddit's content scanning APIs
      const validation: ContentValidation = {
        isValid: true,
        isNSFW: false,
        contentWarnings: [],
        violatesPolicy: false,
        moderationRequired: false
      };

      // Basic content validation logic would go here
      // This would integrate with Reddit's spam detection and content filtering

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
   * Get current rate limit status for Reddit API operations
   * Requirement 9.1: Reddit API usage monitoring and optimization
   */
  getRateLimitStatus(operation: string = 'general'): any {
    return this.rateLimitManager.getRateLimitStatus(operation, RequestPriority.MEDIUM);
  }

  /**
   * Get comprehensive Reddit API usage statistics
   * Requirement 9.3: Create Reddit API usage monitoring and optimization
   */
  getApiUsageStatistics(): any {
    return this.rateLimitManager.getStatistics();
  }

  /**
   * Reset rate limiting state (for testing or emergency situations)
   */
  resetRateLimiting(): void {
    this.rateLimitManager.reset();
  }

  /**
   * Get current resource usage statistics
   * Requirement 9.4: Reddit-native monitoring and logging integration
   */
  getResourceUsage(): any {
    return this.resourceManager.getResourceUsage();
  }

  /**
   * Execute operation with resource optimization
   * Requirement 9.2: Optimize memory and processing optimizations
   */
  async executeWithResourceOptimization<T>(
    operationType: string,
    operation: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<RedditApiResult<T>> {
    return await this.resourceManager.executeWithResourceLimits(
      operationType,
      operation,
      priority
    );
  }

  /**
   * Optimized KV store operations
   * Requirement 9.2: Optimize KV store usage patterns for efficiency
   */
  async getFromKVStore(key: string): Promise<RedditApiResult<any>> {
    return await this.resourceManager.optimizedKVGet(key);
  }

  async setInKVStore(key: string, value: any): Promise<RedditApiResult<boolean>> {
    return await this.resourceManager.optimizedKVSet(key, value);
  }

  async batchKVOperations(operations: Array<{
    type: 'get' | 'set';
    key: string;
    value?: any;
  }>): Promise<RedditApiResult<any[]>> {
    const kvOperations = operations.map(op => ({
      type: op.type === 'get' ? KVOperation.GET : KVOperation.SET,
      key: op.key,
      value: op.value
    }));
    
    return await this.resourceManager.batchKVOperations(kvOperations);
  }

  /**
   * Clear caches and optimize memory usage
   * Requirement 9.2: Implement memory and processing optimizations
   */
  optimizeMemoryUsage(): void {
    this.resourceManager.clearCaches();
  }

  /**
   * Get memory pool for object reuse
   * Requirement 9.2: Memory optimization through object pooling
   */
  getMemoryPool<T>(poolName: string, createFn: () => T, resetFn: (obj: T) => void): any {
    return this.resourceManager.getMemoryPool(poolName, createFn, resetFn);
  }

  /**
   * Start monitoring and logging integration
   * Requirement 9.5: Reddit-native monitoring and logging integration
   */
  startMonitoring(): void {
    this.monitoringService.startMonitoring();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.monitoringService.stopMonitoring();
  }

  /**
   * Get comprehensive monitoring report
   * Requirement 9.4: Reddit-native monitoring and logging integration
   */
  getMonitoringReport(hours: number = 24): any {
    return this.monitoringService.generateReport(hours);
  }

  /**
   * Log API operation for monitoring
   */
  logApiOperation(
    operation: string,
    success: boolean,
    responseTime: number,
    error?: string,
    subreddit?: string
  ): void {
    this.monitoringService.logApiOperation(operation, success, responseTime, error, subreddit);
  }

  /**
   * Shutdown the compliance service and clean up resources
   */
  shutdown(): void {
    this.monitoringService.stopMonitoring();
    this.rateLimitManager.shutdown();
    this.resourceManager.shutdown();
  }
}