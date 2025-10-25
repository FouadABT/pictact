// Core authentication exports
export { AuthenticationService } from './auth';
export { SessionManager } from './session-manager';
export { AuthMiddleware } from './auth-middleware';

// Profile management exports
export { ProfileService } from './profile-service';
export { ProfileStorageService } from './profile-storage';

// Re-export existing core modules
export * from './post';