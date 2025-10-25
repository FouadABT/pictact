import { RedditApiResult } from '../../shared/types/reddit-compliance.js';

/**
 * Devvit Resource Constraints
 * Configuration for Devvit platform resource limits
 */
export interface DevvitResourceConstraints {
  // Memory constraints
  maxMemoryMB: number;
  memoryWarningThresholdMB: number;
  
  // KV Store constraints
  maxKVStoreSize: number;
  maxKVKeySize: number;
  maxKVValueSize: number;
  maxKVOperationsPerSecond: number;
  
  // Processing constraints
  maxExecutionTimeMs: number;
  maxConcurrentOperations: number;
  
  // Network constraints
  maxRequestsPerMinute: number;
  maxResponseSizeKB: number;
}

/**
 * Resource Usage Statistics
 * Current resource usage information
 */
export interface ResourceUsageStats {
  memory: {
    used: number;
    available: number;
    percentage: number;
  };
  kvStore: {
    operations: number;
    storageUsed: number;
    keyCount: number;
  };
  processing: {
    activeOperations: number;
    averageExecutionTime: number;
    queueLength: number;
  };
  network: {
    requestsPerMinute: number;
    averageResponseSize: number;
    errorRate: number;
  };
}

/**
 * KV Store Operation Types
 */
export enum KVOperation {
  GET = 'get',
  SET = 'set',
  DELETE = 'delete',
  LIST = 'list',
  BATCH_GET = 'batch_get',
  BATCH_SET = 'batch_set'
}

/**
 * KV Store Optimization Configuration
 */
interface KVOptimizationConfig {
  enableCompression: boolean;
  enableBatching: boolean;
  batchSize: number;
  cacheEnabled: boolean;
  cacheTTLMs: number;
  maxCacheSize: number;
}

/**
 * Processing Operation Context
 */
interface ProcessingOperation {
  id: string;
  type: string;
  startTime: number;
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: number;
}

/**
 * Memory Pool for Object Reuse
 */
class MemoryPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn: (obj: T) => void, maxSize: number = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  size(): number {
    return this.pool.length;
  }
}

/**
 * Devvit Resource Manager
 * Optimizes resource usage for Devvit platform constraints
 * Requirements: 9.2, 9.4, 9.5 - Resource optimization and monitoring
 */
export class DevvitResourceManager {
  private constraints: DevvitResourceConstraints;
  private kvOptimization: KVOptimizationConfig;
  private activeOperations: Map<string, ProcessingOperation>;
  private operationQueue: ProcessingOperation[];
  private kvCache: Map<string, { value: any; expiry: number }>;
  private kvOperationHistory: Array<{ timestamp: number; operation: KVOperation }>;
  private memoryPools: Map<string, MemoryPool<any>>;
  private resourceStats: ResourceUsageStats;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(constraints?: Partial<DevvitResourceConstraints>) {
    this.constraints = {
      // Conservative Devvit limits
      maxMemoryMB: 128,
      memoryWarningThresholdMB: 100,
      
      // KV Store limits
      maxKVStoreSize: 100 * 1024 * 1024, // 100MB
      maxKVKeySize: 1024, // 1KB
      maxKVValueSize: 1024 * 1024, // 1MB
      maxKVOperationsPerSecond: 100,
      
      // Processing limits
      maxExecutionTimeMs: 30000, // 30 seconds
      maxConcurrentOperations: 10,
      
      // Network limits
      maxRequestsPerMinute: 60,
      maxResponseSizeKB: 1024, // 1MB
      
      ...constraints
    };

    this.kvOptimization = {
      enableCompression: true,
      enableBatching: true,
      batchSize: 10,
      cacheEnabled: true,
      cacheTTLMs: 300000, // 5 minutes
      maxCacheSize: 1000
    };

    this.activeOperations = new Map();
    this.operationQueue = [];
    this.kvCache = new Map();
    this.kvOperationHistory = [];
    this.memoryPools = new Map();

    this.resourceStats = {
      memory: { used: 0, available: this.constraints.maxMemoryMB, percentage: 0 },
      kvStore: { operations: 0, storageUsed: 0, keyCount: 0 },
      processing: { activeOperations: 0, averageExecutionTime: 0, queueLength: 0 },
      network: { requestsPerMinute: 0, averageResponseSize: 0, errorRate: 0 }
    };

    this.initializeMemoryPools();
    this.startResourceMonitoring();
  }

  /**
   * Optimized KV Store operations with batching and compression
   */
  async optimizedKVGet(key: string): Promise<RedditApiResult<any>> {
    try {
      // Check cache first
      if (this.kvOptimization.cacheEnabled) {
        const cached = this.getCachedValue(key);
        if (cached !== null) {
          return { success: true, data: cached };
        }
      }

      // Check rate limits
      if (!this.canPerformKVOperation()) {
        return {
          success: false,
          error: 'KV operation rate limit exceeded',
          rateLimited: true
        };
      }

      // Record operation
      this.recordKVOperation(KVOperation.GET);

      // Simulate KV get operation (replace with actual Devvit KV API)
      const value = await this.performKVGet(key);

      // Cache the result
      if (this.kvOptimization.cacheEnabled && value !== null) {
        this.setCachedValue(key, value);
      }

      return { success: true, data: value };
    } catch (error) {
      console.error(`KV get operation failed for key ${key}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'KV get operation failed'
      };
    }
  }

  /**
   * Optimized KV Store set with compression and validation
   */
  async optimizedKVSet(key: string, value: any): Promise<RedditApiResult<boolean>> {
    try {
      // Validate key and value sizes
      const validation = this.validateKVOperation(key, value);
      if (!validation.success) {
        return validation;
      }

      // Check rate limits
      if (!this.canPerformKVOperation()) {
        return {
          success: false,
          error: 'KV operation rate limit exceeded',
          rateLimited: true
        };
      }

      // Compress value if enabled
      let processedValue = value;
      if (this.kvOptimization.enableCompression) {
        processedValue = this.compressValue(value);
      }

      // Record operation
      this.recordKVOperation(KVOperation.SET);

      // Perform KV set operation
      await this.performKVSet(key, processedValue);

      // Update cache
      if (this.kvOptimization.cacheEnabled) {
        this.setCachedValue(key, value);
      }

      return { success: true, data: true };
    } catch (error) {
      console.error(`KV set operation failed for key ${key}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'KV set operation failed'
      };
    }
  }

  /**
   * Batch KV operations for efficiency
   */
  async batchKVOperations(operations: Array<{
    type: KVOperation;
    key: string;
    value?: any;
  }>): Promise<RedditApiResult<any[]>> {
    try {
      if (!this.kvOptimization.enableBatching) {
        // Execute operations individually
        const results = [];
        for (const op of operations) {
          if (op.type === KVOperation.GET) {
            results.push(await this.optimizedKVGet(op.key));
          } else if (op.type === KVOperation.SET) {
            results.push(await this.optimizedKVSet(op.key, op.value));
          }
        }
        return { success: true, data: results };
      }

      // Group operations by type for batching
      const getOperations = operations.filter(op => op.type === KVOperation.GET);
      const setOperations = operations.filter(op => op.type === KVOperation.SET);

      const results: any[] = [];

      // Batch get operations
      if (getOperations.length > 0) {
        const getResults = await this.performBatchKVGet(getOperations.map(op => op.key));
        results.push(...getResults);
      }

      // Batch set operations
      if (setOperations.length > 0) {
        const setData = setOperations.map(op => ({ key: op.key, value: op.value }));
        const setResults = await this.performBatchKVSet(setData);
        results.push(...setResults);
      }

      return { success: true, data: results };
    } catch (error) {
      console.error('Batch KV operations failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch KV operations failed'
      };
    }
  }

  /**
   * Memory-optimized processing with operation queuing
   */
  async executeWithResourceLimits<T>(
    operationType: string,
    operation: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium',
    estimatedDurationMs: number = 5000
  ): Promise<RedditApiResult<T>> {
    const operationId = `${operationType}_${Date.now()}_${Math.random()}`;

    try {
      // Check if we can execute immediately
      if (this.canExecuteOperation(priority)) {
        return await this.executeOperation(operationId, operationType, operation, priority, estimatedDurationMs);
      }

      // Queue the operation
      return await this.queueOperation(operationId, operationType, operation, priority, estimatedDurationMs);
    } catch (error) {
      console.error(`Resource-limited execution failed for ${operationType}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resource-limited execution failed'
      };
    }
  }

  /**
   * Get current resource usage statistics
   */
  getResourceUsage(): ResourceUsageStats {
    this.updateResourceStats();
    return { ...this.resourceStats };
  }

  /**
   * Get memory pool for object reuse
   */
  getMemoryPool<T>(poolName: string, createFn: () => T, resetFn: (obj: T) => void): MemoryPool<T> {
    if (!this.memoryPools.has(poolName)) {
      this.memoryPools.set(poolName, new MemoryPool(createFn, resetFn));
    }
    return this.memoryPools.get(poolName)!;
  }

  /**
   * Clear caches and free memory
   */
  clearCaches(): void {
    this.kvCache.clear();
    this.memoryPools.forEach(pool => pool.clear());
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Shutdown resource manager
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.clearCaches();
    this.activeOperations.clear();
    this.operationQueue.length = 0;
  }

  /**
   * Initialize memory pools for common objects
   */
  private initializeMemoryPools(): void {
    // Game state objects
    this.memoryPools.set('gameState', new MemoryPool(
      () => ({ gameId: '', status: '', players: [], rounds: [] }),
      (obj) => {
        obj.gameId = '';
        obj.status = '';
        obj.players.length = 0;
        obj.rounds.length = 0;
      }
    ));

    // Player objects
    this.memoryPools.set('player', new MemoryPool(
      () => ({ id: '', username: '', score: 0, submissions: [] }),
      (obj) => {
        obj.id = '';
        obj.username = '';
        obj.score = 0;
        obj.submissions.length = 0;
      }
    ));

    // API response objects
    this.memoryPools.set('apiResponse', new MemoryPool(
      () => ({ success: false, data: null, error: null }),
      (obj) => {
        obj.success = false;
        obj.data = null;
        obj.error = null;
      }
    ));
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateResourceStats();
      this.cleanupExpiredCache();
      this.processOperationQueue();
    }, 5000); // Monitor every 5 seconds
  }

  /**
   * Update resource usage statistics
   */
  private updateResourceStats(): void {
    // Update memory stats (approximation)
    const memoryUsage = process.memoryUsage();
    const usedMB = memoryUsage.heapUsed / (1024 * 1024);
    
    this.resourceStats.memory = {
      used: usedMB,
      available: this.constraints.maxMemoryMB - usedMB,
      percentage: (usedMB / this.constraints.maxMemoryMB) * 100
    };

    // Update KV store stats
    const now = Date.now();
    const recentOperations = this.kvOperationHistory.filter(
      op => now - op.timestamp < 60000 // Last minute
    );

    this.resourceStats.kvStore = {
      operations: recentOperations.length,
      storageUsed: this.estimateKVStorageUsage(),
      keyCount: this.kvCache.size
    };

    // Update processing stats
    const activeOps = Array.from(this.activeOperations.values());
    const completedOps = activeOps.filter(op => now - op.startTime > op.estimatedDuration);
    const avgExecutionTime = completedOps.length > 0 ?
      completedOps.reduce((sum, op) => sum + (now - op.startTime), 0) / completedOps.length : 0;

    this.resourceStats.processing = {
      activeOperations: this.activeOperations.size,
      averageExecutionTime: avgExecutionTime,
      queueLength: this.operationQueue.length
    };

    // Log warnings if resources are constrained
    if (this.resourceStats.memory.percentage > 80) {
      console.warn(`High memory usage: ${this.resourceStats.memory.percentage.toFixed(1)}%`);
    }

    if (this.resourceStats.processing.queueLength > 5) {
      console.warn(`High operation queue length: ${this.resourceStats.processing.queueLength}`);
    }
  }

  /**
   * Check if KV operation can be performed within rate limits
   */
  private canPerformKVOperation(): boolean {
    const now = Date.now();
    const recentOperations = this.kvOperationHistory.filter(
      op => now - op.timestamp < 1000 // Last second
    );

    return recentOperations.length < this.constraints.maxKVOperationsPerSecond;
  }

  /**
   * Record KV operation for rate limiting
   */
  private recordKVOperation(operation: KVOperation): void {
    const now = Date.now();
    this.kvOperationHistory.push({ timestamp: now, operation });

    // Keep only recent history (last hour)
    this.kvOperationHistory = this.kvOperationHistory.filter(
      op => now - op.timestamp < 3600000
    );
  }

  /**
   * Validate KV operation constraints
   */
  private validateKVOperation(key: string, value?: any): RedditApiResult<boolean> {
    // Check key size
    if (key.length > this.constraints.maxKVKeySize) {
      return {
        success: false,
        error: `Key size exceeds limit: ${key.length} > ${this.constraints.maxKVKeySize}`
      };
    }

    // Check value size if provided
    if (value !== undefined) {
      const valueSize = JSON.stringify(value).length;
      if (valueSize > this.constraints.maxKVValueSize) {
        return {
          success: false,
          error: `Value size exceeds limit: ${valueSize} > ${this.constraints.maxKVValueSize}`
        };
      }
    }

    return { success: true, data: true };
  }

  /**
   * Get cached value if available and not expired
   */
  private getCachedValue(key: string): any {
    const cached = this.kvCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.kvCache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set cached value with TTL
   */
  private setCachedValue(key: string, value: any): void {
    if (this.kvCache.size >= this.kvOptimization.maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.kvCache.entries());
      entries.sort((a, b) => a[1].expiry - b[1].expiry);
      
      const toRemove = Math.floor(this.kvOptimization.maxCacheSize * 0.1);
      for (let i = 0; i < toRemove; i++) {
        this.kvCache.delete(entries[i][0]);
      }
    }

    this.kvCache.set(key, {
      value,
      expiry: Date.now() + this.kvOptimization.cacheTTLMs
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.kvCache.entries()) {
      if (now > cached.expiry) {
        this.kvCache.delete(key);
      }
    }
  }

  /**
   * Compress value for storage efficiency
   */
  private compressValue(value: any): any {
    // Simple compression - in real implementation, use proper compression library
    if (typeof value === 'string' && value.length > 100) {
      // Simulate compression by removing extra whitespace
      return value.replace(/\s+/g, ' ').trim();
    }
    return value;
  }

  /**
   * Estimate KV storage usage
   */
  private estimateKVStorageUsage(): number {
    let totalSize = 0;
    for (const [key, cached] of this.kvCache.entries()) {
      totalSize += key.length + JSON.stringify(cached.value).length;
    }
    return totalSize;
  }

  /**
   * Check if operation can be executed immediately
   */
  private canExecuteOperation(priority: 'high' | 'medium' | 'low'): boolean {
    // High priority operations can always execute if under hard limit
    if (priority === 'high') {
      return this.activeOperations.size < this.constraints.maxConcurrentOperations;
    }

    // Medium and low priority operations have stricter limits
    const limit = priority === 'medium' ? 
      Math.floor(this.constraints.maxConcurrentOperations * 0.8) :
      Math.floor(this.constraints.maxConcurrentOperations * 0.6);

    return this.activeOperations.size < limit;
  }

  /**
   * Execute operation with resource tracking
   */
  private async executeOperation<T>(
    operationId: string,
    operationType: string,
    operation: () => Promise<T>,
    priority: 'high' | 'medium' | 'low',
    estimatedDurationMs: number
  ): Promise<RedditApiResult<T>> {
    const startTime = Date.now();

    // Track active operation
    this.activeOperations.set(operationId, {
      id: operationId,
      type: operationType,
      startTime,
      priority,
      estimatedDuration: estimatedDurationMs
    });

    try {
      // Set timeout for operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation ${operationType} timed out after ${this.constraints.maxExecutionTimeMs}ms`));
        }, this.constraints.maxExecutionTimeMs);
      });

      // Execute operation with timeout
      const result = await Promise.race([operation(), timeoutPromise]);

      return { success: true, data: result };
    } catch (error) {
      console.error(`Operation ${operationType} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed'
      };
    } finally {
      // Clean up tracking
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Queue operation for later execution
   */
  private async queueOperation<T>(
    operationId: string,
    operationType: string,
    operation: () => Promise<T>,
    priority: 'high' | 'medium' | 'low',
    estimatedDurationMs: number
  ): Promise<RedditApiResult<T>> {
    return new Promise((resolve) => {
      const queuedOperation: ProcessingOperation = {
        id: operationId,
        type: operationType,
        startTime: Date.now(),
        priority,
        estimatedDuration: estimatedDurationMs
      };

      // Insert in priority order
      let insertIndex = this.operationQueue.length;
      for (let i = 0; i < this.operationQueue.length; i++) {
        if (this.getPriorityValue(priority) > this.getPriorityValue(this.operationQueue[i].priority)) {
          insertIndex = i;
          break;
        }
      }

      this.operationQueue.splice(insertIndex, 0, queuedOperation);

      // Store resolve function for later execution
      (queuedOperation as any).resolve = resolve;
      (queuedOperation as any).operation = operation;
    });
  }

  /**
   * Process queued operations
   */
  private async processOperationQueue(): Promise<void> {
    while (this.operationQueue.length > 0 && this.canExecuteOperation(this.operationQueue[0].priority)) {
      const queuedOp = this.operationQueue.shift()!;
      const { resolve, operation } = queuedOp as any;

      try {
        const result = await this.executeOperation(
          queuedOp.id,
          queuedOp.type,
          operation,
          queuedOp.priority,
          queuedOp.estimatedDuration
        );
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Queued operation failed'
        });
      }
    }
  }

  /**
   * Get numeric priority value for sorting
   */
  private getPriorityValue(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  // Placeholder methods for actual KV operations (replace with Devvit KV API)
  private async performKVGet(key: string): Promise<any> {
    // Replace with actual Devvit KV get operation
    console.debug(`KV GET: ${key}`);
    return null;
  }

  private async performKVSet(key: string, value: any): Promise<void> {
    // Replace with actual Devvit KV set operation
    console.debug(`KV SET: ${key} = ${JSON.stringify(value).substring(0, 100)}...`);
  }

  private async performBatchKVGet(keys: string[]): Promise<any[]> {
    // Replace with actual Devvit batch KV get operation
    console.debug(`KV BATCH GET: ${keys.length} keys`);
    return keys.map(() => null);
  }

  private async performBatchKVSet(data: Array<{ key: string; value: any }>): Promise<boolean[]> {
    // Replace with actual Devvit batch KV set operation
    console.debug(`KV BATCH SET: ${data.length} items`);
    return data.map(() => true);
  }
}

/**
 * Default Devvit Resource Manager Instance
 */
export const defaultResourceManager = new DevvitResourceManager();

/**
 * Reddit-Native Monitoring Integration
 * Integrates with Reddit's monitoring and logging systems
 */
export class RedditNativeMonitor {
  private resourceManager: DevvitResourceManager;
  private monitoringInterval?: NodeJS.Timeout;
  private alertThresholds: {
    memoryPercentage: number;
    queueLength: number;
    errorRate: number;
  };

  constructor(resourceManager: DevvitResourceManager) {
    this.resourceManager = resourceManager;
    this.alertThresholds = {
      memoryPercentage: 85,
      queueLength: 10,
      errorRate: 0.1
    };
  }

  /**
   * Start Reddit-native monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
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
   * Perform health check and log to Reddit systems
   */
  private performHealthCheck(): void {
    const stats = this.resourceManager.getResourceUsage();

    // Check memory usage
    if (stats.memory.percentage > this.alertThresholds.memoryPercentage) {
      this.logAlert('HIGH_MEMORY_USAGE', {
        percentage: stats.memory.percentage,
        used: stats.memory.used,
        available: stats.memory.available
      });
    }

    // Check queue length
    if (stats.processing.queueLength > this.alertThresholds.queueLength) {
      this.logAlert('HIGH_QUEUE_LENGTH', {
        queueLength: stats.processing.queueLength,
        activeOperations: stats.processing.activeOperations
      });
    }

    // Check error rate
    if (stats.network.errorRate > this.alertThresholds.errorRate) {
      this.logAlert('HIGH_ERROR_RATE', {
        errorRate: stats.network.errorRate,
        requestsPerMinute: stats.network.requestsPerMinute
      });
    }

    // Log regular health metrics
    this.logHealthMetrics(stats);
  }

  /**
   * Log alert to Reddit monitoring systems
   */
  private logAlert(alertType: string, data: any): void {
    // In a real implementation, this would integrate with Reddit's monitoring APIs
    console.warn(`[REDDIT_MONITOR] Alert: ${alertType}`, data);
  }

  /**
   * Log health metrics to Reddit systems
   */
  private logHealthMetrics(stats: ResourceUsageStats): void {
    // In a real implementation, this would send metrics to Reddit's monitoring systems
    console.debug('[REDDIT_MONITOR] Health metrics:', {
      memory: stats.memory.percentage,
      kvOperations: stats.kvStore.operations,
      activeOps: stats.processing.activeOperations,
      queueLength: stats.processing.queueLength
    });
  }
}