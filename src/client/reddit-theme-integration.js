/**
 * Reddit Design System Theme Integration
 * Handles theme switching, accessibility, and Reddit-native interactions
 */

class RedditThemeManager {
  constructor() {
    this.currentTheme = this.getSystemTheme();
    this.themeToggle = null;
    this.init();
  }

  init() {
    this.setupThemeToggle();
    this.setupSystemThemeListener();
    this.setupAccessibilityFeatures();
    this.setupRedditInteractions();
    this.applyTheme(this.currentTheme);
  }

  getSystemTheme() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('reddit-theme');
    if (savedTheme) {
      return savedTheme;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  setupThemeToggle() {
    this.themeToggle = document.getElementById('themeToggle');
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });

      // Update toggle icon based on current theme
      this.updateThemeToggleIcon();
    }
  }

  setupSystemThemeListener() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        // Only auto-switch if user hasn't manually set a preference
        if (!localStorage.getItem('reddit-theme')) {
          this.currentTheme = e.matches ? 'dark' : 'light';
          this.applyTheme(this.currentTheme);
          this.updateThemeToggleIcon();
        }
      });
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(this.currentTheme);
    this.updateThemeToggleIcon();
    
    // Save user preference
    localStorage.setItem('reddit-theme', this.currentTheme);

    // Announce theme change for screen readers
    this.announceThemeChange();
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update meta theme-color for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.content = theme === 'dark' ? '#1A1A1B' : '#FF4500';
    }

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('reddit-theme-changed', {
      detail: { theme }
    }));
  }

  updateThemeToggleIcon() {
    if (this.themeToggle) {
      const icon = this.themeToggle.querySelector('.theme-icon');
      if (icon) {
        icon.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
      }
      
      // Update aria-label
      this.themeToggle.setAttribute('aria-label', 
        `Switch to ${this.currentTheme === 'light' ? 'dark' : 'light'} theme`
      );
    }
  }

  announceThemeChange() {
    // Create a live region announcement for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'reddit-sr-only';
    announcement.textContent = `Switched to ${this.currentTheme} theme`;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  setupAccessibilityFeatures() {
    // Enhanced focus management
    this.setupFocusManagement();
    
    // Keyboard navigation
    this.setupKeyboardNavigation();
    
    // Reduced motion support
    this.setupReducedMotion();
  }

  setupFocusManagement() {
    // Add focus-visible polyfill behavior
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });

    // Skip to main content link
    this.addSkipLink();
  }

  addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'reddit-sr-only reddit-focus-ring';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: var(--reddit-interactive-background);
      color: var(--reddit-interactive-content);
      padding: 8px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 1000;
      transition: top 0.2s ease;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);

    // Add id to main content if it doesn't exist
    const mainContent = document.querySelector('main, .main-content, #main-content');
    if (mainContent && !mainContent.id) {
      mainContent.id = 'main-content';
    }
  }

  setupKeyboardNavigation() {
    // Enhanced keyboard navigation for interactive elements
    document.addEventListener('keydown', (e) => {
      // Escape key handling
      if (e.key === 'Escape') {
        this.handleEscapeKey(e);
      }

      // Arrow key navigation for card grids
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        this.handleArrowNavigation(e);
      }
    });
  }

  handleEscapeKey(e) {
    // Close any open modals, dropdowns, etc.
    const activeElement = document.activeElement;
    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }
  }

  handleArro
wNavigation(e) {
    const focusableCards = document.querySelectorAll('.reddit-card-interactive, .game-card');
    const currentIndex = Array.from(focusableCards).indexOf(document.activeElement);
    
    if (currentIndex === -1) return;

    let nextIndex;
    const cardsPerRow = this.getCardsPerRow();

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

    if (nextIndex >= 0 && nextIndex < focusableCards.length) {
      e.preventDefault();
      focusableCards[nextIndex].focus();
    }
  }

  getCardsPerRow() {
    const container = document.querySelector('.games-grid');
    if (!container) return 1;

    const containerWidth = container.offsetWidth;
    const cardWidth = 350; // Minimum card width from CSS
    return Math.floor(containerWidth / cardWidth) || 1;
  }

  setupReducedMotion() {
    // Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches) {
      document.documentElement.classList.add('reduced-motion');
    }

    prefersReducedMotion.addEventListener('change', (e) => {
      if (e.matches) {
        document.documentElement.classList.add('reduced-motion');
      } else {
        document.documentElement.classList.remove('reduced-motion');
      }
    });
  }

  setupRedditInteractions() {
    // Reddit-style voting buttons
    this.setupVotingButtons();
    
    // Reddit-style live indicators
    this.setupLiveIndicators();
    
    // Reddit-style comment threading
    this.setupCommentThreading();
  }

  setupVotingButtons() {
    document.addEventListener('click', (e) => {
      if (e.target.matches('.reddit-vote-button')) {
        this.handleVote(e.target);
      }
    });
  }

  handleVote(button) {
    const isUpvote = button.classList.contains('upvote');
    const isDownvote = button.classList.contains('downvote');
    const isActive = button.classList.contains('upvoted') || button.classList.contains('downvoted');

    // Remove existing vote states
    const container = button.closest('.vote-container');
    if (container) {
      container.querySelectorAll('.reddit-vote-button').forEach(btn => {
        btn.classList.remove('upvoted', 'downvoted');
      });
    }

    // Apply new vote state if not removing existing vote
    if (!isActive) {
      if (isUpvote) {
        button.classList.add('upvoted');
      } else if (isDownvote) {
        button.classList.add('downvoted');
      }
    }

    // Animate button
    button.style.transform = 'scale(0.9)';
    setTimeout(() => {
      button.style.transform = '';
    }, 150);

    // Announce vote for screen readers
    const voteType = isUpvote ? 'upvoted' : 'downvoted';
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'reddit-sr-only';
    announcement.textContent = isActive ? 'Vote removed' : `Content ${voteType}`;
    
    document.body.appendChild(announcement);
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  setupLiveIndicators() {
    // Animate live indicators
    const liveIndicators = document.querySelectorAll('.reddit-live-indicator');
    liveIndicators.forEach(indicator => {
      // Add pulsing animation
      const dot = indicator.querySelector('.reddit-live-dot');
      if (dot) {
        dot.style.animation = 'reddit-pulse 2s infinite';
      }
    });
  }

  setupCommentThreading() {
    // Add Reddit-style comment threading
    const comments = document.querySelectorAll('.comment-thread');
    comments.forEach((comment, index) => {
      const depth = this.getCommentDepth(comment);
      comment.classList.add(`reddit-comment-thread`, `depth-${Math.min(depth, 5)}`);
    });
  }

  getCommentDepth(element) {
    let depth = 0;
    let parent = element.parentElement;
    
    while (parent) {
      if (parent.classList.contains('comment-thread')) {
        depth++;
      }
      parent = parent.parentElement;
    }
    
    return depth;
  }
}

// Reddit-style notification system
class RedditNotificationManager {
  constructor() {
    this.notifications = [];
    this.container = null;
    this.init();
  }

  init() {
    this.createContainer();
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'reddit-notification-container';
    this.container.style.cssText = `
      position: fixed;
      top: var(--reddit-space-16);
      right: var(--reddit-space-16);
      z-index: var(--reddit-z-tooltip);
      display: flex;
      flex-direction: column;
      gap: var(--reddit-space-8);
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 4000) {
    const notification = document.createElement('div');
    notification.className = `reddit-notification reddit-notification-${type}`;
    notification.style.cssText = `
      padding: var(--reddit-space-12) var(--reddit-space-16);
      border-radius: var(--reddit-radius-8);
      color: white;
      font-size: 14px;
      font-weight: 500;
      max-width: 400px;
      box-shadow: var(--reddit-shadow-lg);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
    `;

    // Set background color based on type
    const colors = {
      success: 'var(--reddit-success)',
      error: 'var(--reddit-danger)',
      warning: 'var(--reddit-warning)',
      info: 'var(--reddit-info)'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');

    this.container.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // Auto-dismiss
    const timeoutId = setTimeout(() => {
      this.dismiss(notification);
    }, duration);

    // Click to dismiss
    notification.addEventListener('click', () => {
      clearTimeout(timeoutId);
      this.dismiss(notification);
    });

    this.notifications.push({ element: notification, timeoutId });
  }

  dismiss(notification) {
    notification.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      
      // Remove from tracking array
      this.notifications = this.notifications.filter(n => n.element !== notification);
    }, 300);
  }

  dismissAll() {
    this.notifications.forEach(({ element, timeoutId }) => {
      clearTimeout(timeoutId);
      this.dismiss(element);
    });
  }
}

// Reddit-style loading states
class RedditLoadingManager {
  static showSkeleton(container) {
    const skeleton = document.createElement('div');
    skeleton.className = 'reddit-skeleton';
    skeleton.style.cssText = `
      background: linear-gradient(90deg, 
        var(--reddit-canvas-tertiary) 25%, 
        var(--reddit-neutral-background-hover) 50%, 
        var(--reddit-canvas-tertiary) 75%);
      background-size: 200% 100%;
      animation: reddit-skeleton-loading 1.5s infinite;
      border-radius: var(--reddit-radius-4);
      height: 20px;
      margin: var(--reddit-space-4) 0;
    `;

    // Add skeleton animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes reddit-skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);

    container.appendChild(skeleton);
    return skeleton;
  }

  static hideSkeleton(skeleton) {
    if (skeleton && skeleton.parentNode) {
      skeleton.parentNode.removeChild(skeleton);
    }
  }
}

// Initialize Reddit theme integration when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme manager
  window.redditTheme = new RedditThemeManager();
  
  // Initialize notification manager
  window.redditNotifications = new RedditNotificationManager();
  
  // Add Reddit-style interactions to existing elements
  enhanceExistingElements();
  
  // Setup Reddit-style form validation
  setupRedditFormValidation();
});

function enhanceExistingElements() {
  // Add Reddit classes to existing buttons
  document.querySelectorAll('.btn').forEach(btn => {
    btn.classList.add('reddit-focus-ring');
  });

  // Add Reddit classes to existing cards
  document.querySelectorAll('.game-card').forEach(card => {
    card.classList.add('reddit-card');
    if (card.querySelector('a') || card.onclick) {
      card.classList.add('reddit-card-interactive');
    }
  });

  // Add Reddit classes to existing inputs
  document.querySelectorAll('input, textarea, select').forEach(input => {
    input.classList.add('reddit-input', 'reddit-focus-ring');
  });

  // Enhance accessibility
  enhanceAccessibility();
}

function enhanceAccessibility() {
  // Add proper ARIA labels to interactive elements
  document.querySelectorAll('.game-card').forEach((card, index) => {
    if (!card.getAttribute('aria-label')) {
      const title = card.querySelector('.game-title')?.textContent;
      if (title) {
        card.setAttribute('aria-label', `Game: ${title}`);
      }
    }
    
    // Make cards focusable if they're interactive
    if (card.classList.contains('reddit-card-interactive') && !card.hasAttribute('tabindex')) {
      card.setAttribute('tabindex', '0');
    }
  });

  // Add proper headings hierarchy
  document.querySelectorAll('.section-title').forEach(title => {
    if (title.tagName !== 'H2' && title.tagName !== 'H3') {
      title.setAttribute('role', 'heading');
      title.setAttribute('aria-level', '2');
    }
  });
}

function setupRedditFormValidation() {
  // Reddit-style form validation
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
      const isValid = validateRedditForm(form);
      if (!isValid) {
        e.preventDefault();
        window.redditNotifications.show('Please fix the errors in the form', 'error');
      }
    });
  });

  // Real-time validation
  document.querySelectorAll('.reddit-input').forEach(input => {
    input.addEventListener('blur', () => {
      validateRedditField(input);
    });
  });
}

function validateRedditForm(form) {
  let isValid = true;
  const fields = form.querySelectorAll('.reddit-input[required]');
  
  fields.forEach(field => {
    if (!validateRedditField(field)) {
      isValid = false;
    }
  });
  
  return isValid;
}

function validateRedditField(field) {
  const value = field.value.trim();
  const isRequired = field.hasAttribute('required');
  let isValid = true;
  let errorMessage = '';

  // Remove existing error state
  field.classList.remove('reddit-input-error');
  const existingError = field.parentNode.querySelector('.reddit-field-error');
  if (existingError) {
    existingError.remove();
  }

  // Required field validation
  if (isRequired && !value) {
    isValid = false;
    errorMessage = 'This field is required';
  }

  // Email validation
  if (field.type === 'email' && value && !isValidEmail(value)) {
    isValid = false;
    errorMessage = 'Please enter a valid email address';
  }

  // Show error if invalid
  if (!isValid) {
    field.classList.add('reddit-input-error');
    showFieldError(field, errorMessage);
  }

  return isValid;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showFieldError(field, message) {
  const error = document.createElement('div');
  error.className = 'reddit-field-error';
  error.style.cssText = `
    color: var(--reddit-danger);
    font-size: 12px;
    margin-top: var(--reddit-space-4);
    display: flex;
    align-items: center;
    gap: var(--reddit-space-4);
  `;
  error.innerHTML = `<span>⚠️</span> ${message}`;
  
  field.parentNode.appendChild(error);
}

// Export for use in other modules
window.RedditThemeManager = RedditThemeManager;
window.RedditNotificationManager = RedditNotificationManager;
window.RedditLoadingManager = RedditLoadingManager;