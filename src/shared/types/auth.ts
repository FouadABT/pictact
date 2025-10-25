// Authentication and user identity types

export interface AuthenticatedUser {
  redditUsername: string;
  redditUserId: string;
  sessionToken: string;
  permissions: UserPermissions;
  isAnonymous: boolean;
  subredditContext?: string;
}

export interface UserPermissions {
  canCreateEvents: boolean;
  canModerate: boolean;
  canViewProfiles: boolean;
  canExportData: boolean;
}

export interface UserSession {
  sessionId: string;
  redditUsername: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  permissions: UserPermissions;
  subredditContext: string;
  isAnonymous: boolean;
}

export interface SessionValidationResult {
  isValid: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

export interface AuthenticationResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

// API request/response types for authentication
export interface AuthStatusRequest {
  sessionToken?: string;
}

export interface AuthStatusResponse {
  type: "auth_status";
  isAuthenticated: boolean;
  user?: {
    username: string;
    userId: string;
    isAnonymous: boolean;
    permissions: UserPermissions;
    subredditContext?: string;
  };
  sessionToken?: string;
}

export interface LogoutRequest {
  sessionToken: string;
}

export interface LogoutResponse {
  type: "logout";
  success: boolean;
  message?: string;
}