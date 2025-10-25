/**
 * Reddit Mobile App Integration
 * Optimizes PicTact for Reddit mobile app interface
 * Requirements: 10.2, 10.4
 */

class RedditMobileAppIntegrator {
  constructor() {
    this.isMobileApp = this.detectMobileAppEnvironment();
    this.mobileFeatures = this.detectMobileFeatures();
    this.gestureHandlers = new Map();
    this.performanceMetrics = {};
    
    this.init();
  }

  /**
   * Detect if running in Reddit mobile app
   */
  detectMobileAppEnvironment() {
    const userAgent = navigator.userAgent;
    const standalone = window.navigator.standalone;
    const isInWebAppiOS = standalone !== undefined;
    
    return {
      isRedditMobile: userAgent.includes('Reddit') && (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')),
      isAndroidApp: userAgent.includes('Reddit') && userAgent.includes('Android'),
      isiOSApp: userAgent.includes('Reddit') && userAgent.includes('iPhone'),
      isWebView: window.location !== window.parent.location,
      isStandalone: isInWebAppiOS,
      appVersion: this.extractAppVersion(userAgent),
      osVersion: this.extractOSVersion(userAgent)
    };
  }

  /**
   * Detect mobile-specific features and capabilities
   */
  detectMobileFeatures() {
    return {
      // Touch capabilities
      hasTouchEvents: 'ontouchstart' in window,
      hasPointerEvents: 'PointerEvent' in window,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      
      // Device capabilities
      hasVibration: 'vibrate' in navigator,
      hasDeviceMotion: 'DeviceMotionEvent' in window,
      hasDeviceOrientation: 'DeviceOrientationEvent' in window,
      hasGeolocation: 'geolocation' in navigator,
      
      // Display capabilities
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: this.getOrientation(),
      
      // Performance capabilities
      hardwareConcurrency: navigator.hardwareConcurrency || 2,
      deviceMemory: navigator.deviceMemory || 'unknown',
      connectionType: this.getConnectionType(),
      
      // App integration
      hasAppBridge: this.checkAppBridge(),
      hasNativeShare: 'share' in navigator,
      hasClipboard: 'clipboard' in navigator
    };
  }

  /**
   * Initialize Reddit mobile app integration
   */
  init() {
    console.log('Reddit Mobile App Integration initialized', {
      environment: this.isMobileApp,
      features: this.mobileFeatures
    });

    // Apply mobile app optimizations
    this.optimizeForMobileApp();
    this.setupMobileGestures();
    this.setupMobilePerformance();
    this.setupMobileAccessibility();
    this.setupAppBridge();
    
    // Reddit mobile app specific optimizations
    if (this.isMobileApp.isRedditMobile) {
      this.optimizeForRedditMobile();
    }
  }

  /**
   * Optimize application for mobile app interface
   */
  optimizeForMobileApp() {
    // Add mobile app CSS classes
    document.documentElement.classList.add('reddit-mobile-app');
    
    if (this.isMobileApp.isAndroidApp) {
      document.documentElement.classList.add('reddit-android-app');
    }
    
    if (this.isMobileApp.isiOSApp) {
      document.documentElement.classList.add('reddit-ios-app');
    }
    
    // Optimize viewport for mobile app
    this.optimizeMobileViewport();
    
    // Setup mobile-specific interactions
    this.setupMobileInteractions();
    
    // Optimize for mobile performance
    this.optimizeMobileRendering();
  }  /**

   * Optimize viewport for mobile app
   */
  optimizeMobileViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      // Optimize viewport for mobile app constraints
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }

    // Handle safe area insets for notched devices
    this.handleSafeAreaInsets();
    
    // Handle orientation changes
    this.handleOrientationChanges();
  }

  /**
   * Handle safe area insets for modern mobile devices
   */
  handleSafeAreaInsets() {
    // Apply safe area insets using CSS custom properties
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --safe-area-inset-top: env(safe-area-inset-top, 0px);
        --safe-area-inset-right: env(safe-area-inset-right, 0px);
        --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
        --safe-area-inset-left: env(safe-area-inset-left, 0px);
      }
      
      .reddit-mobile-safe-top {
        padding-top: max(var(--reddit-space-16), var(--safe-area-inset-top));
      }
      
      .reddit-mobile-safe-bottom {
        padding-bottom: max(var(--reddit-space-16), var(--safe-area-inset-bottom));
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Handle orientation changes
   */
  handleOrientationChanges() {
    const handleOrientationChange = () => {
      const orientation = this.getOrientation();
      document.documentElement.setAttribute('data-orientation', orientation);
      
      // Trigger custom event for orientation change
      window.dispatchEvent(new CustomEvent('redditOrientationChange', {
        detail: { orientation }
      }));
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    // Initial orientation
    handleOrientationChange();
  }

  /**
   * Optimize mobile rendering performance
   */
  optimizeMobileRendering() {
    // Enable hardware acceleration for smooth animations
    const animatedElements = document.querySelectorAll('.game-card, .btn, .modal');
    animatedElements.forEach(element => {
      element.style.transform = 'translateZ(0)';
      element.style.willChange = 'transform, opacity';
    });

    // Optimize scroll performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });

    // Reduce repaints and reflows
    this.optimizeLayoutThrashing();

    // Enable CSS containment for better performance
    this.enableCSSContainment();

    console.log('Mobile rendering optimized');
  }

  /**
   * Optimize layout thrashing
   */
  optimizeLayoutThrashing() {
    // Batch DOM reads and writes
    let isScheduled = false;
    const scheduledUpdates = [];

    window.scheduleUpdate = (updateFn) => {
      scheduledUpdates.push(updateFn);
      
      if (!isScheduled) {
        isScheduled = true;
        requestAnimationFrame(() => {
          scheduledUpdates.forEach(fn => fn());
          scheduledUpdates.length = 0;
          isScheduled = false;
        });
      }
    };
  }

  /**
   * Enable CSS containment for performance
   */
  enableCSSContainment() {
    const containers = document.querySelectorAll('.game-card, .content-section, .modal');
    containers.forEach(container => {
      container.style.contain = 'layout style paint';
    });
  }

  /**
   * Setup mobile-specific interactions
   */
  setupMobileInteractions() {
    // Enable touch interactions
    this.enableTouchInteractions();
    
    // Setup gesture recognition
    this.setupGestureRecognition();
    
    // Setup haptic feedback
    this.setupHapticFeedback();
    
    // Setup mobile navigation
    this.setupMobileNavigation();
  }

  /**
   * Enable touch interactions
   */
  enableTouchInteractions() {
    // Prevent default touch behaviors where needed
    document.addEventListener('touchstart', (e) => {
      // Prevent zoom on double tap for specific elements
      if (e.target.classList.contains('prevent-zoom')) {
        e.preventDefault();
      }
    }, { passive: false });

    // Handle touch feedback
    document.addEventListener('touchstart', (e) => {
      const target = e.target.closest('.reddit-btn, .reddit-card-interactive');
      if (target) {
        target.classList.add('touch-active');
      }
    });

    document.addEventListener('touchend', (e) => {
      const target = e.target.closest('.reddit-btn, .reddit-card-interactive');
      if (target) {
        setTimeout(() => {
          target.classList.remove('touch-active');
        }, 150);
      }
    });
  }

  /**
   * Setup gesture recognition
   */
  setupGestureRecognition() {
    // Swipe gesture detection
    this.setupSwipeGestures();
    
    // Pull-to-refresh gesture
    this.setupPullToRefresh();
    
    // Pinch-to-zoom prevention
    this.preventPinchZoom();
  }

  /**
   * Setup swipe gestures
   */
  setupSwipeGestures() {
    let startX, startY, startTime;
    
    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!startX || !startY) return;
      
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;
      
      // Check for swipe gesture
      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100 && deltaTime < 300) {
        const direction = deltaX > 0 ? 'right' : 'left';
        this.handleSwipeGesture(direction, e.target);
      }
      
      startX = startY = null;
    }, { passive: true });
  }

  /**
   * Handle swipe gestures
   */
  handleSwipeGesture(direction, target) {
    // Handle swipe on game cards for quick actions
    const gameCard = target.closest('.game-card');
    if (gameCard) {
      if (direction === 'left') {
        // Swipe left to join game
        const joinBtn = gameCard.querySelector('.game-join-btn');
        if (joinBtn) {
          this.triggerHapticFeedback('light');
          joinBtn.click();
        }
      } else if (direction === 'right') {
        // Swipe right to view details
        const detailsLink = gameCard.querySelector('a');
        if (detailsLink) {
          this.triggerHapticFeedback('light');
          detailsLink.click();
        }
      }
    }
    
    // Custom swipe event
    window.dispatchEvent(new CustomEvent('redditSwipe', {
      detail: { direction, target }
    }));
  }

  /**
   * Setup pull-to-refresh gesture
   */
  setupPullToRefresh() {
    let startY, currentY, isPulling = false;
    const threshold = 80;
    
    const pullIndicator = document.createElement('div');
    pullIndicator.className = 'reddit-pull-refresh-indicator';
    pullIndicator.innerHTML = '↓';
    document.body.appendChild(pullIndicator);

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (startY && window.scrollY === 0) {
        currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 0) {
          isPulling = true;
          const progress = Math.min(pullDistance / threshold, 1);
          pullIndicator.style.transform = `translateY(${pullDistance * 0.5}px) rotate(${progress * 180}deg)`;
          pullIndicator.style.opacity = progress;
          
          if (pullDistance > threshold) {
            pullIndicator.innerHTML = '↑';
            document.body.classList.add('pull-refresh-ready');
          } else {
            pullIndicator.innerHTML = '↓';
            document.body.classList.remove('pull-refresh-ready');
          }
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (isPulling) {
        const pullDistance = currentY - startY;
        
        if (pullDistance > threshold) {
          this.triggerPullToRefresh();
        }
        
        // Reset
        pullIndicator.style.transform = 'translateY(-60px) rotate(0deg)';
        pullIndicator.style.opacity = '0';
        document.body.classList.remove('pull-refresh-ready');
        isPulling = false;
        startY = currentY = null;
      }
    }, { passive: true });
  }

  /**
   * Trigger pull-to-refresh action
   */
  triggerPullToRefresh() {
    this.triggerHapticFeedback('medium');
    
    // Dispatch custom refresh event
    window.dispatchEvent(new CustomEvent('redditPullRefresh'));
    
    // Show loading state
    document.body.classList.add('refreshing');
    
    // Simulate refresh (replace with actual refresh logic)
    setTimeout(() => {
      document.body.classList.remove('refreshing');
      this.showMobileToast('Content refreshed');
    }, 1500);
  }

  /**
   * Prevent pinch-to-zoom
   */
  preventPinchZoom() {
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    }, { passive: false });
  }

  /**
   * Setup haptic feedback
   */
  setupHapticFeedback() {
    // Store haptic feedback capability
    this.hasHapticFeedback = this.mobileFeatures.hasVibration;
  }

  /**
   * Trigger haptic feedback
   */
  triggerHapticFeedback(type = 'light') {
    if (!this.hasHapticFeedback) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      error: [50, 50, 50]
    };
    
    const pattern = patterns[type] || patterns.light;
    navigator.vibrate(pattern);
  }

  /**
   * Setup mobile navigation
   */
  setupMobileNavigation() {
    // Handle back button behavior
    this.setupBackButtonHandling();
    
    // Setup mobile menu
    this.setupMobileMenu();
    
    // Setup bottom navigation
    this.setupBottomNavigation();
  }

  /**
   * Setup back button handling
   */
  setupBackButtonHandling() {
    window.addEventListener('popstate', (e) => {
      // Handle back navigation in mobile app
      const modal = document.querySelector('.modal.active');
      const bottomSheet = document.querySelector('.reddit-bottom-sheet.open');
      
      if (modal) {
        modal.classList.remove('active');
        e.preventDefault();
      } else if (bottomSheet) {
        bottomSheet.classList.remove('open');
        e.preventDefault();
      }
    });
  }

  /**
   * Setup mobile menu
   */
  setupMobileMenu() {
    // Create mobile hamburger menu if not exists
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (!mobileMenuBtn) {
      this.createMobileMenu();
    }
  }

  /**
   * Create mobile menu
   */
  createMobileMenu() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    const menuBtn = document.createElement('button');
    menuBtn.className = 'mobile-menu-btn reddit-btn reddit-btn-secondary';
    menuBtn.innerHTML = '☰';
    menuBtn.setAttribute('aria-label', 'Open menu');
    
    const menu = document.createElement('div');
    menu.className = 'mobile-menu reddit-bottom-sheet';
    menu.innerHTML = `
      <div class="reddit-bottom-sheet-handle"></div>
      <div class="reddit-bottom-sheet-content">
        <h3>Menu</h3>
        <a href="#" class="mobile-menu-item">My Profile</a>
        <a href="create-event.html" class="mobile-menu-item">Create Event</a>
        <a href="#" class="mobile-menu-item">Leaderboard</a>
        <a href="#" class="mobile-menu-item">Settings</a>
      </div>
    `;
    
    menuBtn.addEventListener('click', () => {
      menu.classList.toggle('open');
      this.triggerHapticFeedback('light');
    });
    
    headerActions.appendChild(menuBtn);
    document.body.appendChild(menu);
  }

  /**
   * Setup bottom navigation
   */
  setupBottomNavigation() {
    // Create bottom navigation for mobile app
    if (this.isMobileApp.isRedditMobile) {
      this.createBottomNavigation();
    }
  }

  /**
   * Create bottom navigation
   */
  createBottomNavigation() {
    const bottomNav = document.createElement('nav');
    bottomNav.className = 'reddit-mobile-bottom-nav';
    bottomNav.innerHTML = `
      <a href="index.html" class="bottom-nav-item active">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">Home</span>
      </a>
      <a href="create-event.html" class="bottom-nav-item">
        <span class="nav-icon">➕</span>
        <span class="nav-label">Create</span>
      </a>
      <a href="#" class="bottom-nav-item">
        <span class="nav-icon">🏆</span>
        <span class="nav-label">Leaderboard</span>
      </a>
      <a href="#" class="bottom-nav-item">
        <span class="nav-icon">👤</span>
        <span class="nav-label">Profile</span>
      </a>
    `;
    
    document.body.appendChild(bottomNav);
    
    // Add bottom padding to main content
    document.body.style.paddingBottom = '80px';
  }

  /**
   * Setup mobile gesture handling
   */
  setupMobileGestures() {
    if (!this.mobileFeatures.hasTouchEvents) {
      console.log('Touch events not supported, skipping gesture setup');
      return;
    }

    // Setup touch gestures for game cards
    this.setupCardGestures();
    
    // Setup swipe navigation
    this.setupSwipeNavigation();
    
    // Setup pinch-to-zoom prevention
    this.setupZoomPrevention();
    
    // Setup pull-to-refresh handling
    this.setupPullToRefresh();

    console.log('Mobile gestures initialized');
  }

  /**
   * Setup gesture handling for game cards
   */
  setupCardGestures() {
    const gameCards = document.querySelectorAll('.game-card, .upcoming-item');
    
    gameCards.forEach(card => {
      let touchStartY = 0;
      let touchStartX = 0;
      let touchStartTime = 0;

      card.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        touchStartTime = Date.now();
        card.classList.add('touch-active');
      }, { passive: true });

      card.addEventListener('touchend', (e) => {
        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - touchStartTime;
        
        card.classList.remove('touch-active');
        
        // Handle tap (short touch)
        if (touchDuration < 200) {
          card.click();
        }
      }, { passive: true });

      card.addEventListener('touchcancel', () => {
        card.classList.remove('touch-active');
      }, { passive: true });
    });
  }

  /**
   * Setup swipe navigation
   */
  setupSwipeNavigation() {
    let startX = 0;
    let startY = 0;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      
      // Detect horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          // Swipe right - go back
          this.handleSwipeRight();
        } else {
          // Swipe left - go forward
          this.handleSwipeLeft();
        }
      }
    }, { passive: true });
  }

  /**
   * Handle swipe right (back navigation)
   */
  handleSwipeRight() {
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
      window.history.back();
    }
  }

  /**
   * Handle swipe left (forward navigation)
   */
  handleSwipeLeft() {
    // Could implement forward navigation or next page
    console.log('Swipe left detected');
  }

  /**
   * Setup pinch-to-zoom prevention
   */
  setupZoomPrevention() {
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    });

    document.addEventListener('gesturechange', (e) => {
      e.preventDefault();
    });

    document.addEventListener('gestureend', (e) => {
      e.preventDefault();
    });
  }

  /**
   * Setup pull-to-refresh handling
   */
  setupPullToRefresh() {
    let startY = 0;
    let isPulling = false;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (isPulling && window.scrollY === 0) {
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 100) {
          // Show pull-to-refresh indicator
          this.showPullToRefreshIndicator();
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (isPulling) {
        isPulling = false;
        this.hidePullToRefreshIndicator();
      }
    }, { passive: true });
  }

  /**
   * Show pull-to-refresh indicator
   */
  showPullToRefreshIndicator() {
    let indicator = document.querySelector('.pull-to-refresh-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'pull-to-refresh-indicator';
      indicator.innerHTML = '↓ Pull to refresh';
      document.body.prepend(indicator);
    }
    indicator.style.display = 'block';
  }

  /**
   * Hide pull-to-refresh indicator
   */
  hidePullToRefreshIndicator() {
    const indicator = document.querySelector('.pull-to-refresh-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  /**
   * Setup mobile performance optimizations
   */
  setupMobilePerformance() {
    // Optimize rendering performance
    this.optimizeRendering();
    
    // Setup performance monitoring
    this.setupPerformanceMonitoring();
    
    // Optimize memory usage
    this.optimizeMemoryUsage();
    
    // Setup connection monitoring
    this.setupConnectionMonitoring();
  }

  /**
   * Optimize rendering performance for mobile
   */
  optimizeRendering() {
    // Use passive event listeners where possible
    const passiveEvents = ['scroll', 'touchstart', 'touchmove', 'wheel'];
    passiveEvents.forEach(event => {
      document.addEventListener(event, () => {}, { passive: true });
    });
    
    // Optimize scroll performance
    this.optimizeScrollPerformance();
    
    // Use requestAnimationFrame for animations
    this.optimizeAnimations();
  }

  /**
   * Optimize scroll performance
   */
  optimizeScrollPerformance() {
    let ticking = false;
    
    const updateScrollElements = () => {
      // Update scroll-dependent elements efficiently
      const scrollTop = window.pageYOffset;
      
      // Update header opacity based on scroll
      const header = document.querySelector('.main-header');
      if (header) {
        const opacity = Math.min(scrollTop / 100, 1);
        header.style.backgroundColor = `rgba(var(--reddit-neutral-background-rgb), ${0.9 + opacity * 0.1})`;
      }
      
      ticking = false;
    };
    
    const requestScrollUpdate = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollElements);
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  }

  /**
   * Optimize animations for mobile
   */
  optimizeAnimations() {
    // Reduce animation complexity on low-end devices
    if (this.mobileFeatures.hardwareConcurrency <= 2) {
      document.documentElement.classList.add('low-performance');
    }
    
    // Use transform instead of changing layout properties
    const animatedElements = document.querySelectorAll('.animated-element');
    animatedElements.forEach(element => {
      element.style.willChange = 'transform, opacity';
    });
  }

  /**
   * Setup performance monitoring for mobile
   */
  setupPerformanceMonitoring() {
    // Monitor frame rate
    this.monitorFrameRate();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor network performance
    this.monitorNetworkPerformance();
  }

  /**
   * Monitor frame rate
   */
  monitorFrameRate() {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = (currentTime) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.performanceMetrics.fps = fps;
        
        // Adjust performance based on FPS
        if (fps < 30) {
          document.documentElement.classList.add('low-fps');
        } else {
          document.documentElement.classList.remove('low-fps');
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  /**
   * Monitor memory usage
   */
  monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.performanceMetrics.memory = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        };
        
        // Warn if memory usage is high
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          console.warn('High memory usage detected:', usagePercent + '%');
        }
      }, 10000);
    }
  }

  /**
   * Monitor network performance
   */
  monitorNetworkPerformance() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const updateNetworkStatus = () => {
        this.performanceMetrics.network = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        };
        
        // Adjust app behavior based on connection
        if (connection.saveData || connection.effectiveType === 'slow-2g') {
          document.documentElement.classList.add('save-data');
        } else {
          document.documentElement.classList.remove('save-data');
        }
      };
      
      connection.addEventListener('change', updateNetworkStatus);
      updateNetworkStatus();
    }
  }

  /**
   * Optimize memory usage
   */
  optimizeMemoryUsage() {
    // Clean up unused event listeners
    this.cleanupEventListeners();
    
    // Implement image lazy loading
    this.implementImageLazyLoading();
    
    // Optimize DOM manipulation
    this.optimizeDOMManipulation();
  }

  /**
   * Clean up unused event listeners
   */
  cleanupEventListeners() {
    // Store active listeners for cleanup
    this.activeListeners = new Set();
    
    // Override addEventListener to track listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      this.activeListeners = this.activeListeners || new Set();
      this.activeListeners.add({ type, listener, options });
      return originalAddEventListener.call(this, type, listener, options);
    };
  }

  /**
   * Implement image lazy loading for mobile
   */
  implementImageLazyLoading() {
    if ('IntersectionObserver' in window) {
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
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  /**
   * Optimize DOM manipulation
   */
  optimizeDOMManipulation() {
    // Batch DOM updates
    this.batchDOMUpdates = [];
    
    window.requestDOMUpdate = (callback) => {
      this.batchDOMUpdates.push(callback);
      
      if (this.batchDOMUpdates.length === 1) {
        requestAnimationFrame(() => {
          this.batchDOMUpdates.forEach(cb => cb());
          this.batchDOMUpdates = [];
        });
      }
    };
  }

  /**
   * Setup connection monitoring
   */
  setupConnectionMonitoring() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.showMobileToast('Connection restored');
      document.body.classList.remove('offline');
    });
    
    window.addEventListener('offline', () => {
      this.showMobileToast('Connection lost');
      document.body.classList.add('offline');
    });
  }

  /**
   * Setup mobile accessibility features
   */
  setupMobileAccessibility() {
    // Enhanced touch targets
    this.enhanceTouchTargets();
    
    // Voice control support
    this.setupVoiceControl();
    
    // Screen reader optimizations
    this.setupMobileScreenReader();
  }

  /**
   * Enhance touch targets for accessibility
   */
  enhanceTouchTargets() {
    const minTouchTarget = 44; // iOS/Android minimum
    
    document.querySelectorAll('button, a, input, select').forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width < minTouchTarget || rect.height < minTouchTarget) {
        element.style.minWidth = minTouchTarget + 'px';
        element.style.minHeight = minTouchTarget + 'px';
      }
    });
  }

  /**
   * Setup voice control support
   */
  setupVoiceControl() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // Voice control implementation would go here
      console.log('Voice control available');
    }
  }

  /**
   * Setup mobile screen reader optimizations
   */
  setupMobileScreenReader() {
    // Add mobile-specific ARIA labels
    document.querySelectorAll('.game-card').forEach((card, index) => {
      card.setAttribute('aria-label', `Game ${index + 1}`);
      card.setAttribute('role', 'button');
    });
    
    // Add swipe instructions for screen readers
    const swipeInstructions = document.createElement('div');
    swipeInstructions.className = 'sr-only';
    swipeInstructions.textContent = 'Swipe left to join game, swipe right for details';
    document.body.appendChild(swipeInstructions);
  }

  /**
   * Setup app bridge for Reddit mobile app
   */
  setupAppBridge() {
    if (this.mobileFeatures.hasAppBridge) {
      this.initializeAppBridge();
    }
  }

  /**
   * Initialize app bridge communication
   */
  initializeAppBridge() {
    // Listen for messages from Reddit mobile app
    window.addEventListener('message', (event) => {
      if (event.origin.includes('reddit.com')) {
        this.handleAppBridgeMessage(event.data);
      }
    });
    
    // Send ready message to Reddit app
    this.sendAppBridgeMessage({
      type: 'pictact_mobile_ready',
      capabilities: this.mobileFeatures
    });
  }

  /**
   * Handle messages from Reddit mobile app
   */
  handleAppBridgeMessage(data) {
    switch (data.type) {
      case 'reddit_mobile_theme':
        this.applyMobileTheme(data.theme);
        break;
      case 'reddit_mobile_share':
        this.handleNativeShare(data.content);
        break;
      case 'reddit_mobile_notification':
        this.showMobileNotification(data.notification);
        break;
    }
  }

  /**
   * Send message to Reddit mobile app
   */
  sendAppBridgeMessage(data) {
    if (window.parent !== window) {
      window.parent.postMessage(data, '*');
    }
  }

  /**
   * Apply mobile theme
   */
  applyMobileTheme(theme) {
    document.documentElement.setAttribute('data-reddit-mobile-theme', theme);
  }

  /**
   * Handle native share
   */
  async handleNativeShare(content) {
    if (this.mobileFeatures.hasNativeShare) {
      try {
        await navigator.share(content);
      } catch (error) {
        console.log('Share failed:', error);
      }
    }
  }

  /**
   * Show mobile notification
   */
  showMobileNotification(notification) {
    this.showMobileToast(notification.message);
  }

  /**
   * Show mobile toast notification
   */
  showMobileToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'reddit-mobile-toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Trigger show animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto hide
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, duration);
  }

  /**
   * Optimize for Reddit mobile app specifically
   */
  optimizeForRedditMobile() {
    // Adjust for Reddit mobile app constraints
    document.documentElement.style.setProperty('--reddit-mobile-padding', '12px');
    
    // Handle Reddit mobile app lifecycle
    this.handleAppLifecycle();
    
    // Optimize for Reddit mobile performance
    this.optimizeRedditMobilePerformance();
  }

  /**
   * Handle app lifecycle events
   */
  handleAppLifecycle() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App went to background
        this.handleAppBackground();
      } else {
        // App came to foreground
        this.handleAppForeground();
      }
    });
  }

  /**
   * Handle app going to background
   */
  handleAppBackground() {
    // Pause animations and timers
    document.body.classList.add('app-background');
    
    // Clear intervals and timeouts
    this.pauseTimers();
  }

  /**
   * Handle app coming to foreground
   */
  handleAppForeground() {
    // Resume animations and timers
    document.body.classList.remove('app-background');
    
    // Resume intervals and timeouts
    this.resumeTimers();
    
    // Refresh data if needed
    this.refreshDataIfNeeded();
  }

  /**
   * Pause timers when app goes to background
   */
  pauseTimers() {
    // Implementation for pausing timers
  }

  /**
   * Resume timers when app comes to foreground
   */
  resumeTimers() {
    // Implementation for resuming timers
  }

  /**
   * Refresh data if needed when app comes to foreground
   */
  refreshDataIfNeeded() {
    const lastRefresh = localStorage.getItem('lastDataRefresh');
    const now = Date.now();
    
    if (!lastRefresh || now - parseInt(lastRefresh) > 300000) { // 5 minutes
      // Trigger data refresh
      window.dispatchEvent(new CustomEvent('redditDataRefresh'));
      localStorage.setItem('lastDataRefresh', now.toString());
    }
  }

  /**
   * Optimize performance for Reddit mobile app
   */
  optimizeRedditMobilePerformance() {
    // Reduce animation complexity
    if (this.mobileFeatures.hardwareConcurrency <= 2) {
      document.documentElement.classList.add('reddit-mobile-low-performance');
    }
    
    // Optimize image loading
    this.optimizeMobileImageLoading();
    
    // Reduce memory footprint
    this.reduceMobileMemoryFootprint();
  }

  /**
   * Optimize image loading for mobile app
   */
  optimizeMobileImageLoading() {
    // Use smaller image sizes for mobile
    document.querySelectorAll('img[data-mobile-src]').forEach(img => {
      if (this.mobileFeatures.screenWidth <= 480) {
        img.src = img.dataset.mobileSrc;
      }
    });
  }

  /**
   * Reduce memory footprint for mobile app
   */
  reduceMobileMemoryFootprint() {
    // Limit number of DOM elements
    const maxElements = 1000;
    const elements = document.querySelectorAll('*');
    
    if (elements.length > maxElements) {
      console.warn('High DOM element count:', elements.length);
    }
    
    // Clean up unused elements periodically
    setInterval(() => {
      this.cleanupUnusedElements();
    }, 30000);
  }

  /**
   * Clean up unused DOM elements
   */
  cleanupUnusedElements() {
    // Remove elements that are far from viewport
    const viewportHeight = window.innerHeight;
    const scrollTop = window.pageYOffset;
    
    document.querySelectorAll('.cleanup-candidate').forEach(element => {
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + scrollTop;
      
      if (elementTop < scrollTop - viewportHeight * 2 || 
          elementTop > scrollTop + viewportHeight * 3) {
        // Element is far from viewport, consider for cleanup
        element.style.display = 'none';
      }
    });
  }

  // Utility methods
  extractAppVersion(userAgent) {
    const match = userAgent.match(/Reddit\/(\d+\.\d+\.\d+)/);
    return match ? match[1] : 'unknown';
  }

  extractOSVersion(userAgent) {
    if (userAgent.includes('iPhone')) {
      const match = userAgent.match(/OS (\d+_\d+)/);
      return match ? match[1].replace('_', '.') : 'unknown';
    } else if (userAgent.includes('Android')) {
      const match = userAgent.match(/Android (\d+\.\d+)/);
      return match ? match[1] : 'unknown';
    }
    return 'unknown';
  }

  getOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  getConnectionType() {
    if ('connection' in navigator) {
      return navigator.connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  checkAppBridge() {
    return window.location !== window.parent.location && 
           (window.location.search.includes('reddit') || 
            document.referrer.includes('reddit.com'));
  }
}

// Initialize Reddit Mobile App Integrator
document.addEventListener('DOMContentLoaded', () => {
  window.RedditMobileAppIntegrator = new RedditMobileAppIntegrator();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RedditMobileAppIntegrator;
}