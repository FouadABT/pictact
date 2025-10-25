import { RedditRateLimitManager } from './reddit-rate-limit-manager.js';
import { DevvitResourceManager, ResourceUsageStats } from './devvit-resource-manager.js';
import { RedditApiResult } from '../../shared/types/reddit-compliance.js';

/**
 * Performance Metrics
 * Comprehensive performance tracking for Reddit integration
 */
export interface PerformanceMetrics {
  // API Performance
  apiMetrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    rateLimitHits: number;
    errorsByType: Record<string, number>;
  };

  // Resource Usage
  resourceMetrics: ResourceUsageStats;

  // Game Performance
  gameMetrics: {
    activeGames: number;
    totalPlayers: number;
    averageGameDuration: number;
    submissionsPerMinute: number;
    validationSuccessRate: number;
  };

  // System Health
  healthMetrics: {
    uptime: number;
    memoryLeaks: boolean;
    errorRate: number;
    responseTimeP95: number;
    queueBacklog: number;
  };
}

/**
 * Alert Configuration
 * Defines thresholds for various monitoring alerts
 */
interface AlertConfig {
  memoryUsageThreshold: number;
  errorRateThreshold: number;
  responseTimeThreshold: number;
  queueLengthThreshold: number;
  rateLimitThreshold: number;
}

/**
 * Monitoring Event Types
 */
export enum MonitoringEventType {
  PERFORMANCE_ALERT = 'performance_alert',
  RESOURCE_WARNING = 'resource_warning',
  API_ERROR = 'api_error',
  GAME_EVENT = 'game_event',
  SYSTEM_HEALTH = 'system_health'
}

/**
 * Monitoring Event
 */
export interface MonitoringEvent {
  type: MonitoringEventType;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  data: any;
  subreddit?: string;
  gameId?: string;
}

/**
 * Reddit Native Monitoring Service
 * Integrates with Reddit's monitoring and logging infrastructure
 * Requirements: 9.4, 9.5 - Reddit-native monitoring and logging integration
 */
export class RedditMonitoringService {
  private rateLimitManager: RedditRateLimitManager;
  private resourceManager: DevvitResourceManager;
  private alertConfig: AlertConfig;
  private performanceHistory: PerformanceMetrics[];
  private eventHistory: MonitoringEvent[];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring: boolean;
  private startTime: Date;

  constructor(
    rateLimitManager: RedditRateLimitManager,
    resourceManager: DevvitResourceManager,
    alertConfig?: Partial<AlertConfig>
  ) {
    this.rateLimitManager = rateLimitManager;
    this.resourceManager = resourceManager;
    this.alertConfig = {
      memoryUsageThreshold: 85, // 85% memory usage
      errorRateThreshold: 0.05, // 5% error rate
      responseTimeThreshold: 5000, // 5 seconds
      queueLengthThreshold: 20, // 20 queued operations
      rateLimitThreshold: 0.8, // 80% of rate limit
      ...alertConfig
    };

    this.performanceHistory = [];
    this.eventHistory = [];
    this.isMonitoring = false;
    this.startTime = new Date();
  }

  /**
   * Start comprehensive monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.logEvent(MonitoringEventType.SYSTEM_HEALTH, 'info', 'Monitoring started', {
      interval: intervalMs,
      alertConfig: this.alertConfig
    });

    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCycle();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.logEvent(MonitoringEventType.SYSTEM_HEALTH, 'info', 'Monitoring stopped', {
      uptime: Date.now() - this.startTime.getTime(),
      totalEvents: this.eventHistory.length
    });
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const rateLimitStats = this.rateLimitManager.getStatistics();
    const resourceStats = this.resourceManager.getResourceUsage();

    return {
      apiMetrics: {
        totalRequests: rateLimitStats.totalRequests,
        successfulRequests: Math.floor(rateLimitStats.totalRequests * rateLimitStats.successRate),
        failedRequests: Math.floor(rateLimitStats.totalRequests * (1 - rateLimitStats.successRate)),
        averageResponseTime: rateLimitStats.averageResponseTime,
        rateLimitHits: rateLimitStats.activeBackoffs,
        errorsByType: this.getErrorsByType()
      },
      resourceMetrics: resourceStats,
      gameMetrics: this.getGameMetrics(),
      healthMetrics: {
        uptime: Date.now() - this.startTime.getTime(),
        memoryLeaks: this.detectMemoryLeaks(),
        errorRate: 1 - rateLimitStats.successRate,
        responseTimeP95: this.calculateP95ResponseTime(),
        queueBacklog: resourceStats.processing.queueLength
      }
    };
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(hours: number = 24): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - hours * 3600000);
    return this.performanceHistory.filter(
      metrics => new Date(metrics.healthMetrics.uptime) >= cutoff
    );
  }

  /**
   * Get monitoring events
   */
  getEvents(
    type?: MonitoringEventType,
    severity?: 'info' | 'warning' | 'error' | 'critical',
    hours: number = 24
  ): MonitoringEvent[] {
    const cutoff = new Date(Date.now() - hours * 3600000);
    
    return this.eventHistory.filter(event => {
      if (event.timestamp < cutoff) return false;
      if (type && event.type !== type) return false;
      if (severity && event.severity !== severity) return false;
      return true;
    });
  }

  /**
   * Log a monitoring event
   */
  logEvent(
    type: MonitoringEventType,
    severity: 'info' | 'warning' | 'error' | 'critical',
    message: string,
    data?: any,
    subreddit?: string,
    gameId?: string
  ): void {
    const event: MonitoringEvent = {
      type,
      timestamp: new Date(),
      severity,
      message,
      data: data || {},
      subreddit,
      gameId
    };

    this.eventHistory.push(event);

    // Keep only recent events (last 7 days)
    const cutoff = new Date(Date.now() - 7 * 24 * 3600000);
    this.eventHistory = this.eventHistory.filter(e => e.timestamp >= cutoff);

    // Log to Reddit's monitoring systems
    this.logToRedditSystems(event);

    // Trigger alerts if necessary
    if (severity === 'error' || severity === 'critical') {
      this.triggerAlert(event);
    }
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
    const eventType = success ? MonitoringEventType.SYSTEM_HEALTH : MonitoringEventType.API_ERROR;
    const severity = success ? 'info' : 'warning';

    this.logEvent(eventType, severity, `API operation: ${operation}`, {
      operation,
      success,
      responseTime,
      error,
      timestamp: new Date().toISOString()
    }, subreddit);
  }

  /**
   * Log game event for monitoring
   */
  logGameEvent(
    gameId: string,
    eventType: string,
    data: any,
    subreddit?: string
  ): void {
    this.logEvent(MonitoringEventType.GAME_EVENT, 'info', `Game event: ${eventType}`, {
      gameId,
      eventType,
      ...data
    }, subreddit, gameId);
  }

  /**
   * Generate monitoring report
   */
  generateReport(hours: number = 24): {
    summary: any;
    metrics: PerformanceMetrics;
    alerts: MonitoringEvent[];
    recommendations: string[];
  } {
    const metrics = this.getCurrentMetrics();
    const alerts = this.getEvents(undefined, 'error', hours)
      .concat(this.getEvents(undefined, 'critical', hours));

    const recommendations = this.generateRecommendations(metrics, alerts);

    return {
      summary: {
        timeRange: `${hours} hours`,
        totalEvents: this.eventHistory.length,
        alertCount: alerts.length,
        uptime: metrics.healthMetrics.uptime,
        overallHealth: this.calculateOverallHealth(metrics)
      },
      metrics,
      alerts,
      recommendations
    };
  }

  /**
   * Perform monitoring cycle
   */
  private performMonitoringCycle(): void {
    try {
      const metrics = this.getCurrentMetrics();
      
      // Store metrics history
      this.performanceHistory.push(metrics);
      
      // Keep only recent history (last 7 days)
      const cutoff = Date.now() - 7 * 24 * 3600000;
      this.performanceHistory = this.performanceHistory.filter(
        m => m.healthMetrics.uptime > cutoff
      );

      // Check for alerts
      this.checkAlerts(metrics);

      // Log health status
      this.logEvent(MonitoringEventType.SYSTEM_HEALTH, 'info', 'Health check completed', {
        memoryUsage: metrics.resourceMetrics.memory.percentage,
        errorRate: metrics.healthMetrics.errorRate,
        queueLength: metrics.resourceMetrics.processing.queueLength,
        activeGames: metrics.gameMetrics.activeGames
      });

    } catch (error) {
      this.logEvent(MonitoringEventType.SYSTEM_HEALTH, 'error', 'Monitoring cycle failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    // Memory usage alert
    if (metrics.resourceMetrics.memory.percentage > this.alertConfig.memoryUsageThreshold) {
      this.logEvent(MonitoringEventType.RESOURCE_WARNING, 'warning', 'High memory usage detected', {
        current: metrics.resourceMetrics.memory.percentage,
        threshold: this.alertConfig.memoryUsageThreshold,
        used: metrics.resourceMetrics.memory.used,
        available: metrics.resourceMetrics.memory.available
      });
    }

    // Error rate alert
    if (metrics.healthMetrics.errorRate > this.alertConfig.errorRateThreshold) {
      this.logEvent(MonitoringEventType.PERFORMANCE_ALERT, 'error', 'High error rate detected', {
        current: metrics.healthMetrics.errorRate,
        threshold: this.alertConfig.errorRateThreshold,
        totalRequests: metrics.apiMetrics.totalRequests,
        failedRequests: metrics.apiMetrics.failedRequests
      });
    }

    // Response time alert
    if (metrics.healthMetrics.responseTimeP95 > this.alertConfig.responseTimeThreshold) {
      this.logEvent(MonitoringEventType.PERFORMANCE_ALERT, 'warning', 'High response time detected', {
        current: metrics.healthMetrics.responseTimeP95,
        threshold: this.alertConfig.responseTimeThreshold,
        average: metrics.apiMetrics.averageResponseTime
      });
    }

    // Queue length alert
    if (metrics.resourceMetrics.processing.queueLength > this.alertConfig.queueLengthThreshold) {
      this.logEvent(MonitoringEventType.RESOURCE_WARNING, 'warning', 'High queue length detected', {
        current: metrics.resourceMetrics.processing.queueLength,
        threshold: this.alertConfig.queueLengthThreshold,
        activeOperations: metrics.resourceMetrics.processing.activeOperations
      });
    }
  }

  /**
   * Log to Reddit's monitoring systems
   */
  private logToRedditSystems(event: MonitoringEvent): void {
    // In a real implementation, this would integrate with Reddit's monitoring APIs
    // For now, we'll use structured console logging that Reddit can collect
    
    const logLevel = this.getLogLevel(event.severity);
    const logData = {
      timestamp: event.timestamp.toISOString(),
      type: event.type,
      severity: event.severity,
      message: event.message,
      subreddit: event.subreddit,
      gameId: event.gameId,
      data: event.data,
      source: 'PicTact'
    };

    console[logLevel]('[REDDIT_MONITOR]', JSON.stringify(logData));
  }

  /**
   * Trigger alert for critical events
   */
  private triggerAlert(event: MonitoringEvent): void {
    // In a real implementation, this would integrate with Reddit's alerting systems
    console.error('[REDDIT_ALERT]', {
      type: event.type,
      severity: event.severity,
      message: event.message,
      timestamp: event.timestamp.toISOString(),
      data: event.data
    });
  }

  /**
   * Get console log level for event severity
   */
  private getLogLevel(severity: string): 'log' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case 'info': return 'info';
      case 'warning': return 'warn';
      case 'error':
      case 'critical': return 'error';
      default: return 'log';
    }
  }

  /**
   * Get errors by type from event history
   */
  private getErrorsByType(): Record<string, number> {
    const errors: Record<string, number> = {};
    
    const errorEvents = this.eventHistory.filter(
      event => event.type === MonitoringEventType.API_ERROR
    );

    errorEvents.forEach(event => {
      const errorType = event.data?.error || 'unknown';
      errors[errorType] = (errors[errorType] || 0) + 1;
    });

    return errors;
  }

  /**
   * Get game-specific metrics
   */
  private getGameMetrics(): any {
    // This would integrate with actual game state tracking
    // For now, return placeholder metrics
    return {
      activeGames: 0,
      totalPlayers: 0,
      averageGameDuration: 0,
      submissionsPerMinute: 0,
      validationSuccessRate: 1.0
    };
  }

  /**
   * Detect potential memory leaks
   */
  private detectMemoryLeaks(): boolean {
    if (this.performanceHistory.length < 10) {
      return false;
    }

    // Check if memory usage is consistently increasing
    const recentMetrics = this.performanceHistory.slice(-10);
    const memoryTrend = recentMetrics.map(m => m.resourceMetrics.memory.percentage);
    
    let increasingCount = 0;
    for (let i = 1; i < memoryTrend.length; i++) {
      if (memoryTrend[i] > memoryTrend[i - 1]) {
        increasingCount++;
      }
    }

    // If memory is increasing in 80% of recent samples, flag as potential leak
    return increasingCount / (memoryTrend.length - 1) > 0.8;
  }

  /**
   * Calculate 95th percentile response time
   */
  private calculateP95ResponseTime(): number {
    // This would calculate from actual response time data
    // For now, return a placeholder based on average
    const metrics = this.rateLimitManager.getStatistics();
    return metrics.averageResponseTime * 1.5; // Rough approximation
  }

  /**
   * Calculate overall system health score
   */
  private calculateOverallHealth(metrics: PerformanceMetrics): number {
    let score = 100;

    // Deduct points for various issues
    if (metrics.resourceMetrics.memory.percentage > 80) score -= 20;
    if (metrics.healthMetrics.errorRate > 0.05) score -= 30;
    if (metrics.resourceMetrics.processing.queueLength > 10) score -= 15;
    if (metrics.apiMetrics.rateLimitHits > 0) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Generate recommendations based on metrics and alerts
   */
  private generateRecommendations(
    metrics: PerformanceMetrics,
    alerts: MonitoringEvent[]
  ): string[] {
    const recommendations: string[] = [];

    // Memory recommendations
    if (metrics.resourceMetrics.memory.percentage > 80) {
      recommendations.push('Consider optimizing memory usage or clearing caches');
    }

    // Performance recommendations
    if (metrics.healthMetrics.errorRate > 0.05) {
      recommendations.push('Investigate and fix sources of API errors');
    }

    // Queue recommendations
    if (metrics.resourceMetrics.processing.queueLength > 10) {
      recommendations.push('Consider increasing processing capacity or optimizing operations');
    }

    // Rate limit recommendations
    if (metrics.apiMetrics.rateLimitHits > 0) {
      recommendations.push('Review and optimize Reddit API usage patterns');
    }

    // Alert-based recommendations
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push('Address critical alerts immediately');
    }

    return recommendations;
  }
}

/**
 * Default monitoring service instance
 */
let defaultMonitoringService: RedditMonitoringService | null = null;

/**
 * Get or create default monitoring service
 */
export function getDefaultMonitoringService(
  rateLimitManager: RedditRateLimitManager,
  resourceManager: DevvitResourceManager
): RedditMonitoringService {
  if (!defaultMonitoringService) {
    defaultMonitoringService = new RedditMonitoringService(rateLimitManager, resourceManager);
  }
  return defaultMonitoringService;
}