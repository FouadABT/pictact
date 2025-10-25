/**
 * Reddit Real-Time Client Service
 * Client-side service for handling real-time updates through Reddit comment polling
 * Replaces WebSocket functionality with Reddit-native polling mechanism
 */

import { GameUpdate, TimerSyncData, UpdateCallback } from '../../shared/types/reddit-compliance';

/**
 * Client Polling Configuration
 */
interface ClientPollingConfig {
  pollInterval: number; // Polling interval in milliseconds
  maxRetries: number;
  backoffMultiplier: number;
  reconnectDelay: number;
}

/**
 * Connection State
 */
interface ConnectionState {
  isConnected: boolean;
  isPolling: boolean;
  lastUpdateTime: Date;
  errorCount: number;
  gameId: string | null;
}

/**
 * Timer State for Client-Side Synchronization
 */
interface TimerState {
  gameStartTime: Date | null;
  roundStartTime: Date | null;
  serverTimeOffset: number; // Difference between server and client time
  isRunning: boolean;
  currentRoundDuration: number; // Duration in seconds
}

/**
 * Reddit Real-Time Client
 * Handles real-time updates through Reddit comment polling on the client side
 */
export class RedditRealTimeClient {
  private config: ClientPollingConfig;
  private state: ConnectionState;
  private timerState: TimerState;
  private pollingInterval: number | null = null;
  private timerInterval: number | null = null;
  private updateCallbacks: Map<string, UpdateCallback[]>;
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
    
    this.config = {
      pollInterval: 5000, // Poll every 5 seconds
      maxRetries: 3,
      backoffMultiplier: 2,
      reconnectDelay: 10000 // 10 seconds
    };

    this.state = {
      isConnected: false,
      isPolling: false,
      lastUpdateTime: new Date(),
      errorCount: 0,
      gameId: null
    };

    this.timerState = {
      gameStartTime: null,
      roundStartTime: null,
      serverTimeOffset: 0,
      isRunning: false,
      currentRoundDuration: 300 // Default 5 minutes
    };

    this.updateCallbacks = new Map();
  }

  /**
   * Connect to a game and start polling for updates
   */
  async connect(gameId: string): Promise<boolean> {
    try {
      console.log(`🔗 Connecting to game: ${gameId}`);
      
      this.state.gameId = gameId;
      
      // Synchronize timer with server
      const syncResult = await this.synchronizeTimer(gameId);
      if (!syncResult) {
        console.warn('⚠️ Failed to synchronize timer, using local time');
      }

      // Start polling for updates
      await this.startPolling();
      
      this.state.isConnected = true;
      this.state.errorCount = 0;
      
      console.log('✅ Connected to Reddit real-time updates');
      this.notifyCallbacks('connection', { type: 'connected', gameId });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to game:', error);
      this.state.isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from the game and stop polling
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from Reddit real-time updates');
    
    this.stopPolling();
    this.stopTimer();
    
    this.state.isConnected = false;
    this.state.isPolling = false;
    this.state.gameId = null;
    
    this.notifyCallbacks('connection', { type: 'disconnected' });
  }

  /**
   * Subscribe to specific update types
   */
  subscribe(updateType: string, callback: UpdateCallback): void {
    if (!this.updateCallbacks.has(updateType)) {
      this.updateCallbacks.set(updateType, []);
    }
    
    const callbacks = this.updateCallbacks.get(updateType)!;
    callbacks.push(callback);
    
    console.log(`📡 Subscribed to ${updateType} updates`);
  }

  /**
   * Unsubscribe from update types
   */
  unsubscribe(updateType: string, callback?: UpdateCallback): void {
    const callbacks = this.updateCallbacks.get(updateType);
    if (!callbacks) return;

    if (callback) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      // Remove all callbacks for this type
      this.updateCallbacks.delete(updateType);
    }
    
    console.log(`📡 Unsubscribed from ${updateType} updates`);
  }

  /**
   * Start polling for Reddit comment updates
   */
  private async startPolling(): Promise<void> {
    if (this.state.isPolling || !this.state.gameId) {
      return;
    }

    this.state.isPolling = true;
    console.log('🔄 Starting Reddit comment polling');

    const poll = async () => {
      if (!this.state.isPolling || !this.state.gameId) {
        return;
      }

      try {
        // Fetch updates from server
        const updates = await this.fetchUpdates(this.state.gameId, this.state.lastUpdateTime);
        
        if (updates && updates.length > 0) {
          console.log(`📨 Received ${updates.length} updates`);
          
          // Process each update
          for (const update of updates) {
            this.processUpdate(update);
          }
          
          // Update last update time
          const latestUpdate = updates[updates.length - 1];
          if (latestUpdate) {
            this.state.lastUpdateTime = new Date(latestUpdate.timestamp);
          }
        }

        // Reset error count on success
        this.state.errorCount = 0;
        
        // Schedule next poll
        this.scheduleNextPoll();

      } catch (error) {
        console.error('❌ Polling error:', error);
        this.handlePollingError();
      }
    };

    // Start immediate poll
    await poll();
  }

  /**
   * Stop polling for updates
   */
  private stopPolling(): void {
    this.state.isPolling = false;
    
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    console.log('⏹️ Stopped Reddit comment polling');
  }

  /**
   * Schedule the next polling cycle
   */
  private scheduleNextPoll(): void {
    if (!this.state.isPolling) {
      return;
    }

    this.pollingInterval = window.setTimeout(async () => {
      await this.startPolling();
    }, this.config.pollInterval);
  }

  /**
   * Handle polling errors with exponential backoff
   */
  private handlePollingError(): void {
    this.state.errorCount++;
    
    if (this.state.errorCount >= this.config.maxRetries) {
      console.error('❌ Max polling retries exceeded, stopping polling');
      this.stopPolling();
      this.notifyCallbacks('error', { 
        type: 'max_retries_exceeded',
        message: 'Lost connection to game updates'
      });
      return;
    }

    // Exponential backoff
    const backoffDelay = this.config.pollInterval * 
      Math.pow(this.config.backoffMultiplier, this.state.errorCount);
    
    console.log(`⏳ Retrying in ${backoffDelay}ms (attempt ${this.state.errorCount})`);
    
    setTimeout(() => {
      this.scheduleNextPoll();
    }, backoffDelay);
  }

  /**
   * Fetch updates from the server API
   */
  private async fetchUpdates(gameId: string, since: Date): Promise<GameUpdate[]> {
    const response = await fetch(`${this.apiBaseUrl}/games/${gameId}/updates?since=${since.toISOString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.updates || [];
  }

  /**
   * Process a received update
   */
  private processUpdate(update: GameUpdate): void {
    console.log(`📨 Processing ${update.type} update:`, update);

    // Handle timer-related updates
    if (update.type === 'timer' || update.type === 'round_start') {
      this.handleTimerUpdate(update);
    }

    // Handle round updates
    if (update.type === 'round_start' || update.type === 'round_end') {
      this.handleRoundUpdate(update);
    }

    // Notify subscribers
    this.notifyCallbacks(update.type, update);
    this.notifyCallbacks('all', update); // Notify general subscribers
  }

  /**
   * Handle timer-related updates
   */
  private handleTimerUpdate(update: GameUpdate): void {
    if (update.type === 'round_start' && update.data.timeRemaining) {
      this.timerState.currentRoundDuration = update.data.timeRemaining;
      this.timerState.roundStartTime = new Date(update.timestamp);
      this.startTimer();
    }
    
    if (update.type === 'timer' && update.data.timeRemaining) {
      // Update timer state based on server data
      const serverTime = new Date(update.timestamp);
      const clientTime = new Date();
      this.timerState.serverTimeOffset = serverTime.getTime() - clientTime.getTime();
    }
  }

  /**
   * Handle round-related updates
   */
  private handleRoundUpdate(update: GameUpdate): void {
    if (update.type === 'round_start') {
      console.log(`🎯 Round ${update.data.roundNumber} started`);
      this.timerState.roundStartTime = new Date(update.timestamp);
      this.startTimer();
    }
    
    if (update.type === 'round_end') {
      console.log(`🏁 Round ${update.data.roundNumber} ended`);
      this.stopTimer();
    }
  }

  /**
   * Synchronize client timer with server timestamps
   */
  private async synchronizeTimer(gameId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/games/${gameId}/timer-sync`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return false;
      }

      const syncData: TimerSyncData = await response.json();
      
      // Calculate server time offset
      const clientTime = new Date();
      const serverTime = new Date(syncData.serverTime);
      this.timerState.serverTimeOffset = serverTime.getTime() - clientTime.getTime();
      
      // Set game and round start times
      this.timerState.gameStartTime = new Date(syncData.gameStartTime);
      if (syncData.roundStartTime) {
        this.timerState.roundStartTime = new Date(syncData.roundStartTime);
      }

      console.log('⏰ Timer synchronized with server');
      return true;
    } catch (error) {
      console.error('❌ Failed to synchronize timer:', error);
      return false;
    }
  }

  /**
   * Start the client-side timer
   */
  private startTimer(): void {
    if (this.timerState.isRunning) {
      this.stopTimer();
    }

    this.timerState.isRunning = true;
    console.log('⏰ Starting client-side timer');

    this.timerInterval = window.setInterval(() => {
      if (!this.timerState.isRunning || !this.timerState.roundStartTime) {
        return;
      }

      // Calculate time remaining based on server-synchronized time
      const now = new Date();
      const serverNow = new Date(now.getTime() + this.timerState.serverTimeOffset);
      const elapsed = (serverNow.getTime() - this.timerState.roundStartTime.getTime()) / 1000;
      const remaining = Math.max(0, this.timerState.currentRoundDuration - elapsed);

      // Notify timer subscribers
      this.notifyCallbacks('timer', {
        type: 'timer',
        timestamp: serverNow,
        data: {
          timeRemaining: remaining,
          elapsed: elapsed,
          duration: this.timerState.currentRoundDuration
        }
      });

      // Stop timer when time runs out
      if (remaining <= 0) {
        this.stopTimer();
        this.notifyCallbacks('timer_expired', {
          type: 'timer',
          timestamp: serverNow,
          data: { timeRemaining: 0 }
        });
      }
    }, 1000); // Update every second
  }

  /**
   * Stop the client-side timer
   */
  private stopTimer(): void {
    this.timerState.isRunning = false;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    console.log('⏹️ Stopped client-side timer');
  }

  /**
   * Notify all callbacks for a specific update type
   */
  private notifyCallbacks(updateType: string, data: any): void {
    const callbacks = this.updateCallbacks.get(updateType);
    if (!callbacks) return;

    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ Error in ${updateType} callback:`, error);
      }
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Get current timer state
   */
  getTimerState(): TimerState {
    return { ...this.timerState };
  }

  /**
   * Get time remaining in current round (if timer is running)
   */
  getTimeRemaining(): number {
    if (!this.timerState.isRunning || !this.timerState.roundStartTime) {
      return 0;
    }

    const now = new Date();
    const serverNow = new Date(now.getTime() + this.timerState.serverTimeOffset);
    const elapsed = (serverNow.getTime() - this.timerState.roundStartTime.getTime()) / 1000;
    return Math.max(0, this.timerState.currentRoundDuration - elapsed);
  }

  /**
   * Check if currently connected and polling
   */
  isConnected(): boolean {
    return this.state.isConnected && this.state.isPolling;
  }

  /**
   * Force a manual update check
   */
  async forceUpdate(): Promise<void> {
    if (!this.state.gameId) {
      console.warn('⚠️ Cannot force update: not connected to a game');
      return;
    }

    try {
      console.log('🔄 Forcing manual update check');
      const updates = await this.fetchUpdates(this.state.gameId, this.state.lastUpdateTime);
      
      if (updates && updates.length > 0) {
        for (const update of updates) {
          this.processUpdate(update);
        }
        
        const latestUpdate = updates[updates.length - 1];
        if (latestUpdate) {
          this.state.lastUpdateTime = new Date(latestUpdate.timestamp);
        }
      }
    } catch (error) {
      console.error('❌ Failed to force update:', error);
    }
  }
}

// Export singleton instance
export const redditRealTimeClient = new RedditRealTimeClient();
export default redditRealTimeClient;