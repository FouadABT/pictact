/**
 * Reddit Accessibility Enhancement Module
 * Implements Reddit-native accessibility patterns and WCAG compliance
 */

class RedditAccessibilityManager {
  constructor() {
    this.announcer = null;
    this.focusManager = null;
    this.keyboardNavigation = null;
    this.init();
  }

  init() {
    this.setupLiveRegion();
    this.setupFocusManagement();
    this.setupKeyboardNavigation();
    this.setupScreenReaderOptimizations();
    this.setupMobileAccessibility();
    this.setupColorContrastSupport();
    this.setupReducedMotionSupport();
  }

  setupLiveRegion() {
    // Create a live region for announcements
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'reddit-sr-only';
    this.announcer.id = 'reddit-announcer';
    document.body.appendChild(this.announcer);

    // Create an assertive announcer for urgent messages
    this.urgentAnnouncer = document.createElement('div');
    this.urgentAnnouncer.setAttribute('aria-live', 'assertive');
    this.urgentAnnouncer.setAttribute('aria-atomic', 'true');
    this.urgentAnnouncer.className = 'reddit-sr-only';
    this.urgentAnnouncer.id = 'reddit-urgent-announcer';
    document.body.appendChild(this.urgentAnnouncer);
  }

  announce(message, urgent = false) {
    const announcer = urgent ? this.urgentAnnouncer : this.announcer;
    announcer.textContent = message;
    
    // Clear after announcement to allow re-announcement of same message
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }

  setupFocusManagement() {
    this.focusManager = new RedditFocusManager();
    
    // Add skip links
    this.addSkipLinks();
    
    // Manage focus for dynamic content
    this.setupDynamicFocusManagement();
    
    // Handle focus trapping for modals
    this.setupFocusTrapping();
  }

  addSkipLinks() {
    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#navigation', text: 'Skip to navigation' },
      { href: '#search', text: 'Skip to search' }
    ];

    const skipContainer = document.createElement('div');
    skipContainer.className = 'reddit-skip-links';
    skipContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      z-index: ${getComputedStyle(document.documentElement).getPropertyValue('--reddit-z-tooltip')};
    `;

    skipLinks.forEach(link => {
      const skipLink = document.createElement('a');
      skipLink.href = link.href;
      skipLink.textContent = link.text;
      skipLink.className = 'reddit-skip-link reddit-focus-visible';
      
      // Only show if target exists
      if (document.querySelector(link.href)) {
        skipContainer.appendChild(skipLink);
      }
    });

    if (skipContainer.children.length > 0) {
      document.body.insertBefore(skipContainer, document.body.firstChild);
    }
  }

  setupDynamicFocusManagement() {
    // Handle focus for dynamically loaded content
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.enhanceNewContent(node);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  enhanceNewContent(element) {
    // Add proper ARIA labels and roles
    this.addAriaLabels(element);
    
    // Enhance interactive elements
    this.enhanceInteractiveElements(element);
    
    // Add keyboard navigation
    this.addKeyboardSupport(element);
  }

  addAriaLabels(element) {
    // Game cards
    const gameCards = element.querySelectorAll('.game-card, .reddit-card-interactive');
    gameCards.forEach((card, index) => {
      if (!card.getAttribute('aria-label')) {
        const title = card.querySelector('.game-title, .reddit-text-title')?.textContent;
        const creator = card.querySelector('.game-creator, .reddit-text-metadata')?.textContent;
        
        if (title) {
          let label = `Game: ${title}`;
          if (creator) {
            label += `, ${creator}`;
          }
          card.setAttribute('aria-label', label);
        }
      }
      
      // Make focusable if interactive
      if (!card.hasAttribute('tabindex') && card.classList.contains('reddit-card-interactive')) {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
      }
    });

    // Buttons without proper labels
    const buttons = element.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach(button => {
      const text = button.textContent.trim();
      const icon = button.querySelector('.btn-icon, .stat-icon');
      
      if (!text && icon) {
        // Button with only icon needs aria-label
        const iconText = icon.textContent || icon.getAttribute('aria-label') || 'Button';
        button.setAttribute('aria-label', iconText);
      }
    });

    // Form inputs without labels
    const inputs = element.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    inputs.forEach(input => {
      const label = element.querySelector(`label[for="${input.id}"]`);
      if (!label && input.placeholder) {
        input.setAttribute('aria-label', input.placeholder);
      }
    });

    // Status indicators
    const statusBadges = element.querySelectorAll('.status-badge, .reddit-badge');
    statusBadges.forEach(badge => {
      if (!badge.getAttribute('aria-label')) {
        badge.setAttribute('aria-label', `Status: ${badge.textContent.trim()}`);
      }
    });
  }

  enhanceInteractiveElements(element) {
    // Add proper roles and states
    const interactiveElements = element.querySelectorAll('.reddit-card-interactive, .clickable-card');
    interactiveElements.forEach(el => {
      if (!el.getAttribute('role')) {
        el.setAttribute('role', 'button');
      }
      
      // Add keyboard support
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
      }
    });

    // Enhance vote buttons
    const voteButtons = element.querySelectorAll('.reddit-vote-button');
    voteButtons.forEach(button => {
      const isUpvote = button.classList.contains('upvote');
      const isDownvote = button.classList.contains('downvote');
      
      if (isUpvote) {
        button.setAttribute('aria-label', 'Upvote');
      } else if (isDownvote) {
        button.setAttribute('aria-label', 'Downvote');
      }
      
      button.setAttribute('aria-pressed', 'false');
    });

    // Enhance live indicators
    const liveIndicators = element.querySelectorAll('.reddit-live-indicator, .live-indicator');
    liveIndicators.forEach(indicator => {
      indicator.setAttribute('aria-label', 'Live content');
      indicator.setAttribute('role', 'status');
    });
  }

  addKeyboardSupport(element) {
    // Add Enter/Space support for interactive elements
    const interactiveElements = element.querySelectorAll('[role="button"]:not(button)');
    interactiveElements.forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });
  }

  setupFocusTrapping() {
    // Handle focus trapping for modals and overlays
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.reddit-modal:not([hidden]), .reddit-bottom-sheet.open');
        if (modal) {
          this.trapFocus(e, modal);
        }
      }
    });
  }

  trapFocus(event, container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  setupKeyboardNavigation() {
    this.keyboardNavigation = new RedditKeyboardNavigation();
  }

  setupScreenReaderOptimizations() {
    // Add proper headings hierarchy
    this.fixHeadingHierarchy();
    
    // Add landmark roles
    this.addLandmarkRoles();
    
    // Enhance tables
    this.enhanceTables();
    
    // Add descriptions for complex content
    this.addContentDescriptions();
  }

  fixHeadingHierarchy() {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
    let currentLevel = 1;
    
    headings.forEach(heading => {
      const tagLevel = parseInt(heading.tagName?.charAt(1)) || parseInt(heading.getAttribute('aria-level')) || 2;
      
      // Ensure proper hierarchy
      if (tagLevel > currentLevel + 1) {
        heading.setAttribute('aria-level', currentLevel + 1);
      } else {
        currentLevel = tagLevel;
      }
    });
  }

  addLandmarkRoles() {
    // Add main landmark if missing
    const main = document.querySelector('main');
    if (main && !main.getAttribute('role')) {
      main.setAttribute('role', 'main');
    }

    // Add navigation landmarks
    const navs = document.querySelectorAll('nav, .navigation, .breadcrumb');
    navs.forEach(nav => {
      if (!nav.getAttribute('role')) {
        nav.setAttribute('role', 'navigation');
      }
    });

    // Add banner role to header
    const header = document.querySelector('header, .main-header');
    if (header && !header.getAttribute('role')) {
      header.setAttribute('role', 'banner');
    }

    // Add contentinfo role to footer
    const footer = document.querySelector('footer');
    if (footer && !footer.getAttribute('role')) {
      footer.setAttribute('role', 'contentinfo');
    }
  }

  enhanceTables() {
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      // Add table caption if missing
      if (!table.querySelector('caption')) {
        const title = table.getAttribute('aria-label') || 'Data table';
        const caption = document.createElement('caption');
        caption.textContent = title;
        caption.className = 'reddit-sr-only';
        table.insertBefore(caption, table.firstChild);
      }

      // Ensure proper header associations
      const headers = table.querySelectorAll('th');
      headers.forEach((header, index) => {
        if (!header.id) {
          header.id = `table-header-${index}`;
        }
      });

      const cells = table.querySelectorAll('td');
      cells.forEach(cell => {
        if (!cell.getAttribute('headers')) {
          const headerRow = table.querySelector('tr');
          const headerIndex = Array.from(cell.parentNode.children).indexOf(cell);
          const header = headerRow?.children[headerIndex];
          if (header?.id) {
            cell.setAttribute('headers', header.id);
          }
        }
      });
    });
  }

  addContentDescriptions() {
    // Add descriptions for charts, graphs, and complex visuals
    const complexElements = document.querySelectorAll('.chart, .graph, .visualization, .trophy-display');
    complexElements.forEach(element => {
      if (!element.getAttribute('aria-describedby')) {
        const description = this.generateContentDescription(element);
        if (description) {
          const descId = `desc-${Math.random().toString(36).substr(2, 9)}`;
          const descElement = document.createElement('div');
          descElement.id = descId;
          descElement.className = 'reddit-sr-only';
          descElement.textContent = description;
          
          element.setAttribute('aria-describedby', descId);
          element.parentNode.insertBefore(descElement, element.nextSibling);
        }
      }
    });
  }

  generateContentDescription(element) {
    // Generate meaningful descriptions for complex content
    if (element.classList.contains('trophy-display')) {
      const trophyName = element.querySelector('.trophy-name')?.textContent;
      const reward = element.querySelector('.trophy-reward')?.textContent;
      return `Trophy: ${trophyName || 'Unknown'}. Reward: ${reward || 'Not specified'}.`;
    }

    if (element.classList.contains('leaderboard')) {
      const items = element.querySelectorAll('.leaderboard-item');
      return `Leaderboard with ${items.length} players. Use arrow keys to navigate.`;
    }

    return null;
  }

  setupMobileAccessibility() {
    // Enhanced touch target sizes
    this.enhanceTouchTargets();
    
    // Mobile-specific announcements
    this.setupMobileAnnouncements();
    
    // Gesture support
    this.setupGestureSupport();
  }

  enhanceTouchTargets() {
    const smallTargets = document.querySelectorAll('button, a, [role="button"]');
    smallTargets.forEach(target => {
      const rect = target.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        target.style.minWidth = '44px';
        target.style.minHeight = '44px';
        target.style.display = 'inline-flex';
        target.style.alignItems = 'center';
        target.style.justifyContent = 'center';
      }
    });
  }

  setupMobileAnnouncements() {
    // Announce orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        const orientation = window.orientation === 0 || window.orientation === 180 ? 'portrait' : 'landscape';
        this.announce(`Orientation changed to ${orientation}`);
      }, 500);
    });

    // Announce network status changes
    window.addEventListener('online', () => {
      this.announce('Connection restored', true);
    });

    window.addEventListener('offline', () => {
      this.announce('Connection lost', true);
    });
  }

  setupGestureSupport() {
    // Add swipe gesture support for accessible navigation
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          this.handleSwipeRight();
        } else {
          this.handleSwipeLeft();
        }
      }
    });
  }

  handleSwipeRight() {
    // Navigate back or to previous item
    const backButton = document.querySelector('[aria-label*="back"], [aria-label*="Back"]');
    if (backButton) {
      backButton.click();
      this.announce('Navigated back');
    }
  }

  handleSwipeLeft() {
    // Navigate forward or to next item
    const nextButton = document.querySelector('[aria-label*="next"], [aria-label*="Next"]');
    if (nextButton) {
      nextButton.click();
      this.announce('Navigated forward');
    }
  }

  setupColorContrastSupport() {
    // Monitor for high contrast mode
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handleContrastChange = (e) => {
      if (e.matches) {
        document.documentElement.classList.add('high-contrast');
        this.announce('High contrast mode enabled');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
    };

    highContrastQuery.addEventListener('change', handleContrastChange);
    handleContrastChange(highContrastQuery);
  }

  setupReducedMotionSupport() {
    // Monitor for reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleMotionChange = (e) => {
      if (e.matches) {
        document.documentElement.classList.add('reduced-motion');
        this.announce('Reduced motion enabled');
      } else {
        document.documentElement.classList.remove('reduced-motion');
      }
    };

    reducedMotionQuery.addEventListener('change', handleMotionChange);
    handleMotionChange(reducedMotionQuery);
  }
}

class RedditFocusManager {
  constructor() {
    this.focusHistory = [];
    this.setupFocusTracking();
  }

  setupFocusTracking() {
    document.addEventListener('focusin', (e) => {
      this.focusHistory.push(e.target);
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift();
      }
    });
  }

  restoreFocus() {
    const lastFocused = this.focusHistory[this.focusHistory.length - 2];
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
    }
  }

  moveFocusTo(element) {
    if (element && element.focus) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

class RedditKeyboardNavigation {
  constructor() {
    this.setupArrowNavigation();
    this.setupShortcuts();
  }

  setupArrowNavigation() {
    document.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        this.handleArrowNavigation(e);
      }
    });
  }

  handleArrowNavigation(e) {
    const focusedElement = document.activeElement;
    
    // Navigate within card grids
    if (focusedElement.classList.contains('reddit-card-interactive') || 
        focusedElement.classList.contains('game-card')) {
      this.navigateCardGrid(e);
      return;
    }

    // Navigate within lists
    if (focusedElement.closest('.leaderboard, .upcoming-list')) {
      this.navigateList(e);
      return;
    }

    // Navigate within button groups
    if (focusedElement.closest('.header-actions, .form-actions')) {
      this.navigateButtonGroup(e);
      return;
    }
  }

  navigateCardGrid(e) {
    const cards = Array.from(document.querySelectorAll('.reddit-card-interactive, .game-card'));
    const currentIndex = cards.indexOf(document.activeElement);
    
    if (currentIndex === -1) return;

    const cardsPerRow = this.getCardsPerRow();
    let nextIndex;

    switch (e.key) {
      case 'ArrowUp':
        nextIndex = currentIndex - cardsPerRow;
        break;
      case 'ArrowDown':
        nextIndex = currentIndex + cardsPerRow;
        break;
      case 'ArrowLeft':
        nextIndex = currentIndex - 1;
        break;
      case 'ArrowRight':
        nextIndex = currentIndex + 1;
        break;
    }

    if (nextIndex >= 0 && nextIndex < cards.length) {
      e.preventDefault();
      cards[nextIndex].focus();
    }
  }

  navigateList(e) {
    const listItems = Array.from(document.activeElement.closest('ul, ol, .leaderboard, .upcoming-list')
      .querySelectorAll('li, .leaderboard-item, .upcoming-item'));
    const currentIndex = listItems.findIndex(item => item.contains(document.activeElement));
    
    if (currentIndex === -1) return;

    let nextIndex;
    if (e.key === 'ArrowUp') {
      nextIndex = currentIndex - 1;
    } else if (e.key === 'ArrowDown') {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex >= 0 && nextIndex < listItems.length) {
      e.preventDefault();
      const focusable = listItems[nextIndex].querySelector('button, a, [tabindex="0"]') || listItems[nextIndex];
      focusable.focus();
    }
  }

  navigateButtonGroup(e) {
    const buttons = Array.from(document.activeElement.closest('.header-actions, .form-actions')
      .querySelectorAll('button, a, [role="button"]'));
    const currentIndex = buttons.indexOf(document.activeElement);
    
    if (currentIndex === -1) return;

    let nextIndex;
    if (e.key === 'ArrowLeft') {
      nextIndex = currentIndex - 1;
    } else if (e.key === 'ArrowRight') {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex >= 0 && nextIndex < buttons.length) {
      e.preventDefault();
      buttons[nextIndex].focus();
    }
  }

  getCardsPerRow() {
    const container = document.querySelector('.games-grid');
    if (!container) return 1;

    const containerWidth = container.offsetWidth;
    const cardWidth = 350; // Minimum card width
    return Math.floor(containerWidth / cardWidth) || 1;
  }

  setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Skip if user is typing in an input
      if (e.target.matches('input, textarea, [contenteditable]')) {
        return;
      }

      // Global shortcuts
      if (e.altKey || e.ctrlKey || e.metaKey) {
        this.handleGlobalShortcuts(e);
      }
    });
  }

  handleGlobalShortcuts(e) {
    // Alt + M: Go to main content
    if (e.altKey && e.key === 'm') {
      e.preventDefault();
      const main = document.querySelector('#main-content, main, .main-content');
      if (main) {
        main.focus();
        main.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // Alt + N: Go to navigation
    if (e.altKey && e.key === 'n') {
      e.preventDefault();
      const nav = document.querySelector('nav, .navigation, .header-actions');
      if (nav) {
        const firstFocusable = nav.querySelector('button, a, [tabindex="0"]');
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    }

    // Alt + S: Go to search (if exists)
    if (e.altKey && e.key === 's') {
      e.preventDefault();
      const search = document.querySelector('#search, [type="search"], .search-input');
      if (search) {
        search.focus();
      }
    }
  }
}

// Initialize accessibility when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.redditAccessibility = new RedditAccessibilityManager();
});

// Export for use in other modules
window.RedditAccessibilityManager = RedditAccessibilityManager;
window.RedditFocusManager = RedditFocusManager;
window.RedditKeyboardNavigation = RedditKeyboardNavigation;