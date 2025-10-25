
import { 
  AuthenticatedUser, 
  UserPermissions, 
  SessionValidationResult, 
  AuthenticationResult 
} from "../../shared/types/auth";
import { SessionManager } from "./session-manager";
import { RedditComplianceService } from "./reddit-compliance-service";

/**
 * Authentication Service
 * Handles Reddit OAuth integration and user authentication
 */
export class AuthenticationService {
  private sessionManager: SessionManager;
  private redditComplianceService: RedditComplianceService;

  constructor() {
    this.sessionManager = new SessionManager();
    this.redditComplianceService = new RedditComplianceService();
  }

  /**
   * Get the current authenticated user from Devvit context
   * Uses only reddit.getCurrentUsername() for Reddit-compliant user identification
   */
  async getCurrentUser(): Promise<AuthenticationResult> {
    try {
      // Get current Reddit user through compliance service (uses reddit.getCurrentUsername())
      const userResult = await this.redditComplianceService.getCurrentRedditUser();
      
      if (!userResult.success || !userResult.data) {
        // Return anonymous user for unauthenticated requests
        return {
          success: true,
          user: await this.createAnonymousUser(),
          ...(userResult.error && { error: userResult.error })
        };
      }

      const username = userResult.data;

      // Get subreddit context for session management
      const contextResult = await this.redditComplianceService.getDevvitContext();
      const subredditContext = contextResult.success && contextResult.data ? contextResult.data.subreddit : 'unknown';
      
      // Determine user permissions based on Reddit context
      const permissions = await this.determineUserPermissions(username);
      
      // Create subreddit-aware session for authenticated user
      const sessionToken = await this.sessionManager.createSession(username, subredditContext);
      
      const user: AuthenticatedUser = {
        redditUsername: username,
        redditUserId: username, // In Devvit, username is the primary identifier
        sessionToken,
        permissions,
        isAnonymous: false,
        subredditContext
      };

      return {
        success: true,
        user
      };
    } catch (error) {
      console.error("Reddit OAuth authentication error:", error);
      
      // Provide fallback to anonymous user on authentication failure
      return {
        success: true,
        user: await this.createAnonymousUser(),
        error: `Authentication failed, proceeding anonymously: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }

  /**
   * Validate an existing session token
   * Provides comprehensive session validation with security checks
   */
  async validateSession(sessionToken: string): Promise<SessionValidationResult> {
    try {
      // Basic token format validation
      if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.length < 10) {
        return {
          isValid: false,
          error: "Invalid session token format"
        };
      }

      const session = await this.sessionManager.validateSession(sessionToken);
      
      if (!session) {
        return {
          isValid: false,
          error: "Invalid or expired session"
        };
      }

      // Additional security check: verify session hasn't been tampered with
      if (session.sessionId !== sessionToken) {
        console.warn(`Session ID mismatch for token: ${sessionToken}`);
        return {
          isValid: false,
          error: "Session validation failed"
        };
      }

      const user: AuthenticatedUser = {
        redditUsername: session.redditUsername,
        redditUserId: session.redditUsername, // In Devvit, username is the primary identifier
        sessionToken: session.sessionId,
        permissions: session.permissions,
        isAnonymous: session.isAnonymous,
        subredditContext: session.subredditContext
      };

      return {
        isValid: true,
        user
      };
    } catch (error) {
      console.error("Session validation error:", error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Session validation failed"
      };
    }
  }

  /**
   * Refresh authentication for current user
   * Re-validates Reddit OAuth and updates session if needed
   */
  async refreshAuthentication(existingSessionToken?: string): Promise<AuthenticationResult> {
    try {
      // If we have an existing session, try to refresh it first
      if (existingSessionToken) {
        const validationResult = await this.validateSession(existingSessionToken);
        if (validationResult.isValid && validationResult.user) {
          // Session is still valid, update last activity
          await this.sessionManager.validateSession(existingSessionToken);
          return {
            success: true,
            user: validationResult.user
          };
        }
      }

      // Session invalid or not provided, get fresh authentication
      const authResult = await this.getCurrentUser();
      
      // If we had an old session that's now invalid, clean it up
      if (existingSessionToken && !authResult.user?.isAnonymous) {
        await this.sessionManager.invalidateSession(existingSessionToken);
      }

      return authResult;
    } catch (error) {
      console.error("Authentication refresh error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication refresh failed"
      };
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(sessionToken: string): Promise<void> {
    try {
      await this.sessionManager.invalidateSession(sessionToken);
    } catch (error) {
      console.error("Logout error:", error);
      // Don't throw - logout should always succeed from user perspective
    }
  }

  /**
   * Create an anonymous user for unauthenticated access
   */
  private async createAnonymousUser(): Promise<AuthenticatedUser> {
    // Get subreddit context for anonymous session
    const contextResult = await this.redditComplianceService.getDevvitContext();
    const subredditContext = contextResult.success && contextResult.data ? contextResult.data.subreddit : 'unknown';
    
    const anonymousSessionToken = this.sessionManager.createAnonymousSession(subredditContext);
    
    return {
      redditUsername: "Anonymous",
      redditUserId: "anonymous", // Anonymous user ID
      sessionToken: anonymousSessionToken,
      permissions: this.getAnonymousPermissions(),
      isAnonymous: true,
      subredditContext
    };
  }





  /**
   * Determine user permissions based on Reddit context and moderator status
   * Uses Reddit's moderator permission system for accurate permission checking
   */
  private async determineUserPermissions(username: string): Promise<UserPermissions> {
    try {
      // Get Devvit context to determine subreddit
      const contextResult = await this.redditComplianceService.getDevvitContext();
      if (!contextResult.success || !contextResult.data) {
        console.warn(`Could not get context for permissions check: ${contextResult.error}`);
        return this.getDefaultPermissions();
      }

      const subreddit = contextResult.data.subreddit;

      // Check moderator permissions through compliance service using reddit.getModPermissions()
      const modPermsResult = await this.redditComplianceService.getModeratorPermissions(subreddit, username);
      
      if (!modPermsResult.success || !modPermsResult.data) {
        // User is not a moderator or permission check failed
        return this.getDefaultPermissions();
      }

      const modPerms = modPermsResult.data;
      const isModerator = !!(
        modPerms.canManagePosts || 
        modPerms.canManageComments ||
        modPerms.canManageUsers ||
        modPerms.canManageSettings
      );

      // Log moderator permission check for audit purposes
      if (isModerator) {
        await this.redditComplianceService.logModeratorAction(
          subreddit,
          'permission_check',
          `user:${username}`,
          'PicTact authentication permission verification',
          { permissions: modPerms }
        );
      }
      
      return {
        canCreateEvents: true, // All authenticated users can create events
        canModerate: isModerator,
        canViewProfiles: true,
        canExportData: true
      };
    } catch (error) {
      console.warn(`Could not determine permissions for ${username}:`, error);
      return this.getDefaultPermissions();
    }
  }



  /**
   * Get default permissions for authenticated users
   */
  private getDefaultPermissions(): UserPermissions {
    return {
      canCreateEvents: true,
      canModerate: false, // This would be determined by subreddit moderator status
      canViewProfiles: true,
      canExportData: true
    };
  }

  /**
   * Get limited permissions for anonymous users
   */
  private getAnonymousPermissions(): UserPermissions {
    return {
      canCreateEvents: false,
      canModerate: false,
      canViewProfiles: false,
      canExportData: false
    };
  }

  /**
   * Check if the current user has specific moderator permissions
   * Requirement 3.1, 3.4: Implement reddit.getModPermissions() for moderator verification
   */
  async checkModeratorPermission(
    sessionToken: string, 
    permission: 'canManagePosts' | 'canManageComments' | 'canManageUsers' | 'canManageSettings' | 'canViewModLog'
  ): Promise<{ hasPermission: boolean; error?: string }> {
    try {
      // Validate the session first
      const sessionValidation = await this.validateSession(sessionToken);
      if (!sessionValidation.isValid || !sessionValidation.user) {
        return {
          hasPermission: false,
          error: "Invalid session or user not authenticated"
        };
      }

      const user = sessionValidation.user;
      
      // Anonymous users have no moderator permissions
      if (user.isAnonymous) {
        return { hasPermission: false };
      }

      // Get current subreddit context
      const contextResult = await this.redditComplianceService.getDevvitContext();
      if (!contextResult.success || !contextResult.data) {
        return {
          hasPermission: false,
          error: "Could not determine subreddit context"
        };
      }

      // Check specific moderator permission
      const permissionResult = await this.redditComplianceService.checkSubredditSpecificPermission(
        contextResult.data.subreddit,
        user.redditUsername,
        permission
      );

      if (!permissionResult.success) {
        return {
          hasPermission: false,
          error: permissionResult.error
        };
      }

      // Log the permission check for audit purposes
      if (permissionResult.data) {
        await this.redditComplianceService.logModeratorAction(
          contextResult.data.subreddit,
          'permission_used',
          `permission:${permission}`,
          `User ${user.redditUsername} used moderator permission: ${permission}`
        );
      }

      return { hasPermission: permissionResult.data || false };
    } catch (error) {
      console.error("Error checking moderator permission:", error);
      return {
        hasPermission: false,
        error: error instanceof Error ? error.message : "Permission check failed"
      };
    }
  }

  /**
   * Log a moderator action for the current user
   * Requirement 8.5: Add moderator action logging through Reddit's systems
   */
  async logModeratorAction(
    sessionToken: string,
    action: string,
    targetId: string,
    reason?: string,
    details?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate the session and ensure user is a moderator
      const sessionValidation = await this.validateSession(sessionToken);
      if (!sessionValidation.isValid || !sessionValidation.user) {
        return {
          success: false,
          error: "Invalid session or user not authenticated"
        };
      }

      const user = sessionValidation.user;
      
      if (user.isAnonymous || !user.permissions.canModerate) {
        return {
          success: false,
          error: "Moderator permissions required"
        };
      }

      // Get current subreddit context
      const contextResult = await this.redditComplianceService.getDevvitContext();
      if (!contextResult.success || !contextResult.data) {
        return {
          success: false,
          error: "Could not determine subreddit context"
        };
      }

      // Log the moderator action
      const logResult = await this.redditComplianceService.logModeratorAction(
        contextResult.data.subreddit,
        action,
        targetId,
        reason,
        details
      );

      return {
        success: logResult.success,
        error: logResult.error
      };
    } catch (error) {
      console.error("Error logging moderator action:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to log moderator action"
      };
    }
  }
}