import { RedditApiResult, RedditComplianceError, RedditComplianceErrorType } from '../../shared/types/reddit-compliance.js';

/**
 * Reddit API Rate Limit Configuration
 * Configures rate limiting behavior for different Reddit API endpoints
 */
export interface RateLimitConfig {
  // Request limits
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  
  // Backoff configuration
  backoffMultiplier: number;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  
  // Burst handling
  burstAllowance: number;
  burstWindowMs: number;
  
  // Priority levels
  priorityLevels: {
    [key: string]: number; // Higher number = higher priority
  };
}

/**
 * Request Priority Levels
 * Different priority levels for Reddit API requests
 */
export enum RequestPriority {
  CRITICAL = 'critical',     // Authentication, context retrieval
  HIGH = 'high',            // Game actions, moderator actions
  MEDIUM = 'medium',        // Content validation, user queries
  LOW = 'low',              // Background updates, analytics
  BACKGROUND = 'background' // Non-essential operations
}

/**
 * Rate Limit Status Information
 * Current status of rate limiting for an operation
 */
export interface RateLimitStatus {
  operation: string;
  remaining: number;
  resetTime: Date;
  isLimited: boolean;
  retryAfter?: number;
  priority: RequestPriority;
  queuePosition?: number;
}

/**
 * Request Queue Entry
 * Represents a queued Reddit API request
 */
interface QueuedRequest {
  id: string;
  operation: string;
  priority: RequestPriority;
  timestamp: Date;
  retryCount: number;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

/**
 * Request History Entry
 * Tracks historical requests for rate limiting calculations
 */
interface RequestHistoryEntry {
  timestamp: number;
  operation: string;
  priority: RequestPriority;
  success: boolean;
  duration: number;
}

/**
 * Backoff State
 * Tracks exponential backoff state for operations
 */
interface BackoffState {
  nextRetryTime: number;
  retryCount: number;
  currentDelayMs: number;
}

/**
 * Reddit API Rate Limit Manager
 * Implements intelligent request scheduling, exponential backoff, and retry logic
 * Requirements: 9.1, 9.3 - Reddit API rate limit management and optimization
 */
export class RedditRateLimitManager {
  private config: RateLimitConfig;
  private requestHistory: Map<string, RequestHistoryEntry[]>;
  private backoffStates: Map<string, BackoffState>;
  private requestQueue: QueuedRequest[];
  private isProcessingQueue: boolean;
  private queueProcessingInterval?: NodeJS.Timeout;
  private requestCounter: number;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      // Default Reddit API limits (conservative estimates)
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 3600,
      maxRequestsPerDay: 86400,
      
      // Exponential backoff configuration
      backoffMultiplier: 2,
      maxRetries: 5,
      baseDelayMs: 1000,
      maxDelayMs: 300000, // 5 minutes max delay
      
      // Burst handling
      burstAllowance: 10,
      burstWindowMs: 5000,
      
      // Priority levels (higher = more important)
      priorityLevels: {
        [RequestPriority.CRITICAL]: 100,
        [RequestPriority.HIGH]: 80,
        [RequestPriority.MEDIUM]: 60,
        [RequestPriority.LOW]: 40,
        [RequestPriority.BACKGROUND]: 20
      },
      
      ...config
    };

    this.requestHistory = new Map();
    this.backoffStates = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.requestCounter = 0;

    // Start queue processing
    this.startQueueProcessing();
  }

  /**
   * Execute a Reddit API call with intelligent rate limiting
   * Implements request scheduling, priority handling, and retry logic
   */
  async executeWithRateLimit<T>(
    operation: string,
    apiCall: () => Promise<T>,
    priority: RequestPriority = RequestPriority.MEDIUM
  ): Promise<RedditApiResult<T>> {
    const requestId = `${operation}_${++this.requestCounter}_${Date.now()}`;
    
    try {
      // Check if we can execute immediately
      const canExecute = this.canExecuteImmediately(operation, priority);
      
      if (canExecute) {
        return await this.executeRequest(operation, apiCall, priority);
      }

      // Queue the request if rate limited
      return await this.queueRequest(requestId, operation, apiCall, priority);
    } catch (error) {
      console.error(`Rate limit manager error for operation ${operation}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rate limit manager error'
      };
    }
  }

  /**
   * Get current rate limit status for an operation
   */
  getRateLimitStatus(operation: string, priority: RequestPriority = RequestPriority.MEDIUM): RateLimitStatus {
    const now = Date.now();
    const operationKey = this.getOperationKey(operation);
    
    // Get request history for this operation
    const history = this.requestHistory.get(operationKey) || [];
    const recentHistory = history.filter(entry => now - entry.timestamp < 3600000); // Last hour
    
    // Calculate remaining requests
    const requestsInLastMinute = recentHistory.filter(entry => now - entry.timestamp < 60000).length;
    const requestsInLastHour = recentHistory.length;
    
    const remainingMinute = Math.max(0, this.config.maxRequestsPerMinute - requestsInLastMinute);
    const remainingHour = Math.max(0, this.config.maxRequestsPerHour - requestsInLastHour);
    const remaining = Math.min(remainingMinute, remainingHour);
    
    // Check backoff state
    const backoffState = this.backoffStates.get(operationKey);
    const isInBackoff = backoffState && now < backoffState.nextRetryTime;
    
    // Calculate next reset time
    const nextMinuteReset = new Date(Math.ceil(now / 60000) * 60000);
    const nextHourReset = new Date(Math.ceil(now / 3600000) * 3600000);
    const resetTime = remainingMinute === 0 ? nextMinuteReset : nextHourReset;
    
    // Find queue position if queued
    const queuePosition = this.findQueuePosition(operation, priority);
    
    return {
      operation,
      remaining,
      resetTime,
      isLimited: remaining === 0 || isInBackoff,
      retryAfter: isInBackoff ? Math.ceil((backoffState!.nextRetryTime - now) / 1000) : undefined,
      priority,
      queuePosition
    };
  }

  /**
   * Get comprehensive rate limit statistics
   */
  getStatistics(): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    queueLength: number;
    activeBackoffs: number;
    requestsByPriority: Record<RequestPriority, number>;
  } {
    const now = Date.now();
    const allHistory: RequestHistoryEntry[] = [];
    
    // Collect all history entries
    for (const history of this.requestHistory.values()) {
      allHistory.push(...history.filter(entry => now - entry.timestamp < 3600000));
    }
    
    const totalRequests = allHistory.length;
    const successfulRequests = allHistory.filter(entry => entry.success).length;
    const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 1;
    
    const totalDuration = allHistory.reduce((sum, entry) => sum + entry.duration, 0);
    const averageResponseTime = totalRequests > 0 ? totalDuration / totalRequests : 0;
    
    const activeBackoffs = Array.from(this.backoffStates.values())
      .filter(state => now < state.nextRetryTime).length;
    
    const requestsByPriority: Record<RequestPriority, number> = {
      [RequestPriority.CRITICAL]: 0,
      [RequestPriority.HIGH]: 0,
      [RequestPriority.MEDIUM]: 0,
      [RequestPriority.LOW]: 0,
      [RequestPriority.BACKGROUND]: 0
    };
    
    allHistory.forEach(entry => {
      requestsByPriority[entry.priority]++;
    });
    
    return {
      totalRequests,
      successRate,
      averageResponseTime,
      queueLength: this.requestQueue.length,
      activeBackoffs,
      requestsByPriority
    };
  }

  /**
   * Clear rate limit history and reset backoff states
   */
  reset(): void {
    this.requestHistory.clear();
    this.backoffStates.clear();
    this.requestQueue.length = 0;
    this.requestCounter = 0;
  }

  /**
   * Shutdown the rate limit manager
   */
  shutdown(): void {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = undefined;
    }
    
    // Reject all queued requests
    this.requestQueue.forEach(request => {
      request.reject(new Error('Rate limit manager shutting down'));
    });
    
    this.requestQueue.length = 0;
  }

  /**
   * Check if a request can be executed immediately
   */
  private canExecuteImmediately(operation: string, priority: RequestPriority): boolean {
    const operationKey = this.getOperationKey(operation);
    const now = Date.now();
    
    // Check backoff state
    const backoffState = this.backoffStates.get(operationKey);
    if (backoffState && now < backoffState.nextRetryTime) {
      return false;
    }
    
    // Check rate limits
    const history = this.requestHistory.get(operationKey) || [];
    const recentHistory = history.filter(entry => now - entry.timestamp < 60000); // Last minute
    
    // Allow burst for high priority requests
    if (priority === RequestPriority.CRITICAL || priority === RequestPriority.HIGH) {
      const burstHistory = history.filter(entry => now - entry.timestamp < this.config.burstWindowMs);
      if (burstHistory.length < this.config.burstAllowance) {
        return true;
      }
    }
    
    return recentHistory.length < this.config.maxRequestsPerMinute;
  }

  /**
   * Execute a request immediately
   */
  private async executeRequest<T>(
    operation: string,
    apiCall: () => Promise<T>,
    priority: RequestPriority
  ): Promise<RedditApiResult<T>> {
    const operationKey = this.getOperationKey(operation);
    const startTime = Date.now();
    
    try {
      // Record the request attempt
      this.recordRequestAttempt(operationKey, priority, startTime);
      
      // Execute the API call
      const result = await apiCall();
      
      // Record successful completion
      const duration = Date.now() - startTime;
      this.recordRequestCompletion(operationKey, priority, startTime, true, duration);
      
      // Clear any backoff state on success
      this.backoffStates.delete(operationKey);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordRequestCompletion(operationKey, priority, startTime, false, duration);
      
      // Handle rate limit errors
      if (this.isRateLimitError(error)) {
        this.handleRateLimitError(operationKey, error);
        
        return {
          success: false,
          error: 'Rate limited by Reddit API',
          rateLimited: true,
          retryAfter: this.getRetryAfter(operationKey)
        };
      }
      
      // Handle other errors
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API call failed'
      };
    }
  }

  /**
   * Queue a request for later execution
   */
  private async queueRequest<T>(
    requestId: string,
    operation: string,
    apiCall: () => Promise<T>,
    priority: RequestPriority
  ): Promise<RedditApiResult<T>> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: requestId,
        operation,
        priority,
        timestamp: new Date(),
        retryCount: 0,
        execute: apiCall,
        resolve: (result: RedditApiResult<T>) => resolve(result),
        reject
      };
      
      // Insert request in priority order
      this.insertRequestByPriority(queuedRequest);
    });
  }

  /**
   * Insert a request into the queue based on priority
   */
  private insertRequestByPriority(request: QueuedRequest): void {
    const requestPriority = this.config.priorityLevels[request.priority] || 0;
    
    let insertIndex = this.requestQueue.length;
    
    // Find insertion point based on priority
    for (let i = 0; i < this.requestQueue.length; i++) {
      const queuedPriority = this.config.priorityLevels[this.requestQueue[i].priority] || 0;
      if (requestPriority > queuedPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.requestQueue.splice(insertIndex, 0, request);
  }

  /**
   * Start processing the request queue
   */
  private startQueueProcessing(): void {
    if (this.queueProcessingInterval) {
      return;
    }
    
    this.queueProcessingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Process queue every second
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      const request = this.requestQueue[0];
      
      // Check if we can execute this request now
      if (this.canExecuteImmediately(request.operation, request.priority)) {
        // Remove from queue
        this.requestQueue.shift();
        
        // Execute the request
        try {
          const result = await this.executeRequest(
            request.operation,
            request.execute,
            request.priority
          );
          request.resolve(result);
        } catch (error) {
          // Handle retry logic
          if (request.retryCount < this.config.maxRetries && this.isRetryableError(error)) {
            request.retryCount++;
            this.insertRequestByPriority(request); // Re-queue for retry
          } else {
            request.reject(error);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Record a request attempt
   */
  private recordRequestAttempt(operationKey: string, priority: RequestPriority, timestamp: number): void {
    // This could be used for more detailed analytics if needed
    console.debug(`Recording request attempt for ${operationKey} with priority ${priority}`);
  }

  /**
   * Record request completion
   */
  private recordRequestCompletion(
    operationKey: string,
    priority: RequestPriority,
    timestamp: number,
    success: boolean,
    duration: number
  ): void {
    const history = this.requestHistory.get(operationKey) || [];
    
    history.push({
      timestamp,
      operation: operationKey,
      priority,
      success,
      duration
    });
    
    // Keep only recent history (last 24 hours)
    const now = Date.now();
    const recentHistory = history.filter(entry => now - entry.timestamp < 86400000);
    
    this.requestHistory.set(operationKey, recentHistory);
  }

  /**
   * Handle rate limit errors with exponential backoff
   */
  private handleRateLimitError(operationKey: string, error: any): void {
    const currentState = this.backoffStates.get(operationKey) || {
      nextRetryTime: 0,
      retryCount: 0,
      currentDelayMs: this.config.baseDelayMs
    };
    
    // Calculate next retry time with exponential backoff
    const delayMs = Math.min(
      currentState.currentDelayMs * this.config.backoffMultiplier,
      this.config.maxDelayMs
    );
    
    const nextRetryTime = Date.now() + delayMs;
    
    this.backoffStates.set(operationKey, {
      nextRetryTime,
      retryCount: currentState.retryCount + 1,
      currentDelayMs: delayMs
    });
    
    console.warn(`Rate limited for ${operationKey}, backing off for ${delayMs}ms`);
  }

  /**
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const errorStatus = error.status || error.statusCode;
    
    return errorStatus === 429 ||
           errorMessage.toLowerCase().includes('rate limit') ||
           errorMessage.toLowerCase().includes('too many requests') ||
           errorMessage.toLowerCase().includes('quota exceeded');
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const errorStatus = error.status || error.statusCode;
    
    // Retry on rate limits, server errors, and network errors
    return errorStatus === 429 ||
           (errorStatus >= 500 && errorStatus < 600) ||
           error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND';
  }

  /**
   * Get retry after time for an operation
   */
  private getRetryAfter(operationKey: string): number | undefined {
    const backoffState = this.backoffStates.get(operationKey);
    if (!backoffState) return undefined;
    
    const now = Date.now();
    return backoffState.nextRetryTime > now ? 
      Math.ceil((backoffState.nextRetryTime - now) / 1000) : undefined;
  }

  /**
   * Find queue position for an operation with given priority
   */
  private findQueuePosition(operation: string, priority: RequestPriority): number | undefined {
    const index = this.requestQueue.findIndex(
      request => request.operation === operation && request.priority === priority
    );
    return index >= 0 ? index + 1 : undefined;
  }

  /**
   * Get operation key for tracking
   */
  private getOperationKey(operation: string): string {
    return `reddit_api_${operation}`;
  }
}

/**
 * Default Reddit Rate Limit Manager Instance
 * Pre-configured instance for common use cases
 */
export const defaultRateLimitManager = new RedditRateLimitManager();

/**
 * Reddit API Usage Monitor
 * Monitors and reports on Reddit API usage patterns
 */
export class RedditApiUsageMonitor {
  private rateLimitManager: RedditRateLimitManager;
  private monitoringInterval?: NodeJS.Timeout;
  private usageReports: Array<{
    timestamp: Date;
    statistics: any;
  }>;

  constructor(rateLimitManager: RedditRateLimitManager) {
    this.rateLimitManager = rateLimitManager;
    this.usageReports = [];
  }

  /**
   * Start monitoring Reddit API usage
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.collectUsageReport();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Get usage reports
   */
  getUsageReports(hours: number = 24): Array<{
    timestamp: Date;
    statistics: any;
  }> {
    const cutoff = new Date(Date.now() - hours * 3600000);
    return this.usageReports.filter(report => report.timestamp >= cutoff);
  }

  /**
   * Collect current usage report
   */
  private collectUsageReport(): void {
    const statistics = this.rateLimitManager.getStatistics();
    
    this.usageReports.push({
      timestamp: new Date(),
      statistics
    });

    // Keep only last 24 hours of reports
    const cutoff = new Date(Date.now() - 24 * 3600000);
    this.usageReports = this.usageReports.filter(report => report.timestamp >= cutoff);

    // Log warnings if usage is high
    if (statistics.successRate < 0.9) {
      console.warn(`Reddit API success rate low: ${(statistics.successRate * 100).toFixed(1)}%`);
    }

    if (statistics.queueLength > 10) {
      console.warn(`Reddit API queue length high: ${statistics.queueLength} requests`);
    }
  }
}