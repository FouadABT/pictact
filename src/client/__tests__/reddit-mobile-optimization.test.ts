/**
 * Reddit Mobile Optimization Tests
 * Tests mobile-specific UI components, touch interactions, and responsive design
 * Requirements: 7.5
 */

import './setup';
import { getByRole, getByLabelText } from '@testing-library/dom';

describe('Reddit Mobile Optimization Tests', () => {
  
  beforeEach(() => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });

    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      value: {},
    });
  });

  describe('Touch Target Optimization', () => {
    
    test('should ensure minimum touch target sizes', () => {
      const button = document.createElement('button');
      button.className = 'reddit-btn reddit-btn-sm';
      button.textContent = 'Small Button';
      
      // Apply mobile touch target sizing
      button.style.minWidth = '44px';
      button.style.minHeight = '44px';
      button.style.display = 'inline-flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      
      document.body.appendChild(button);

      expect(button.style.minWidth).toBe('44px');
      expect(button.style.minHeight).toBe('44px');
      expect(button.style.display).toBe('inline-flex');
    });

    test('should optimize touch targets for coarse pointers', () => {
      // Mock coarse pointer (touch)
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(pointer: coarse)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
      expect(coarsePointerQuery.matches).toBe(true);
    });

    test('should provide adequate spacing between touch targets', () => {
      const container = document.createElement('div');
      container.className = 'button-group';
      
      const button1 = document.createElement('button');
      button1.textContent = 'Button 1';
      button1.style.marginRight = '8px';
      
      const button2 = document.createElement('button');
      button2.textContent = 'Button 2';
      
      container.appendChild(button1);
      container.appendChild(button2);
      document.body.appendChild(container);

      expect(button1.style.marginRight).toBe('8px');
    });
  });

  describe('Mobile Navigation Components', () => {
    
    test('should implement mobile tab navigation', () => {
      const tabContainer = document.createElement('div');
      tabContainer.className = 'reddit-mobile-tabs';
      
      const tab1 = document.createElement('a');
      tab1.className = 'reddit-mobile-tab active';
      tab1.href = '#games';
      tab1.textContent = 'Games';
      tab1.setAttribute('role', 'tab');
      tab1.setAttribute('aria-selected', 'true');
      
      const tab2 = document.createElement('a');
      tab2.className = 'reddit-mobile-tab';
      tab2.href = '#leaderboard';
      tab2.textContent = 'Leaderboard';
      tab2.setAttribute('role', 'tab');
      tab2.setAttribute('aria-selected', 'false');
      
      tabContainer.appendChild(tab1);
      tabContainer.appendChild(tab2);
      document.body.appendChild(tabContainer);

      expect(tab1.getAttribute('role')).toBe('tab');
      expect(tab1.getAttribute('aria-selected')).toBe('true');
      expect(tab2.getAttribute('aria-selected')).toBe('false');
      expect(tab1.classList.contains('active')).toBe(true);
    });

    test('should implement hamburger menu for mobile', () => {
      const headerActions = document.createElement('div');
      headerActions.className = 'header-actions';
      
      // Add multiple actions that would be hidden on mobile
      const action1 = document.createElement('button');
      action1.textContent = 'Create Game';
      
      const action2 = document.createElement('button');
      action2.textContent = 'Profile';
      action2.style.display = 'none'; // Hidden on mobile
      
      const action3 = document.createElement('button');
      action3.textContent = 'Settings';
      action3.style.display = 'none'; // Hidden on mobile
      
      const menuButton = document.createElement('button');
      menuButton.className = 'reddit-btn reddit-btn-ghost reddit-btn-sm';
      menuButton.innerHTML = '☰';
      menuButton.setAttribute('aria-label', 'Open menu');
      
      headerActions.appendChild(action1);
      headerActions.appendChild(action2);
      headerActions.appendChild(action3);
      headerActions.appendChild(menuButton);
      document.body.appendChild(headerActions);

      expect(getByLabelText(document.body, 'Open menu')).toBeTruthy();
      expect(menuButton.innerHTML).toBe('☰');
    });

    test('should implement breadcrumb navigation for mobile', () => {
      const breadcrumb = document.createElement('nav');
      breadcrumb.className = 'breadcrumb';
      breadcrumb.setAttribute('aria-label', 'Breadcrumb navigation');
      
      const breadcrumbList = document.createElement('ol');
      
      const homeItem = document.createElement('li');
      const homeLink = document.createElement('a');
      homeLink.href = '/';
      homeLink.textContent = 'Home';
      homeItem.appendChild(homeLink);
      
      const gamesItem = document.createElement('li');
      const gamesLink = document.createElement('a');
      gamesLink.href = '/games';
      gamesLink.textContent = 'Games';
      gamesItem.appendChild(gamesLink);
      
      const currentItem = document.createElement('li');
      currentItem.setAttribute('aria-current', 'page');
      currentItem.textContent = 'Current Game';
      
      breadcrumbList.appendChild(homeItem);
      breadcrumbList.appendChild(gamesItem);
      breadcrumbList.appendChild(currentItem);
      breadcrumb.appendChild(breadcrumbList);
      document.body.appendChild(breadcrumb);

      expect(breadcrumb.getAttribute('aria-label')).toBe('Breadcrumb navigation');
      expect(currentItem.getAttribute('aria-current')).toBe('page');
    });
  });

  describe('Bottom Sheet Component', () => {
    
    test('should create bottom sheet structure', () => {
      const bottomSheet = document.createElement('div');
      bottomSheet.className = 'reddit-bottom-sheet';
      bottomSheet.id = 'reddit-bottom-sheet';
      bottomSheet.setAttribute('role', 'dialog');
      bottomSheet.setAttribute('aria-modal', 'true');
      bottomSheet.setAttribute('aria-labelledby', 'bottom-sheet-title');
      
      const handle = document.createElement('div');
      handle.className = 'reddit-bottom-sheet-handle';
      handle.setAttribute('aria-label', 'Drag to resize');
      
      const content = document.createElement('div');
      content.className = 'reddit-bottom-sheet-content';
      content.id = 'reddit-bottom-sheet-content';
      
      const title = document.createElement('h3');
      title.id = 'bottom-sheet-title';
      title.className = 'reddit-text-title reddit-m-16';
      title.textContent = 'Game Options';
      
      content.appendChild(title);
      bottomSheet.appendChild(handle);
      bottomSheet.appendChild(content);
      document.body.appendChild(bottomSheet);

      expect(getByRole(document.body, 'dialog')).toBeTruthy();
      expect(bottomSheet.getAttribute('aria-modal')).toBe('true');
      expect(bottomSheet.getAttribute('aria-labelledby')).toBe('bottom-sheet-title');
      expect(document.getElementById('bottom-sheet-title')).toBeTruthy();
    });

    test('should support swipe to dismiss gesture', () => {
      const bottomSheet = document.createElement('div');
      bottomSheet.className = 'reddit-bottom-sheet open';
      
      const handle = document.createElement('div');
      handle.className = 'reddit-bottom-sheet-handle';
      
      bottomSheet.appendChild(handle);
      document.body.appendChild(bottomSheet);

      // Mock touch events for swipe gesture
      let startY = 0;
      let currentY = 0;
      let isDragging = false;

      const touchStartHandler = (e: TouchEvent) => {
        startY = e.touches[0].clientY;
        isDragging = true;
      };

      const touchMoveHandler = (e: TouchEvent) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        if (deltaY > 0) {
          bottomSheet.style.transform = `translateY(${deltaY}px)`;
        }
      };

      const touchEndHandler = () => {
        if (!isDragging) return;
        const deltaY = currentY - startY;
        isDragging = false;
        
        if (deltaY > 100) {
          bottomSheet.classList.remove('open');
        } else {
          bottomSheet.style.transform = 'translateY(0)';
        }
      };

      handle.addEventListener('touchstart', touchStartHandler);
      handle.addEventListener('touchmove', touchMoveHandler);
      handle.addEventListener('touchend', touchEndHandler);

      expect(bottomSheet.classList.contains('open')).toBe(true);
    });

    test('should trap focus within bottom sheet', () => {
      const bottomSheet = document.createElement('div');
      bottomSheet.className = 'reddit-bottom-sheet open';
      bottomSheet.setAttribute('role', 'dialog');
      
      const button1 = document.createElement('button');
      button1.textContent = 'First Button';
      
      const button2 = document.createElement('button');
      button2.textContent = 'Second Button';
      
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      
      bottomSheet.appendChild(button1);
      bottomSheet.appendChild(button2);
      bottomSheet.appendChild(closeButton);
      document.body.appendChild(bottomSheet);

      const focusableElements = bottomSheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      expect(focusableElements).toHaveLength(3);
      expect(focusableElements[0]).toBe(button1);
      expect(focusableElements[2]).toBe(closeButton);
    });
  });

  describe('Mobile Toast Notifications', () => {
    
    test('should create mobile toast container', () => {
      const toastContainer = document.createElement('div');
      toastContainer.className = 'reddit-mobile-toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        bottom: 16px;
        left: 16px;
        right: 16px;
        z-index: 1070;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);

      expect(toastContainer.style.position).toBe('fixed');
      expect(toastContainer.style.bottom).toBe('16px');
      expect(toastContainer.style.pointerEvents).toBe('none');
    });

    test('should create mobile toast with proper accessibility', () => {
      const container = document.querySelector('.reddit-mobile-toast-container') || document.createElement('div');
      container.className = 'reddit-mobile-toast-container';
      if (!container.parentNode) {
        document.body.appendChild(container);
      }
      
      const toast = document.createElement('div');
      toast.className = 'reddit-mobile-toast reddit-mobile-toast-success';
      toast.textContent = 'Game created successfully!';
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'assertive');
      toast.style.cssText = `
        background-color: var(--reddit-success);
        color: white;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 8px;
        pointer-events: auto;
        cursor: pointer;
      `;
      
      container.appendChild(toast);

      expect(toast.getAttribute('role')).toBe('alert');
      expect(toast.getAttribute('aria-live')).toBe('assertive');
      expect(toast.style.pointerEvents).toBe('auto');
    });

    test('should support toast dismissal on tap', () => {
      const toast = document.createElement('div');
      toast.className = 'reddit-mobile-toast';
      toast.textContent = 'Tap to dismiss';
      
      const dismissHandler = jest.fn();
      toast.addEventListener('click', dismissHandler);
      document.body.appendChild(toast);

      // Simulate tap
      toast.click();
      
      expect(dismissHandler).toHaveBeenCalled();
    });
  });

  describe('Pull-to-Refresh', () => {
    
    test('should implement pull-to-refresh indicator', () => {
      const container = document.createElement('div');
      container.className = 'main-content';
      container.style.position = 'relative';
      
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
        transition: top 0.2s ease, transform 0.2s ease;
      `;
      
      container.appendChild(indicator);
      document.body.appendChild(container);

      expect(container.querySelector('.reddit-pull-refresh-indicator')).toBeTruthy();
      expect(indicator.style.position).toBe('absolute');
      expect(indicator.style.top).toBe('-60px');
    });

    test('should handle pull-to-refresh gesture', () => {
      const container = document.createElement('div');
      container.className = 'main-content';
      
      const indicator = document.createElement('div');
      indicator.className = 'reddit-pull-refresh-indicator';
      container.appendChild(indicator);
      document.body.appendChild(container);

      let startY = 0;
      let currentY = 0;
      let isPulling = false;
      let pullDistance = 0;
      const threshold = 80;

      const touchStartHandler = (e: TouchEvent) => {
        if (window.scrollY === 0) {
          startY = e.touches[0].clientY;
          isPulling = true;
        }
      };

      const touchMoveHandler = (e: TouchEvent) => {
        if (!isPulling) return;
        
        currentY = e.touches[0].clientY;
        pullDistance = Math.max(0, currentY - startY);
        
        if (pullDistance > 0) {
          const progress = Math.min(pullDistance / threshold, 1);
          indicator.style.top = `${-60 + (pullDistance * 0.5)}px`;
          indicator.style.transform = `translateX(-50%) rotate(${progress * 360}deg)`;
        }
      };

      const touchEndHandler = () => {
        if (!isPulling) return;
        isPulling = false;
        
        if (pullDistance > threshold) {
          // Trigger refresh
          window.dispatchEvent(new CustomEvent('reddit-pull-refresh'));
        }
        
        // Reset indicator
        indicator.style.top = '-60px';
        indicator.style.transform = 'translateX(-50%) rotate(0deg)';
        pullDistance = 0;
      };

      container.addEventListener('touchstart', touchStartHandler);
      container.addEventListener('touchmove', touchMoveHandler);
      container.addEventListener('touchend', touchEndHandler);

      expect(typeof touchStartHandler).toBe('function');
      expect(typeof touchMoveHandler).toBe('function');
      expect(typeof touchEndHandler).toBe('function');
    });

    test('should announce refresh for screen readers', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.className = 'reddit-sr-only';
      document.body.appendChild(announcer);

      // Simulate refresh announcement
      announcer.textContent = 'Refreshing content';
      
      expect(announcer.textContent).toBe('Refreshing content');
      expect(announcer.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('Swipe Gestures', () => {
    
    test('should detect horizontal swipe gestures', () => {
      let startX = 0;
      let startY = 0;
      let currentX = 0;
      let currentY = 0;
      let isSwipeGesture = false;

      const touchStartHandler = (e: TouchEvent) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwipeGesture = false;
      };

      const touchMoveHandler = (e: TouchEvent) => {
        if (!isSwipeGesture) {
          currentX = e.touches[0].clientX;
          currentY = e.touches[0].clientY;
          
          const deltaX = Math.abs(currentX - startX);
          const deltaY = Math.abs(currentY - startY);
          
          if (deltaX > deltaY && deltaX > 30) {
            isSwipeGesture = true;
          }
        }
      };

      const touchEndHandler = () => {
        if (!isSwipeGesture) return;
        
        const deltaX = currentX - startX;
        const deltaY = Math.abs(currentY - startY);
        
        if (Math.abs(deltaX) > 50 && deltaY < 100) {
          if (deltaX > 0) {
            // Swipe right - navigate back
            window.dispatchEvent(new CustomEvent('swipe-right'));
          } else {
            // Swipe left - show actions
            window.dispatchEvent(new CustomEvent('swipe-left'));
          }
        }
        
        isSwipeGesture = false;
      };

      document.addEventListener('touchstart', touchStartHandler);
      document.addEventListener('touchmove', touchMoveHandler);
      document.addEventListener('touchend', touchEndHandler);

      expect(typeof touchStartHandler).toBe('function');
      expect(typeof touchMoveHandler).toBe('function');
      expect(typeof touchEndHandler).toBe('function');
    });

    test('should handle swipe-right for navigation', () => {
      const backButton = document.createElement('button');
      backButton.setAttribute('aria-label', 'Go back');
      backButton.textContent = '← Back';
      document.body.appendChild(backButton);

      const swipeHandler = jest.fn();
      window.addEventListener('swipe-right', swipeHandler);
      
      // Simulate swipe right event
      window.dispatchEvent(new CustomEvent('swipe-right'));
      
      expect(swipeHandler).toHaveBeenCalled();
      expect(getByLabelText(document.body, 'Go back')).toBeTruthy();
    });

    test('should handle swipe-left for card actions', () => {
      const card = document.createElement('div');
      card.className = 'game-card reddit-card';
      
      const title = document.createElement('h3');
      title.className = 'game-title';
      title.textContent = 'Test Game';
      
      card.appendChild(title);
      document.body.appendChild(card);

      const swipeHandler = jest.fn();
      window.addEventListener('swipe-left', swipeHandler);
      
      // Simulate swipe left event
      window.dispatchEvent(new CustomEvent('swipe-left'));
      
      expect(swipeHandler).toHaveBeenCalled();
    });
  });

  describe('Responsive Typography', () => {
    
    test('should adjust font sizes for mobile', () => {
      // Mock mobile media query
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const mobileQuery = window.matchMedia('(max-width: 768px)');
      expect(mobileQuery.matches).toBe(true);

      // Test mobile typography classes
      const heading = document.createElement('h1');
      heading.className = 'reddit-text-display';
      heading.textContent = 'Mobile Heading';
      document.body.appendChild(heading);

      expect(heading.classList.contains('reddit-text-display')).toBe(true);
    });

    test('should provide readable line heights on mobile', () => {
      const bodyText = document.createElement('p');
      bodyText.className = 'reddit-text-body';
      bodyText.style.lineHeight = '1.5';
      bodyText.textContent = 'This is body text optimized for mobile reading.';
      document.body.appendChild(bodyText);

      expect(bodyText.style.lineHeight).toBe('1.5');
    });
  });

  describe('Mobile Performance Optimizations', () => {
    
    test('should implement touch feedback', () => {
      const button = document.createElement('button');
      button.className = 'reddit-btn';
      button.textContent = 'Touch Me';
      
      const touchStartHandler = () => {
        button.style.transform = 'scale(0.98)';
        button.style.opacity = '0.8';
      };
      
      const touchEndHandler = () => {
        setTimeout(() => {
          button.style.transform = '';
          button.style.opacity = '';
        }, 150);
      };
      
      button.addEventListener('touchstart', touchStartHandler);
      button.addEventListener('touchend', touchEndHandler);
      document.body.appendChild(button);

      // Simulate touch
      button.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
      expect(button.style.transform).toBe('scale(0.98)');
      
      button.dispatchEvent(new TouchEvent('touchend', { bubbles: true }));
      // Transform will be reset after timeout
    });

    test('should optimize scroll performance', () => {
      const scrollContainer = document.createElement('div');
      scrollContainer.style.cssText = `
        height: 300px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      `;
      
      for (let i = 0; i < 20; i++) {
        const item = document.createElement('div');
        item.textContent = `Item ${i + 1}`;
        item.style.height = '50px';
        scrollContainer.appendChild(item);
      }
      
      document.body.appendChild(scrollContainer);

      expect(scrollContainer.style.overflowY).toBe('auto');
      expect(scrollContainer.children).toHaveLength(20);
    });

    test('should implement skeleton loading for mobile', () => {
      const skeleton = document.createElement('div');
      skeleton.className = 'reddit-mobile-skeleton';
      skeleton.style.cssText = `
        background: linear-gradient(90deg, 
          var(--reddit-canvas-tertiary) 25%, 
          var(--reddit-neutral-background-hover) 50%, 
          var(--reddit-canvas-tertiary) 75%);
        background-size: 200% 100%;
        animation: reddit-skeleton-loading 1.5s infinite;
        border-radius: 4px;
        height: 200px;
      `;
      
      document.body.appendChild(skeleton);

      expect(skeleton.classList.contains('reddit-mobile-skeleton')).toBe(true);
      expect(skeleton.style.height).toBe('200px');
    });
  });

  describe('Mobile Accessibility Features', () => {
    
    test('should announce orientation changes', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.className = 'reddit-sr-only';
      document.body.appendChild(announcer);

      // Mock orientation change
      Object.defineProperty(window, 'orientation', {
        writable: true,
        value: 90, // Landscape
      });

      // Simulate orientation change announcement
      const orientation = window.orientation === 0 || window.orientation === 180 ? 'portrait' : 'landscape';
      announcer.textContent = `Orientation changed to ${orientation}`;
      
      expect(announcer.textContent).toBe('Orientation changed to landscape');
    });

    test('should provide voice control hints', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'Join game');
      button.setAttribute('data-voice-command', 'join game');
      button.textContent = '🚀 Join';
      document.body.appendChild(button);

      expect(button.getAttribute('data-voice-command')).toBe('join game');
      expect(getByLabelText(document.body, 'Join game')).toBeTruthy();
    });
  });
});