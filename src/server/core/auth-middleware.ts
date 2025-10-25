import { Request, Response, NextFunction } from "express";
import { AuthenticationService } from "./auth";
import { AuthenticatedUser } from "../../shared/types/auth";

// Extend Express Request to include user information
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication middleware for Express routes
 */
export class AuthMiddleware {
  private authService: AuthenticationService;

  constructor(authService: AuthenticationService) {
    this.authService = authService;
  }

  /**
   * Middleware to require authentication
   */
  requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionToken = this.extractSessionToken(req);
      
      if (!sessionToken) {
        res.status(401).json({
          error: "Authentication required",
          message: "No session token provided"
        });
        return;
      }

      const validation = await this.authService.validateSession(sessionToken);
      
      if (!validation.isValid || !validation.user) {
        res.status(401).json({
          error: "Invalid session",
          message: validation.error || "Session is invalid or expired"
        });
        return;
      }

      // Attach user to request
      req.user = validation.user;
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      res.status(500).json({
        error: "Authentication error",
        message: "Failed to validate authentication"
      });
    }
  };

  /**
   * Middleware to optionally authenticate (allows anonymous access)
   */
  optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionToken = this.extractSessionToken(req);
      
      if (sessionToken) {
        const validation = await this.authService.validateSession(sessionToken);
        
        if (validation.isValid && validation.user) {
          req.user = validation.user;
        }
      }

      // Continue regardless of authentication status
      next();
    } catch (error) {
      console.error("Optional auth middleware error:", error);
      // Continue without authentication on error
      next();
    }
  };

  /**
   * Middleware to require specific permissions
   */
  requirePermission = (permission: keyof AuthenticatedUser['permissions']) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({
          error: "Authentication required",
          message: "Must be authenticated to access this resource"
        });
        return;
      }

      if (!req.user.permissions[permission]) {
        res.status(403).json({
          error: "Insufficient permissions",
          message: `Permission '${permission}' is required`
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware to require specific moderator permissions
   * Uses Reddit's moderator permission system for real-time verification
   */
  requireModeratorPermission = (
    permission: 'canManagePosts' | 'canManageComments' | 'canManageUsers' | 'canManageSettings' | 'canViewModLog'
  ) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({
          error: "Authentication required",
          message: "Must be authenticated to access this resource"
        });
        return;
      }

      if (req.user.isAnonymous) {
        res.status(403).json({
          error: "Moderator access required",
          message: "Anonymous users cannot perform moderator actions"
        });
        return;
      }

      // Check the specific moderator permission in real-time
      const permissionCheck = await this.authService.checkModeratorPermission(
        req.user.sessionToken,
        permission
      );

      if (!permissionCheck.hasPermission) {
        res.status(403).json({
          error: "Insufficient moderator permissions",
          message: `Moderator permission '${permission}' is required`,
          details: permissionCheck.error
        });
        return;
      }

      next();
    };
  };

  /**
   * Extract session token from request headers or query parameters
   */
  private extractSessionToken(req: Request): string | null {
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check query parameter as fallback
    const queryToken = req.query.sessionToken as string;
    if (queryToken) {
      return queryToken;
    }

    // Check body for POST requests
    const bodyToken = req.body?.sessionToken as string;
    if (bodyToken) {
      return bodyToken;
    }

    return null;
  }
}