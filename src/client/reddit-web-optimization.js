/**
 * Reddit Web Interface Optimization
 * Optimizes PicTact for Reddit web browser interface
 * Requirements: 10.1, 10.4
 */

class RedditWebOptimizer {
  constructor() {
    this.isRedditWeb = this.detectRedditWebEnvironment();
    this.webFeatures = this.detectWebFeatures();
    this.performanceObserver = null;
    
    this.init();
  }

  /**
   * Detect if running in Reddit web browser interface
   */
  detectRedditWebEnvironment() {
    // Check for Reddit web-specific indicators
    const userAgent = navigator.userAgent;
    const referrer = document.referrer;
    const parentOrigin = window.location !== window.parent.location;
    
    return {
      isRedditFrame: parentOrigin && (referrer.includes('reddit.com') || referrer.includes('redd.it')),
      isRedditUserAgent: userAgent.includes('Reddit'),
      isWebBrowser: !userAgent.includes('Mobile') && !userAgent.includes('Android') && !userAgent.includes('iPhone'),
      hasRedditContext: window.parent !== window && window.location.search.includes('reddit'),
      browserType: this.getBrowserType(userAgent)
    };
  }

  /**
   * Detect available web browser features
   */
  detectWebFeatures() {
    return {
      // Modern web APIs
      hasIntersectionObserver: 'IntersectionObserver' in window,
      hasResizeObserver: 'ResizeObserver' in window,
      hasWebGL: this.checkWebGLSupport(),
      hasServiceWorker: 'serviceWorker' in navigator,
      
      // Performance APIs
      hasPerformanceObserver: 'PerformanceObserver' in window,
      hasNavigationTiming: 'performance' in window && 'navigation' in window.performance,
      
      // Input capabilities
      hasPointerEvents: 'PointerEvent' in window,
      hasTouchEvents: 'ontouchstart' in window,
      hasKeyboardNavigation: true,
      
      // Display capabilities
      hasHighDPI: window.devicePixelRatio > 1,
      supportsWebP: this.checkWebPSupport(),
      supportsAVIF: this.checkAVIFSupport(),
      
      // Network capabilities
      hasConnectionAPI: 'connection' in navigator,
      estimatedBandwidth: this.getNetworkSpeed()
    };
  }

  /**
   * Initialize Reddit web optimizations
   */
  init() {
    if (!this.isRedditWeb.isRedditFrame && !this.isRedditWeb.hasRedditContext) {
      console.log('Not in Reddit web environment, applying standard web optimizations');
    }

    // Apply web-specific optimizations
    this.optimizeForWebBrowser();
    this.setupWebAccessibility();
    this.setupWebPerformanceMonitoring();
    this.setupWebKeyboardNavigation();
    this.setupWebScrollOptimization();
    
    // Reddit-specific web optimizations
    if (this.isRedditWeb.isRedditFrame) {
      this.optimizeForRedditFrame();
    }
    
    console.log('Reddit web optimization initialized', {
      environment: this.isRedditWeb,
      features: this.webFeatures
    });
  }

  /**
   * Optimize application for web browser interface
   */
  optimizeForWebBrowser() {
    // Optimize viewport for desktop browsers
    this.optimizeViewport();
    
    // Enable web-specific interactions
    this.enableWebInteractions();
    
    // Optimize image loading for web
    this.optimizeImageLoading();
    
    // Setup web-specific caching
    this.setupWebCaching();
    
    // Optimize fonts for web rendering
    this.optimizeFontLoading();
  }

  /**
   * Optimize viewport for desktop web browsers
   */
  optimizeViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && this.isRedditWeb.isWebBrowser) {
      // Adjust viewport for desktop web browsers
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes'
      );
    }

    // Add web-specific CSS classes
    document.documentElement.classList.add('reddit-web-browser');
    
    if (this.isRedditWeb.isRedditFrame) {
      document.documentElement.classList.add('reddit-web-frame');
    }
    
    // Optimize for high DPI displays
    if (this.webFeatures.hasHighDPI) {
      document.documentElement.classList.add('high-dpi');
    }
  }

  /**
   * Enable web-specific interactions
   */
  enableWebInteractions() {
    // Enable hover effects for non-touch devices
    if (!this.webFeatures.hasTouchEvents) {
      document.documentElement.classList.add('has-hover');
    }
    
    // Enable right-click context menus where appropriate
    this.setupContextMenus();
    
    // Enable drag and drop for file uploads
    this.setupDragAndDrop();
    
    // Enable keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  /**
   * Setup context menus for web browsers
   */
  setupContextMenus() {
    // Allow context menus on images for saving/copying
    document.addEventListener('contextmenu', (e) => {
      const target = e.target;
      
      // Allow context menu on images
      if (target.tagName === 'IMG' && target.classList.contains('allow-context-menu')) {
        return; // Allow default context menu
      }
      
      // Allow context menu on text inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return; // Allow default context menu
      }
      
      // Prevent context menu on other elements to maintain app experience
      e.preventDefault();
    });
  }

  /**
   * Setup drag and drop for file uploads
   */
  setupDragAndDrop() {
    const dropZones = document.querySelectorAll('.upload-area, .file-drop-zone');
    
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
      
      zone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
      });
      
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
          this.handleFileUpload(imageFiles[0], zone);
        }
      });
    });
  }

  /**
   * Setup keyboard shortcuts for web browsers
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter to submit forms
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'TEXTAREA') {
          const form = activeElement.closest('form');
          const submitBtn = form?.querySelector('button[type="submit"], .submit-btn');
          if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
            e.preventDefault();
          }
        }
      }
      
      // Escape to close modals/overlays
      if (e.key === 'Escape') {
        const modal = document.querySelector('.modal.active, .overlay.active');
        if (modal) {
          modal.classList.remove('active');
          e.preventDefault();
        }
      }
      
      // Tab navigation enhancement
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });
    
    // Remove keyboard navigation class on mouse use
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
  }

  /**
   * Optimize image loading for web browsers
   */
  optimizeImageLoading() {
    // Use Intersection Observer for lazy loading
    if (this.webFeatures.hasIntersectionObserver) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px'
      });
      
      // Observe all lazy-load images
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
    
    // Optimize image formats based on browser support
    this.optimizeImageFormats();
  }

  /**
   * Optimize image formats for web browsers
   */
  optimizeImageFormats() {
    const images = document.querySelectorAll('img[data-optimize]');
    
    images.forEach(img => {
      const baseSrc = img.dataset.optimize;
      
      // Use AVIF if supported
      if (this.webFeatures.supportsAVIF) {
        img.src = baseSrc.replace(/\.(jpg|jpeg|png)$/i, '.avif');
      }
      // Use WebP if supported
      else if (this.webFeatures.supportsWebP) {
        img.src = baseSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      }
      // Fallback to original format
      else {
        img.src = baseSrc;
      }
    });
  }

  /**
   * Setup web-specific caching strategies
   */
  setupWebCaching() {
    // Cache static assets in browser
    if (this.webFeatures.hasServiceWorker) {
      this.registerServiceWorker();
    }
    
    // Use localStorage for app state
    this.setupLocalStorageCache();
    
    // Use sessionStorage for temporary data
    this.setupSessionStorageCache();
  }

  /**
   * Register service worker for caching
   */
  async registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      }
    } catch (error) {
      console.log('Service Worker registration failed:', error);
    }
  }

  /**
   * Setup localStorage caching for persistent data
   */
  setupLocalStorageCache() {
    window.RedditWebCache = {
      set: (key, value, ttl = 3600000) => { // 1 hour default TTL
        const item = {
          value: value,
          timestamp: Date.now(),
          ttl: ttl
        };
        localStorage.setItem(`pictact_${key}`, JSON.stringify(item));
      },
      
      get: (key) => {
        const item = localStorage.getItem(`pictact_${key}`);
        if (!item) return null;
        
        const parsed = JSON.parse(item);
        if (Date.now() - parsed.timestamp > parsed.ttl) {
          localStorage.removeItem(`pictact_${key}`);
          return null;
        }
        
        return parsed.value;
      },
      
      remove: (key) => {
        localStorage.removeItem(`pictact_${key}`);
      }
    };
  }

  /**
   * Setup sessionStorage for temporary data
   */
  setupSessionStorageCache() {
    window.RedditWebSession = {
      set: (key, value) => {
        sessionStorage.setItem(`pictact_${key}`, JSON.stringify(value));
      },
      
      get: (key) => {
        const item = sessionStorage.getItem(`pictact_${key}`);
        return item ? JSON.parse(item) : null;
      },
      
      remove: (key) => {
        sessionStorage.removeItem(`pictact_${key}`);
      }
    };
  }

  /**
   * Optimize font loading for web browsers
   */
  optimizeFontLoading() {
    // Use font-display: swap for better performance
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'IBM Plex Sans';
        font-display: swap;
      }
      @font-face {
        font-family: 'IBM Plex Mono';
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
    
    // Preload critical fonts
    this.preloadFonts();
  }

  /**
   * Preload critical fonts
   */
  preloadFonts() {
    const fonts = [
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap'
    ];
    
    fonts.forEach(fontUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = fontUrl;
      document.head.appendChild(link);
    });
  }

  /**
   * Setup web accessibility features
   */
  setupWebAccessibility() {
    // Enhanced keyboard navigation
    this.setupEnhancedKeyboardNavigation();
    
    // Screen reader optimizations
    this.setupScreenReaderOptimizations();
    
    // High contrast mode support
    this.setupHighContrastSupport();
    
    // Focus management
    this.setupFocusManagement();
  }

  /**
   * Setup enhanced keyboard navigation for web
   */
  setupEnhancedKeyboardNavigation() {
    // Arrow key navigation for game cards
    document.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('game-card') || e.target.closest('.game-card')) {
        const cards = Array.from(document.querySelectorAll('.game-card'));
        const currentIndex = cards.indexOf(e.target.closest('.game-card'));
        
        let nextIndex = currentIndex;
        
        switch (e.key) {
          case 'ArrowDown':
          case 'ArrowRight':
            nextIndex = (currentIndex + 1) % cards.length;
            break;
          case 'ArrowUp':
          case 'ArrowLeft':
            nextIndex = (currentIndex - 1 + cards.length) % cards.length;
            break;
          default:
            return;
        }
        
        if (nextIndex !== currentIndex) {
          cards[nextIndex].focus();
          e.preventDefault();
        }
      }
    });
  }

  /**
   * Setup screen reader optimizations
   */
  setupScreenReaderOptimizations() {
    // Add live regions for dynamic content
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-announcements';
    document.body.appendChild(liveRegion);
    
    // Announce important updates
    window.announceToScreenReader = (message) => {
      liveRegion.textContent = message;
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    };
    
    // Add descriptive labels to interactive elements
    this.addAccessibilityLabels();
  }

  /**
   * Add accessibility labels to interactive elements
   */
  addAccessibilityLabels() {
    // Add labels to buttons without text
    document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(button => {
      const icon = button.querySelector('.icon, [class*="icon"]');
      if (icon && !button.textContent.trim()) {
        const action = button.className.includes('submit') ? 'Submit' :
                     button.className.includes('cancel') ? 'Cancel' :
                     button.className.includes('close') ? 'Close' :
                     'Button';
        button.setAttribute('aria-label', action);
      }
    });
    
    // Add labels to form inputs without labels
    document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
      const placeholder = input.getAttribute('placeholder');
      if (placeholder) {
        input.setAttribute('aria-label', placeholder);
      }
    });
  }

  /**
   * Setup high contrast mode support
   */
  setupHighContrastSupport() {
    // Detect high contrast mode
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    const applyHighContrast = (matches) => {
      if (matches) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
    };
    
    applyHighContrast(highContrastQuery.matches);
    highContrastQuery.addEventListener('change', (e) => applyHighContrast(e.matches));
  }

  /**
   * Setup focus management for web browsers
   */
  setupFocusManagement() {
    // Trap focus in modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.modal.active');
        if (modal) {
          const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements.length > 0) {
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      }
    });
  }

  /**
   * Setup web performance monitoring
   */
  setupWebPerformanceMonitoring() {
    if (this.webFeatures.hasPerformanceObserver) {
      this.setupPerformanceObserver();
    }
    
    this.setupNetworkMonitoring();
    this.setupMemoryMonitoring();
  }

  /**
   * Setup performance observer for web metrics
   */
  setupPerformanceObserver() {
    try {
      // Monitor Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Monitor First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          console.log('FID:', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      
      // Monitor Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            console.log('CLS:', entry.value);
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      
    } catch (error) {
      console.log('Performance Observer setup failed:', error);
    }
  }

  /**
   * Setup network monitoring
   */
  setupNetworkMonitoring() {
    if (this.webFeatures.hasConnectionAPI) {
      const connection = navigator.connection;
      
      const logNetworkInfo = () => {
        console.log('Network:', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      };
      
      connection.addEventListener('change', logNetworkInfo);
      logNetworkInfo();
    }
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        console.log('Memory:', {
          used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
          total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
        });
      }, 30000); // Log every 30 seconds
    }
  }

  /**
   * Setup keyboard navigation for web browsers
   */
  setupWebKeyboardNavigation() {
    // Enhanced keyboard navigation for web browsers
    document.addEventListener('keydown', (e) => {
      // Tab navigation improvements
      if (e.key === 'Tab') {
        this.handleTabNavigation(e);
      }
      
      // Arrow key navigation for game cards
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        this.handleArrowNavigation(e);
      }
      
      // Enter/Space activation
      if (e.key === 'Enter' || e.key === ' ') {
        this.handleActivation(e);
      }
      
      // Escape key handling
      if (e.key === 'Escape') {
        this.handleEscape(e);
      }
    });
  }

  /**
   * Handle tab navigation
   */
  handleTabNavigation(e) {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Handle arrow key navigation
   */
  handleArrowNavigation(e) {
    const gameCards = document.querySelectorAll('.game-card, .upcoming-item, .leaderboard-item');
    const currentIndex = Array.from(gameCards).indexOf(document.activeElement);
    
    if (currentIndex === -1) return;
    
    let nextIndex = currentIndex;
    
    switch (e.key) {
      case 'ArrowUp':
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(gameCards.length - 1, currentIndex + 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowRight':
        nextIndex = Math.min(gameCards.length - 1, currentIndex + 1);
        break;
    }
    
    if (nextIndex !== currentIndex) {
      e.preventDefault();
      gameCards[nextIndex].focus();
    }
  }

  /**
   * Handle activation (Enter/Space)
   */
  handleActivation(e) {
    const target = e.target;
    
    if (target.classList.contains('game-card') || target.classList.contains('btn')) {
      e.preventDefault();
      target.click();
    }
  }

  /**
   * Handle escape key
   */
  handleEscape(e) {
    // Close any open modals or dropdowns
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) {
      e.preventDefault();
      activeModal.classList.remove('active');
    }
    
    // Remove focus from current element
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  }

  /**
   * Setup scroll optimization for web browsers
   */
  setupWebScrollOptimization() {
    // Smooth scrolling for anchor links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link) {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          e.preventDefault();
        }
      }
    });
    
    // Optimize scroll performance
    this.optimizeScrollPerformance();
  }

  /**
   * Optimize scroll performance
   */
  optimizeScrollPerformance() {
    let ticking = false;
    
    const updateScrollPosition = () => {
      // Update scroll-dependent UI elements
      const scrollTop = window.pageYOffset;
      const scrollPercent = scrollTop / (document.body.scrollHeight - window.innerHeight);
      
      // Update progress indicators
      document.querySelectorAll('.scroll-progress').forEach(progress => {
        progress.style.width = `${scrollPercent * 100}%`;
      });
      
      ticking = false;
    };
    
    const requestScrollUpdate = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollPosition);
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  }

  /**
   * Optimize for Reddit frame environment
   */
  optimizeForRedditFrame() {
    // Adjust for Reddit frame constraints
    document.documentElement.style.setProperty('--reddit-frame-padding', '8px');
    
    // Handle Reddit frame communication
    this.setupRedditFrameCommunication();
    
    // Optimize for Reddit frame sizing
    this.optimizeRedditFrameSize();
  }

  /**
   * Setup communication with Reddit frame
   */
  setupRedditFrameCommunication() {
    // Listen for messages from Reddit parent frame
    window.addEventListener('message', (event) => {
      if (event.origin.includes('reddit.com')) {
        this.handleRedditFrameMessage(event.data);
      }
    });
    
    // Send ready message to Reddit parent
    window.parent.postMessage({
      type: 'pictact_ready',
      timestamp: Date.now()
    }, '*');
  }

  /**
   * Handle messages from Reddit frame
   */
  handleRedditFrameMessage(data) {
    switch (data.type) {
      case 'reddit_theme_change':
        this.applyRedditTheme(data.theme);
        break;
      case 'reddit_resize':
        this.handleRedditFrameResize(data.dimensions);
        break;
      case 'reddit_focus':
        this.handleRedditFrameFocus(data.focused);
        break;
    }
  }

  /**
   * Apply Reddit theme to frame content
   */
  applyRedditTheme(theme) {
    document.documentElement.setAttribute('data-reddit-theme', theme);
    console.log('Applied Reddit theme:', theme);
  }

  /**
   * Handle Reddit frame resize
   */
  handleRedditFrameResize(dimensions) {
    if (dimensions.width && dimensions.height) {
      document.documentElement.style.setProperty('--reddit-frame-width', `${dimensions.width}px`);
      document.documentElement.style.setProperty('--reddit-frame-height', `${dimensions.height}px`);
    }
  }

  /**
   * Handle Reddit frame focus changes
   */
  handleRedditFrameFocus(focused) {
    if (focused) {
      document.body.classList.add('reddit-frame-focused');
    } else {
      document.body.classList.remove('reddit-frame-focused');
    }
  }

  /**
   * Optimize Reddit frame size
   */
  optimizeRedditFrameSize() {
    // Auto-resize frame based on content
    const resizeObserver = new ResizeObserver((entries) => {
      const contentHeight = document.body.scrollHeight;
      window.parent.postMessage({
        type: 'pictact_resize',
        height: contentHeight
      }, '*');
    });
    
    resizeObserver.observe(document.body);
  }

  // Utility methods
  getBrowserType(userAgent) {
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    return 'other';
  }

  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  checkWebPSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  checkAVIFSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    try {
      return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    } catch (e) {
      return false;
    }
  }

  getNetworkSpeed() {
    if ('connection' in navigator) {
      return navigator.connection.downlink || 'unknown';
    }
    return 'unknown';
  }

  handleFileUpload(file, zone) {
    // Handle file upload from drag and drop
    const event = new CustomEvent('fileUploaded', {
      detail: { file, zone }
    });
    zone.dispatchEvent(event);
  }
}

// Initialize Reddit Web Optimizer
document.addEventListener('DOMContentLoaded', () => {
  window.RedditWebOptimizer = new RedditWebOptimizer();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RedditWebOptimizer;
}