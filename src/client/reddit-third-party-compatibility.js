/**
 * Reddit Third-Party Client Compatibility
 * Ensures core functionality works through standard Reddit APIs
 * Requirements: 10.3, 10.4, 10.5
 */

class RedditThirdPartyCompatibility {
  constructor() {
    this.clientInfo = this.detectThirdPartyClient();
    this.apiCapabilities = this.detectAPICapabilities();
    this.fallbackStrategies = new Map();
    this.compatibilityMode = 'standard';
    
    this.init();
  }

  /**
   * Detect third-party Reddit client environment
   */
  detectThirdPartyClient() {
    const userAgent = navigator.userAgent;
    const referrer = document.referrer;
    const parentOrigin = window.location !== window.parent.location;
    
    // Known third-party Reddit clients
    const clients = {
      apolloApp: userAgent.includes('Apollo'),
      baconReader: userAgent.includes('BaconReader'),
      redditIsFun: userAgent.includes('RedditIsFun') || userAgent.includes('RIF'),
      relay: userAgent.includes('Relay'),
      sync: userAgent.includes('Sync'),
      boost: userAgent.includes('Boost'),
      joey: userAgent.includes('Joey'),
      infinity: userAgent.includes('Infinity'),
      slide: userAgent.includes('Slide'),
      dawn: userAgent.includes('Dawn'),
      narwhal: userAgent.includes('Narwhal'),
      antenna: userAgent.includes('Antenna'),
      readder: userAgent.includes('Readder')
    };
    
    const detectedClient = Object.keys(clients).find(client => clients[client]);
    
    return {
      isThirdParty: !!detectedClient || this.isGenericThirdParty(),
      clientName: detectedClient || 'unknown',
      userAgent: userAgent,
      referrer: referrer,
      isEmbedded: parentOrigin,
      supportsDevvit: this.checkDevvitSupport(),
      apiVersion: this.detectAPIVersion(),
      capabilities: this.getClientCapabilities(detectedClient)
    };
  }

  /**
   * Check if this is a generic third-party client
   */
  isGenericThirdParty() {
    const userAgent = navigator.userAgent;
    const referrer = document.referrer;
    
    // Check for non-official Reddit indicators
    const isNotOfficialReddit = !userAgent.includes('Reddit') && 
                               !referrer.includes('reddit.com') &&
                               !referrer.includes('redd.it');
    
    // Check for common third-party client patterns
    const hasThirdPartyPatterns = userAgent.includes('WebView') ||
                                 userAgent.includes('wv') ||
                                 window.location.search.includes('client=') ||
                                 window.location.search.includes('app=');
    
    return isNotOfficialReddit && hasThirdPartyPatterns;
  }

  /**
   * Check Devvit support in third-party client
   */
  checkDevvitSupport() {
    // Check for Devvit-specific APIs and features
    return {
      hasDevvitAPI: typeof window.devvit !== 'undefined',
      hasRedditAPI: typeof window.reddit !== 'undefined',
      hasWebFramework: typeof window.webview !== 'undefined',
      supportsPostMessage: typeof window.postMessage === 'function',
      supportsLocalStorage: typeof localStorage !== 'undefined',
      supportsSessionStorage: typeof sessionStorage !== 'undefined'
    };
  }

  /**
   * Detect Reddit API version and capabilities
   */
  detectAPICapabilities() {
    return {
      // Core Reddit API features
      canCreatePosts: this.checkAPIEndpoint('submitPost'),
      canCreateComments: this.checkAPIEndpoint('submitComment'),
      canUploadMedia: this.checkAPIEndpoint('uploadMedia'),
      canGetUserInfo: this.checkAPIEndpoint('getCurrentUser'),
      canGetSubredditInfo: this.checkAPIEndpoint('getSubreddit'),
      
      // Advanced features
      canModerate: this.checkAPIEndpoint('moderate'),
      canVote: this.checkAPIEndpoint('vote'),
      canSave: this.checkAPIEndpoint('save'),
      canShare: this.checkAPIEndpoint('share'),
      canReport: this.checkAPIEndpoint('report'),
      
      // Real-time features
      canPoll: this.checkPollingCapability(),
      canWebSocket: typeof WebSocket !== 'undefined',
      canServerSentEvents: typeof EventSource !== 'undefined',
      
      // Storage capabilities
      canStoreData: typeof localStorage !== 'undefined',
      canStoreSession: typeof sessionStorage !== 'undefined',
      canStoreIndexedDB: typeof indexedDB !== 'undefined'
    };
  }

  /**
   * Get client-specific capabilities
   */
  getClientCapabilities(clientName) {
    const capabilities = {
      apolloApp: {
        supportsCustomUI: true,
        supportsGestures: true,
        supportsHaptics: true,
        supportsNotifications: true,
        apiLimitations: ['uploadMedia']
      },
      baconReader: {
        supportsCustomUI: false,
        supportsGestures: false,
        supportsHaptics: false,
        supportsNotifications: false,
        apiLimitations: ['uploadMedia', 'moderate']
      },
      redditIsFun: {
        supportsCustomUI: false,
        supportsGestures: true,
        supportsHaptics: false,
        supportsNotifications: true,
        apiLimitations: ['uploadMedia']
      },
      relay: {
        supportsCustomUI: true,
        supportsGestures: true,
        supportsHaptics: true,
        supportsNotifications: true,
        apiLimitations: []
      },
      sync: {
        supportsCustomUI: true,
        supportsGestures: true,
        supportsHaptics: false,
        supportsNotifications: true,
        apiLimitations: ['moderate']
      }
    };
    
    return capabilities[clientName] || {
      supportsCustomUI: false,
      supportsGestures: false,
      supportsHaptics: false,
      supportsNotifications: false,
      apiLimitations: ['uploadMedia', 'moderate']
    };
  }

  /**
   * Initialize third-party compatibility
   */
  init() {
    console.log('Reddit Third-Party Compatibility initialized', {
      client: this.clientInfo,
      capabilities: this.apiCapabilities
    });

    // Determine compatibility mode
    this.determineCompatibilityMode();
    
    // Setup fallback strategies
    this.setupFallbackStrategies();
    
    // Apply compatibility optimizations
    this.applyCompatibilityOptimizations();
    
    // Setup graceful degradation
    this.setupGracefulDegradation();
    
    // Monitor API availability
    this.monitorAPIAvailability();
  }

  /**
   * Determine the appropriate compatibility mode
   */
  determineCompatibilityMode() {
    if (this.clientInfo.supportsDevvit.hasDevvitAPI) {
      this.compatibilityMode = 'full';
    } else if (this.clientInfo.supportsDevvit.hasRedditAPI) {
      this.compatibilityMode = 'reddit-api';
    } else if (this.clientInfo.supportsDevvit.supportsPostMessage) {
      this.compatibilityMode = 'postmessage';
    } else {
      this.compatibilityMode = 'fallback';
    }
    
    document.documentElement.setAttribute('data-compatibility-mode', this.compatibilityMode);
    console.log('Compatibility mode:', this.compatibilityMode);
  }

  /**
   * Setup fallback strategies for missing APIs
   */
  setupFallbackStrategies() {
    // Fallback for post creation
    this.fallbackStrategies.set('createPost', () => {
      return this.fallbackCreatePost();
    });
    
    // Fallback for comment creation
    this.fallbackStrategies.set('createComment', () => {
      return this.fallbackCreateComment();
    });
    
    // Fallback for media upload
    this.fallbackStrategies.set('uploadMedia', () => {
      return this.fallbackUploadMedia();
    });
    
    // Fallback for real-time updates
    this.fallbackStrategies.set('realTimeUpdates', () => {
      return this.fallbackRealTimeUpdates();
    });
    
    // Fallback for user authentication
    this.fallbackStrategies.set('authentication', () => {
      return this.fallbackAuthentication();
    });
  }

  /**
   * Apply compatibility optimizations
   */
  applyCompatibilityOptimizations() {
    // Add compatibility CSS classes
    document.documentElement.classList.add('reddit-third-party');
    
    if (this.clientInfo.isThirdParty) {
      document.documentElement.classList.add(`reddit-client-${this.clientInfo.clientName}`);
    }
    
    // Optimize UI for third-party constraints
    this.optimizeUIForThirdParty();
    
    // Setup API polyfills
    this.setupAPIPolyfills();
    
    // Configure performance optimizations
    this.configurePerformanceOptimizations();
  }

  /**
   * Optimize UI for third-party client constraints
   */
  optimizeUIForThirdParty() {
    const capabilities = this.clientInfo.capabilities;
    
    // Disable features not supported by client
    if (!capabilities.supportsCustomUI) {
      document.documentElement.classList.add('no-custom-ui');
    }
    
    if (!capabilities.supportsGestures) {
      document.documentElement.classList.add('no-gestures');
    }
    
    if (!capabilities.supportsHaptics) {
      document.documentElement.classList.add('no-haptics');
    }
    
    // Simplify UI for limited clients
    if (capabilities.apiLimitations.length > 2) {
      document.documentElement.classList.add('limited-client');
    }
  }

  /**
   * Setup API polyfills for missing functionality
   */
  setupAPIPolyfills() {
    // Polyfill Reddit API if not available
    if (!this.clientInfo.supportsDevvit.hasRedditAPI) {
      this.createRedditAPIPolyfill();
    }
    
    // Polyfill Devvit API if not available
    if (!this.clientInfo.supportsDevvit.hasDevvitAPI) {
      this.createDevvitAPIPolyfill();
    }
    
    // Polyfill missing storage APIs
    this.polyfillStorageAPIs();
  }

  /**
   * Create Reddit API polyfill
   */
  createRedditAPIPolyfill() {
    window.reddit = {
      submitPost: (options) => this.fallbackStrategies.get('createPost')(options),
      submitComment: (options) => this.fallbackStrategies.get('createComment')(options),
      uploadMedia: (file) => this.fallbackStrategies.get('uploadMedia')(file),
      getCurrentUsername: () => this.fallbackStrategies.get('authentication')(),
      
      // Mock implementations for compatibility
      getSubreddit: () => Promise.resolve({ name: 'unknown' }),
      vote: () => Promise.resolve({ success: false }),
      save: () => Promise.resolve({ success: false }),
      report: () => Promise.resolve({ success: false })
    };
    
    console.log('Reddit API polyfill created');
  }

  /**
   * Create Devvit API polyfill
   */
  createDevvitAPIPolyfill() {
    window.devvit = {
      context: {
        postId: this.extractPostIdFromURL(),
        subreddit: this.extractSubredditFromURL(),
        userId: null
      },
      
      // Mock KV store
      kvStore: {
        get: (key) => Promise.resolve(localStorage.getItem(`devvit_${key}`)),
        set: (key, value) => {
          localStorage.setItem(`devvit_${key}`, JSON.stringify(value));
          return Promise.resolve();
        },
        delete: (key) => {
          localStorage.removeItem(`devvit_${key}`);
          return Promise.resolve();
        }
      }
    };
    
    console.log('Devvit API polyfill created');
  }

  /**
   * Polyfill missing storage APIs
   */
  polyfillStorageAPIs() {
    // Polyfill localStorage if not available
    if (!this.apiCapabilities.canStoreData) {
      this.createMemoryStorage('localStorage');
    }
    
    // Polyfill sessionStorage if not available
    if (!this.apiCapabilities.canStoreSession) {
      this.createMemoryStorage('sessionStorage');
    }
  }

  /**
   * Create memory-based storage polyfill
   */
  createMemoryStorage(storageType) {
    const storage = {};
    
    window[storageType] = {
      getItem: (key) => storage[key] || null,
      setItem: (key, value) => { storage[key] = String(value); },
      removeItem: (key) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach(key => delete storage[key]); },
      get length() { return Object.keys(storage).length; },
      key: (index) => Object.keys(storage)[index] || null
    };
    
    console.log(`${storageType} polyfill created`);
  }

  /**
   * Configure performance optimizations for third-party clients
   */
  configurePerformanceOptimizations() {
    // Reduce animation complexity
    if (this.clientInfo.clientName === 'baconReader' || 
        this.clientInfo.clientName === 'redditIsFun') {
      document.documentElement.classList.add('reduced-animations');
    }
    
    // Optimize polling frequency
    this.optimizePollingFrequency();
    
    // Reduce memory usage
    this.optimizeMemoryUsage();
  }

  /**
   * Optimize polling frequency based on client capabilities
   */
  optimizePollingFrequency() {
    const baseInterval = 5000; // 5 seconds
    let multiplier = 1;
    
    // Adjust based on client limitations
    if (this.clientInfo.capabilities.apiLimitations.length > 2) {
      multiplier = 2; // Slower polling for limited clients
    }
    
    if (this.compatibilityMode === 'fallback') {
      multiplier = 3; // Much slower for fallback mode
    }
    
    window.REDDIT_POLL_INTERVAL = baseInterval * multiplier;
  }

  /**
   * Setup graceful degradation for unsupported features
   */
  setupGracefulDegradation() {
    // Hide features not supported by client
    this.hideUnsupportedFeatures();
    
    // Setup alternative workflows
    this.setupAlternativeWorkflows();
    
    // Provide user feedback for limitations
    this.setupLimitationFeedback();
  }

  /**
   * Hide features not supported by the client
   */
  hideUnsupportedFeatures() {
    const limitations = this.clientInfo.capabilities.apiLimitations;
    
    limitations.forEach(limitation => {
      switch (limitation) {
        case 'uploadMedia':
          document.querySelectorAll('.media-upload, .image-upload').forEach(el => {
            el.style.display = 'none';
          });
          break;
        case 'moderate':
          document.querySelectorAll('.moderator-only').forEach(el => {
            el.style.display = 'none';
          });
          break;
        case 'vote':
          document.querySelectorAll('.vote-buttons').forEach(el => {
            el.style.display = 'none';
          });
          break;
      }
    });
  }

  /**
   * Setup alternative workflows for limited clients
   */
  setupAlternativeWorkflows() {
    // Alternative for media upload
    if (this.clientInfo.capabilities.apiLimitations.includes('uploadMedia')) {
      this.setupAlternativeMediaUpload();
    }
    
    // Alternative for real-time updates
    if (!this.apiCapabilities.canPoll) {
      this.setupAlternativeUpdates();
    }
  }

  /**
   * Setup alternative media upload workflow
   */
  setupAlternativeMediaUpload() {
    // Replace upload buttons with instructions
    document.querySelectorAll('.media-upload').forEach(uploadEl => {
      const alternative = document.createElement('div');
      alternative.className = 'alternative-upload';
      alternative.innerHTML = `
        <p>Media upload not supported in this client.</p>
        <p>Please use the official Reddit app or website to upload images.</p>
        <button class="reddit-btn reddit-btn-secondary" onclick="window.open('https://reddit.com', '_blank')">
          Open Reddit Website
        </button>
      `;
      uploadEl.parentNode.replaceChild(alternative, uploadEl);
    });
  }

  /**
   * Setup alternative update mechanism
   */
  setupAlternativeUpdates() {
    // Use manual refresh instead of automatic polling
    const refreshButton = document.createElement('button');
    refreshButton.className = 'reddit-btn reddit-btn-secondary refresh-btn';
    refreshButton.textContent = '🔄 Refresh';
    refreshButton.onclick = () => window.location.reload();
    
    const header = document.querySelector('.main-header .header-actions');
    if (header) {
      header.appendChild(refreshButton);
    }
  }

  /**
   * Setup user feedback for client limitations
   */
  setupLimitationFeedback() {
    if (this.clientInfo.isThirdParty && this.clientInfo.capabilities.apiLimitations.length > 0) {
      this.showCompatibilityNotice();
    }
  }

  /**
   * Show compatibility notice to users
   */
  showCompatibilityNotice() {
    const notice = document.createElement('div');
    notice.className = 'compatibility-notice';
    notice.innerHTML = `
      <div class="notice-content">
        <h4>Third-Party Client Detected</h4>
        <p>Some features may be limited in ${this.clientInfo.clientName || 'this client'}. 
           For the full experience, consider using the official Reddit app.</p>
        <button class="notice-dismiss" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(notice);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (notice.parentNode) {
        notice.remove();
      }
    }, 10000);
  }

  /**
   * Monitor API availability and adapt accordingly
   */
  monitorAPIAvailability() {
    // Periodically check API availability
    setInterval(() => {
      this.checkAPIHealth();
    }, 30000); // Check every 30 seconds
    
    // Listen for API errors
    this.setupAPIErrorHandling();
  }

  /**
   * Check API health and availability
   */
  async checkAPIHealth() {
    const healthChecks = {
      reddit: this.checkRedditAPIHealth(),
      devvit: this.checkDevvitAPIHealth(),
      storage: this.checkStorageHealth()
    };
    
    const results = await Promise.allSettled(Object.values(healthChecks));
    
    results.forEach((result, index) => {
      const apiName = Object.keys(healthChecks)[index];
      if (result.status === 'rejected') {
        console.warn(`${apiName} API health check failed:`, result.reason);
        this.handleAPIFailure(apiName);
      }
    });
  }

  /**
   * Setup API error handling
   */
  setupAPIErrorHandling() {
    // Override fetch to catch API errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.handleAPIError(response);
        }
        return response;
      } catch (error) {
        this.handleNetworkError(error);
        throw error;
      }
    };
  }

  /**
   * Handle API failures
   */
  handleAPIFailure(apiName) {
    console.log(`Switching to fallback mode for ${apiName}`);
    
    // Switch to more conservative compatibility mode
    if (this.compatibilityMode !== 'fallback') {
      this.compatibilityMode = 'fallback';
      document.documentElement.setAttribute('data-compatibility-mode', 'fallback');
      this.showAPIFailureNotice(apiName);
    }
  }

  /**
   * Show API failure notice
   */
  showAPIFailureNotice(apiName) {
    const notice = document.createElement('div');
    notice.className = 'api-failure-notice';
    notice.innerHTML = `
      <div class="notice-content">
        <h4>Limited Functionality</h4>
        <p>Some features are temporarily unavailable. The app is running in compatibility mode.</p>
      </div>
    `;
    
    document.body.appendChild(notice);
    
    setTimeout(() => notice.remove(), 5000);
  }

  // Fallback implementations
  
  /**
   * Fallback post creation
   */
  async fallbackCreatePost(options) {
    // Use postMessage to communicate with parent frame
    if (this.clientInfo.supportsDevvit.supportsPostMessage && window.parent !== window) {
      return new Promise((resolve) => {
        const messageId = Date.now();
        
        const handleResponse = (event) => {
          if (event.data.id === messageId) {
            window.removeEventListener('message', handleResponse);
            resolve(event.data.result);
          }
        };
        
        window.addEventListener('message', handleResponse);
        
        window.parent.postMessage({
          type: 'reddit_create_post',
          id: messageId,
          options: options
        }, '*');
        
        // Timeout after 10 seconds
        setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          resolve({ success: false, error: 'Timeout' });
        }, 10000);
      });
    }
    
    // Fallback to opening Reddit website
    const url = `https://reddit.com/r/${options.subreddit}/submit?title=${encodeURIComponent(options.title)}`;
    window.open(url, '_blank');
    return { success: false, error: 'Redirected to Reddit website' };
  }

  /**
   * Fallback comment creation
   */
  async fallbackCreateComment(options) {
    // Similar to post creation fallback
    if (this.clientInfo.supportsDevvit.supportsPostMessage && window.parent !== window) {
      return this.sendPostMessage('reddit_create_comment', options);
    }
    
    // Fallback to opening Reddit website
    const url = `https://reddit.com/r/${options.subreddit}/comments/${options.postId}`;
    window.open(url, '_blank');
    return { success: false, error: 'Redirected to Reddit website' };
  }

  /**
   * Fallback media upload
   */
  async fallbackUploadMedia(file) {
    // Media upload is not possible in most third-party clients
    return { success: false, error: 'Media upload not supported in third-party clients' };
  }

  /**
   * Fallback real-time updates
   */
  fallbackRealTimeUpdates() {
    // Use manual refresh mechanism
    return {
      subscribe: () => {},
      unsubscribe: () => {},
      refresh: () => window.location.reload()
    };
  }

  /**
   * Fallback authentication
   */
  async fallbackAuthentication() {
    // Try to get username from URL or storage
    const username = this.extractUsernameFromContext();
    return username || 'anonymous';
  }

  // Utility methods
  
  checkAPIEndpoint(endpoint) {
    try {
      return typeof window.reddit?.[endpoint] === 'function';
    } catch (error) {
      return false;
    }
  }

  checkPollingCapability() {
    return typeof setInterval === 'function' && 
           typeof clearInterval === 'function';
  }

  detectAPIVersion() {
    if (window.reddit?.version) {
      return window.reddit.version;
    }
    return 'unknown';
  }

  extractPostIdFromURL() {
    const match = window.location.pathname.match(/\/comments\/([a-z0-9]+)/);
    return match ? match[1] : null;
  }

  extractSubredditFromURL() {
    const match = window.location.pathname.match(/\/r\/([a-zA-Z0-9_]+)/);
    return match ? match[1] : null;
  }

  extractUsernameFromContext() {
    // Try various methods to get username
    const sources = [
      () => localStorage.getItem('reddit_username'),
      () => sessionStorage.getItem('reddit_username'),
      () => document.querySelector('[data-username]')?.dataset.username,
      () => window.location.search.match(/user=([^&]+)/)?.[1]
    ];
    
    for (const source of sources) {
      try {
        const username = source();
        if (username) return username;
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }

  async sendPostMessage(type, data) {
    return new Promise((resolve) => {
      const messageId = Date.now();
      
      const handleResponse = (event) => {
        if (event.data.id === messageId) {
          window.removeEventListener('message', handleResponse);
          resolve(event.data.result);
        }
      };
      
      window.addEventListener('message', handleResponse);
      
      window.parent.postMessage({
        type: type,
        id: messageId,
        data: data
      }, '*');
      
      setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        resolve({ success: false, error: 'Timeout' });
      }, 10000);
    });
  }

  async checkRedditAPIHealth() {
    if (window.reddit?.getCurrentUsername) {
      return await window.reddit.getCurrentUsername();
    }
    throw new Error('Reddit API not available');
  }

  async checkDevvitAPIHealth() {
    if (window.devvit?.context) {
      return window.devvit.context;
    }
    throw new Error('Devvit API not available');
  }

  async checkStorageHealth() {
    try {
      localStorage.setItem('health_check', 'test');
      localStorage.removeItem('health_check');
      return true;
    } catch (error) {
      throw new Error('Storage not available');
    }
  }

  handleAPIError(response) {
    console.warn('API Error:', response.status, response.statusText);
  }

  handleNetworkError(error) {
    console.warn('Network Error:', error.message);
  }

  optimizeMemoryUsage() {
    // Implement memory optimization strategies for third-party clients
    if (this.compatibilityMode === 'fallback') {
      // More aggressive memory management
      setInterval(() => {
        this.cleanupMemory();
      }, 60000); // Every minute
    }
  }

  cleanupMemory() {
    // Remove unused DOM elements
    document.querySelectorAll('.cleanup-candidate').forEach(el => {
      if (!el.isConnected) {
        el.remove();
      }
    });
    
    // Clear old cache entries
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_') && 
          Date.now() - parseInt(localStorage.getItem(key + '_timestamp')) > 300000) {
        localStorage.removeItem(key);
        localStorage.removeItem(key + '_timestamp');
      }
    });
  }
}

// Initialize Reddit Third-Party Compatibility
document.addEventListener('DOMContentLoaded', () => {
  window.RedditThirdPartyCompatibility = new RedditThirdPartyCompatibility();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RedditThirdPartyCompatibility;
}