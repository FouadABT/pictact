/**
 * Reddit Mobile Components
 * Native mobile interaction patterns for Reddit integration
 */

class RedditMobileComponents {
  constructor() {
    this.init();
  }

  init() {
    this.setupPullToRefresh();
    this.setupBottomSheet();
    this.setupMobileToasts();
    this.setupSwipeGestures();
    this.setupMobileNavigation();
    this.setupTouchOptimizations();
  }

  setupPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let pullDistance = 0;
    const threshold = 80;

    const container = document.querySelector('.main-content, .games-grid');
    if (!container) return;

    // Add pull-to-refresh indicator
    const indicator = document.createElement('div');
    indicator.className = 'reddit-pull-refresh-indicator';
    indicator.innerHTML = '↻';
    indicator.style.cssText = `
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--reddit-neutral-background);
      border-radius: 50%;
      box-shadow: var(--reddit-shadow-sm);
      transition: top 0.2s ease, transform 0.2s ease;
      font-size: 20px;
      color: var(--reddit-interactive-background);
    `;

    container.style.position = 'relative';
    container.appendChild(indicator);

    container.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    });

    container.addEventListener('touchmove', (e) => {
      if (!isPulling) return;

      currentY = e.touches[0].clientY;
      pullDistance = Math.max(0, currentY - startY);

      if (pullDistance > 0) {
        e.preventDefault();
        const progress = Math.min(pullDistance / threshold, 1);
        
        indicator.style.top = `${-60 + (pullDistance * 0.5)}px`;
        indicator.style.transform = `translateX(-50%) rotate(${progress * 360}deg)`;
        
        if (pullDistance > threshold) {
          indicator.style.backgroundColor = 'var(--reddit-success)';
          indicator.style.color = 'white';
        } else {
          indicator.style.backgroundColor = 'var(--reddit-neutral-background)';
          indicator.style.color = 'var(--reddit-interactive-background)';
        }
      }
    });

    container.addEventListener('touchend', () => {
      if (!isPulling) return;

      isPulling = false;

      if (pullDistance > threshold) {
        // Trigger refresh
        this.triggerRefresh();
        
        // Animate indicator
        indicator.style.top = '16px';
        setTimeout(() => {
          indicator.style.top = '-60px';
          indicator.style.transform = 'translateX(-50%) rotate(0deg)';
          indicator.style.backgroundColor = 'var(--reddit-neutral-background)';
          indicator.style.color = 'var(--reddit-interactive-background)';
        }, 1000);
      } else {
        // Reset indicator
        indicator.style.top = '-60px';
        indicator.style.transform = 'translateX(-50%) rotate(0deg)';
      }

      pullDistance = 0;
    });
  }

  triggerRefresh() {
    // Announce refresh for screen readers
    if (window.redditAccessibility) {
      window.redditAccessibility.announce('Refreshing content');
    }

    // Trigger actual refresh logic
    window.dispatchEvent(new CustomEvent('reddit-pull-refresh'));
    
    // Show loading state
    const loadingElements = document.querySelectorAll('.games-grid .game-card');
    loadingElements.forEach(card => {
      const skeleton = document.createElement('div');
      skeleton.className = 'reddit-mobile-skeleton';
      skeleton.style.height = '200px';
      skeleton.style.borderRadius = 'var(--reddit-radius-8)';
      skeleton.style.marginBottom = 'var(--reddit-space-12)';
      
      card.style.opacity = '0.5';
      setTimeout(() => {
        card.style.opacity = '1';
      }, 1500);
    });
  }

  setupBottomSheet() {
    // Create bottom sheet container
    const bottomSheet = document.createElement('div');
    bottomSheet.className = 'reddit-bottom-sheet';
    bottomSheet.id = 'reddit-bottom-sheet';
    
    const handle = document.createElement('div');
    handle.className = 'reddit-bottom-sheet-handle';
    
    const content = document.createElement('div');
    content.className = 'reddit-bottom-sheet-content';
    content.id = 'reddit-bottom-sheet-content';
    
    bottomSheet.appendChild(handle);
    bottomSheet.appendChild(content);
    document.body.appendChild(bottomSheet);

    // Handle swipe to dismiss
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    handle.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
    });

    handle.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      
      if (deltaY > 0) {
        bottomSheet.style.transform = `translateY(${deltaY}px)`;
      }
    });

    handle.addEventListener('touchend', () => {
      if (!isDragging) return;
      
      const deltaY = currentY - startY;
      isDragging = false;
      
      if (deltaY > 100) {
        this.hideBottomSheet();
      } else {
        bottomSheet.style.transform = 'translateY(0)';
      }
    });

    // Close on backdrop click
    bottomSheet.addEventListener('click', (e) => {
      if (e.target === bottomSheet) {
        this.hideBottomSheet();
      }
    });
  }

  showBottomSheet(content, title = '') {
    const bottomSheet = document.getElementById('reddit-bottom-sheet');
    const contentContainer = document.getElementById('reddit-bottom-sheet-content');
    
    if (title) {
      contentContainer.innerHTML = `<h3 class="reddit-text-title reddit-m-16">${title}</h3>${content}`;
    } else {
      contentContainer.innerHTML = content;
    }
    
    bottomSheet.classList.add('open');
    
    // Focus management
    const firstFocusable = contentContainer.querySelector('button, a, input, [tabindex="0"]');
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 300);
    }

    // Announce for screen readers
    if (window.redditAccessibility) {
      window.redditAccessibility.announce(`Bottom sheet opened${title ? ': ' + title : ''}`);
    }
  }

  hideBottomSheet() {
    const bottomSheet = document.getElementById('reddit-bottom-sheet');
    bottomSheet.classList.remove('open');
    
    // Restore focus
    if (window.redditAccessibility && window.redditAccessibility.focusManager) {
      window.redditAccessibility.focusManager.restoreFocus();
    }

    // Announce for screen readers
    if (window.redditAccessibility) {
      window.redditAccessibility.announce('Bottom sheet closed');
    }
  }

  setupMobileToasts() {
    // Create toast container
    const toastContainer = document.createElement('div');
    toastContainer.className = 'reddit-mobile-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: var(--reddit-space-16);
      left: var(--reddit-space-16);
      right: var(--reddit-space-16);
      z-index: var(--reddit-z-tooltip);
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);

    // Override notification system for mobile
    if (window.redditNotifications) {
      const originalShow = window.redditNotifications.show.bind(window.redditNotifications);
      
      window.redditNotifications.show = (message, type = 'info', duration = 4000) => {
        if (window.innerWidth <= 768) {
          this.showMobileToast(message, type, duration);
        } else {
          originalShow(message, type, duration);
        }
      };
    }
  }

  showMobileToast(message, type = 'info', duration = 4000) {
    const container = document.querySelector('.reddit-mobile-toast-container');
    
    const toast = document.createElement('div');
    toast.className = `reddit-mobile-toast reddit-mobile-toast-${type}`;
    
    const colors = {
      success: 'var(--reddit-success)',
      error: 'var(--reddit-danger)',
      warning: 'var(--reddit-warning)',
      info: 'var(--reddit-info)'
    };

    toast.style.cssText = `
      background-color: ${colors[type] || colors.info};
      color: white;
      padding: var(--reddit-space-16);
      border-radius: var(--reddit-radius-8);
      box-shadow: var(--reddit-shadow-lg);
      transform: translateY(100px);
      transition: transform 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      margin-bottom: var(--reddit-space-8);
      font-size: 14px;
      font-weight: 500;
    `;

    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
    });

    // Auto-dismiss
    const timeoutId = setTimeout(() => {
      this.dismissMobileToast(toast);
    }, duration);

    // Click to dismiss
    toast.addEventListener('click', () => {
      clearTimeout(timeoutId);
      this.dismissMobileToast(toast);
    });
  }

  dismissMobileToast(toast) {
    toast.style.transform = 'translateY(100px)';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  setupSwipeGestures() {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isSwipeGesture = false;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwipeGesture = false;
    });

    document.addEventListener('touchmove', (e) => {
      if (!isSwipeGesture) {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
        
        const deltaX = Math.abs(currentX - startX);
        const deltaY = Math.abs(currentY - startY);
        
        // Determine if this is a horizontal swipe
        if (deltaX > deltaY && deltaX > 30) {
          isSwipeGesture = true;
        }
      }
    });

    document.addEventListener('touchend', (e) => {
      if (!isSwipeGesture) return;
      
      const deltaX = currentX - startX;
      const deltaY = Math.abs(currentY - startY);
      
      // Only process horizontal swipes
      if (Math.abs(deltaX) > 50 && deltaY < 100) {
        if (deltaX > 0) {
          this.handleSwipeRight(e.target);
        } else {
          this.handleSwipeLeft(e.target);
        }
      }
      
      isSwipeGesture = false;
    });
  }

  handleSwipeRight(target) {
    // Navigate back or show previous content
    const backButton = document.querySelector('[aria-label*="back"], [aria-label*="Back"], .breadcrumb a');
    if (backButton) {
      backButton.click();
      
      if (window.redditAccessibility) {
        window.redditAccessibility.announce('Navigated back');
      }
    }
  }

  handleSwipeLeft(target) {
    // Show additional options or next content
    const card = target.closest('.game-card, .reddit-card');
    if (card) {
      this.showCardActions(card);
    }
  }

  showCardActions(card) {
    const title = card.querySelector('.game-title, .reddit-text-title')?.textContent || 'Game';
    const actions = `
      <div class="reddit-p-16">
        <button class="reddit-btn reddit-btn-filled reddit-btn-md" style="width: 100%; margin-bottom: var(--reddit-space-12);">
          🚀 Join Game
        </button>
        <button class="reddit-btn reddit-btn-outlined reddit-btn-md" style="width: 100%; margin-bottom: var(--reddit-space-12);">
          📋 View Details
        </button>
        <button class="reddit-btn reddit-btn-ghost reddit-btn-md" style="width: 100%;">
          🔔 Set Reminder
        </button>
      </div>
    `;
    
    this.showBottomSheet(actions, title);
  }

  setupMobileNavigation() {
    // Add mobile-specific navigation enhancements
    this.setupMobileTabs();
    this.setupMobileMenu();
  }

  setupMobileTabs() {
    // Convert section headers to mobile tabs on small screens
    if (window.innerWidth <= 768) {
      const sections = document.querySelectorAll('.content-section');
      if (sections.length > 1) {
        const tabContainer = document.createElement('div');
        tabContainer.className = 'reddit-mobile-tabs';
        
        sections.forEach((section, index) => {
          const title = section.querySelector('.section-title')?.textContent || `Section ${index + 1}`;
          const tab = document.createElement('a');
          tab.className = 'reddit-mobile-tab';
          tab.href = `#section-${index}`;
          tab.textContent = title;
          tab.setAttribute('role', 'tab');
          
          if (index === 0) {
            tab.classList.add('active');
          }
          
          tab.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchToSection(index);
          });
          
          tabContainer.appendChild(tab);
          section.id = `section-${index}`;
        });
        
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
          mainContent.insertBefore(tabContainer, mainContent.firstChild);
        }
      }
    }
  }

  switchToSection(index) {
    const tabs = document.querySelectorAll('.reddit-mobile-tab');
    const sections = document.querySelectorAll('.content-section');
    
    // Update tab states
    tabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === index);
    });
    
    // Show/hide sections
    sections.forEach((section, i) => {
      section.style.display = i === index ? 'block' : 'none';
    });
    
    // Announce change
    if (window.redditAccessibility) {
      const sectionTitle = sections[index]?.querySelector('.section-title')?.textContent;
      window.redditAccessibility.announce(`Switched to ${sectionTitle}`);
    }
  }

  setupMobileMenu() {
    // Add hamburger menu for mobile if needed
    if (window.innerWidth <= 768) {
      const headerActions = document.querySelector('.header-actions');
      if (headerActions && headerActions.children.length > 2) {
        const menuButton = document.createElement('button');
        menuButton.className = 'reddit-btn reddit-btn-ghost reddit-btn-sm';
        menuButton.innerHTML = '☰';
        menuButton.setAttribute('aria-label', 'Open menu');
        
        menuButton.addEventListener('click', () => {
          this.showMobileMenu();
        });
        
        // Hide some actions and show menu button
        Array.from(headerActions.children).slice(1).forEach(child => {
          child.style.display = 'none';
        });
        
        headerActions.appendChild(menuButton);
      }
    }
  }

  showMobileMenu() {
    const hiddenActions = document.querySelectorAll('.header-actions > *[style*="display: none"]');
    let menuContent = '<div class="reddit-p-16">';
    
    hiddenActions.forEach(action => {
      const text = action.textContent.trim();
      const href = action.href || '#';
      menuContent += `
        <a href="${href}" class="reddit-btn reddit-btn-ghost reddit-btn-md" style="width: 100%; margin-bottom: var(--reddit-space-8); justify-content: flex-start;">
          ${text}
        </a>
      `;
    });
    
    menuContent += '</div>';
    
    this.showBottomSheet(menuContent, 'Menu');
  }

  setupTouchOptimizations() {
    // Optimize touch interactions
    this.setupTouchFeedback();
    this.setupTouchTargetSizing();
  }

  setupTouchFeedback() {
    // Add visual feedback for touch interactions
    document.addEventListener('touchstart', (e) => {
      const target = e.target.closest('button, a, [role="button"], .reddit-card-interactive');
      if (target) {
        target.style.transform = 'scale(0.98)';
        target.style.opacity = '0.8';
      }
    });

    document.addEventListener('touchend', (e) => {
      const target = e.target.closest('button, a, [role="button"], .reddit-card-interactive');
      if (target) {
        setTimeout(() => {
          target.style.transform = '';
          target.style.opacity = '';
        }, 150);
      }
    });
  }

  setupTouchTargetSizing() {
    // Ensure all interactive elements meet minimum touch target size
    const interactiveElements = document.querySelectorAll('button, a, [role="button"], input, select');
    
    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        element.style.minWidth = '44px';
        element.style.minHeight = '44px';
        element.style.display = element.style.display || 'inline-flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
      }
    });
  }
}

// Initialize mobile components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth <= 768) {
    window.redditMobile = new RedditMobileComponents();
  }
});

// Re-initialize on resize
window.addEventListener('resize', () => {
  if (window.innerWidth <= 768 && !window.redditMobile) {
    window.redditMobile = new RedditMobileComponents();
  }
});

// Export for use in other modules
window.RedditMobileComponents = RedditMobileComponents;