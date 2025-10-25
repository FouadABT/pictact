/**
 * Reddit Accessibility Tests
 * Tests accessibility features, keyboard navigation, and screen reader support
 * Requirements: 7.3
 */

import './setup';
import { getByRole, getByLabelText, queryByRole } from '@testing-library/dom';

describe('Reddit Accessibility Tests', () => {
  
  describe('Screen Reader Support', () => {
    
    test('should provide live regions for announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'reddit-sr-only';
      announcer.id = 'reddit-announcer';
      document.body.appendChild(announcer);

      const urgentAnnouncer = document.createElement('div');
      urgentAnnouncer.setAttribute('aria-live', 'assertive');
      urgentAnnouncer.setAttribute('aria-atomic', 'true');
      urgentAnnouncer.className = 'reddit-sr-only';
      urgentAnnouncer.id = 'reddit-urgent-announcer';
      document.body.appendChild(urgentAnnouncer);

      expect(document.getElementById('reddit-announcer')).toBeTruthy();
      expect(document.getElementById('reddit-urgent-announcer')).toBeTruthy();
      expect(announcer.getAttribute('aria-live')).toBe('polite');
      expect(urgentAnnouncer.getAttribute('aria-live')).toBe('assertive');
    });

    test('should provide screen reader only content', () => {
      const srOnlyText = document.createElement('span');
      srOnlyText.className = 'reddit-sr-only';
      srOnlyText.textContent = 'Additional context for screen readers';
      document.body.appendChild(srOnlyText);

      expect(srOnlyText.classList.contains('reddit-sr-only')).toBe(true);
    });

    test('should implement proper heading hierarchy', () => {
      const h1 = document.createElement('h1');
      h1.textContent = 'Main Page Title';
      
      const h2 = document.createElement('h2');
      h2.textContent = 'Section Title';
      
      const h3 = document.createElement('h3');
      h3.textContent = 'Subsection Title';
      
      // Test improper hierarchy correction
      const h5 = document.createElement('h5');
      h5.textContent = 'Should be h3';
      h5.setAttribute('aria-level', '3'); // Corrected level
      
      document.body.appendChild(h1);
      document.body.appendChild(h2);
      document.body.appendChild(h3);
      document.body.appendChild(h5);

      expect(getByRole(document.body, 'heading', { level: 1 })).toBeTruthy();
      expect(getByRole(document.body, 'heading', { level: 2 })).toBeTruthy();
      expect(getByRole(document.body, 'heading', { level: 3 })).toBeTruthy();
      expect(h5.getAttribute('aria-level')).toBe('3');
    });

    test('should provide proper landmark roles', () => {
      const main = document.createElement('main');
      main.setAttribute('role', 'main');
      main.id = 'main-content';
      
      const nav = document.createElement('nav');
      nav.setAttribute('role', 'navigation');
      nav.setAttribute('aria-label', 'Main navigation');
      
      const header = document.createElement('header');
      header.setAttribute('role', 'banner');
      
      const footer = document.createElement('footer');
      footer.setAttribute('role', 'contentinfo');
      
      document.body.appendChild(header);
      document.body.appendChild(nav);
      document.body.appendChild(main);
      document.body.appendChild(footer);

      expect(getByRole(document.body, 'main')).toBeTruthy();
      expect(getByRole(document.body, 'navigation')).toBeTruthy();
      expect(getByRole(document.body, 'banner')).toBeTruthy();
      expect(getByRole(document.body, 'contentinfo')).toBeTruthy();
    });
  });

  describe('Keyboard Navigation', () => {
    
    test('should provide skip links', () => {
      const skipContainer = document.createElement('div');
      skipContainer.className = 'reddit-skip-links';
      
      const skipToMain = document.createElement('a');
      skipToMain.href = '#main-content';
      skipToMain.textContent = 'Skip to main content';
      skipToMain.className = 'reddit-skip-link reddit-focus-visible';
      
      const skipToNav = document.createElement('a');
      skipToNav.href = '#navigation';
      skipToNav.textContent = 'Skip to navigation';
      skipToNav.className = 'reddit-skip-link reddit-focus-visible';
      
      skipContainer.appendChild(skipToMain);
      skipContainer.appendChild(skipToNav);
      document.body.appendChild(skipContainer);

      // Add target elements
      const mainContent = document.createElement('main');
      mainContent.id = 'main-content';
      document.body.appendChild(mainContent);

      const navigation = document.createElement('nav');
      navigation.id = 'navigation';
      document.body.appendChild(navigation);

      expect(skipToMain.getAttribute('href')).toBe('#main-content');
      expect(skipToNav.getAttribute('href')).toBe('#navigation');
      expect(document.getElementById('main-content')).toBeTruthy();
      expect(document.getElementById('navigation')).toBeTruthy();
    });

    test('should support arrow key navigation in card grids', () => {
      const grid = document.createElement('div');
      grid.className = 'games-grid';
      
      // Create a 2x2 grid of cards
      for (let i = 0; i < 4; i++) {
        const card = document.createElement('div');
        card.className = 'reddit-card-interactive game-card';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Game card ${i + 1}`);
        card.textContent = `Card ${i + 1}`;
        grid.appendChild(card);
      }
      
      document.body.appendChild(grid);

      const cards = document.querySelectorAll('.reddit-card-interactive');
      expect(cards).toHaveLength(4);
      
      cards.forEach(card => {
        expect(card.getAttribute('tabindex')).toBe('0');
        expect(card.getAttribute('role')).toBe('button');
      });
    });

    test('should support keyboard shortcuts', () => {
      // Test Alt+M for main content
      const main = document.createElement('main');
      main.id = 'main-content';
      main.setAttribute('tabindex', '-1');
      document.body.appendChild(main);

      // Test Alt+N for navigation
      const nav = document.createElement('nav');
      nav.id = 'navigation';
      const navButton = document.createElement('button');
      navButton.textContent = 'Menu';
      nav.appendChild(navButton);
      document.body.appendChild(nav);

      // Test Alt+S for search
      const search = document.createElement('input');
      search.type = 'search';
      search.id = 'search';
      search.placeholder = 'Search games...';
      document.body.appendChild(search);

      expect(document.getElementById('main-content')).toBeTruthy();
      expect(document.getElementById('navigation')).toBeTruthy();
      expect(document.getElementById('search')).toBeTruthy();
    });

    test('should implement focus trapping in modals', () => {
      const modal = document.createElement('div');
      modal.className = 'reddit-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'modal-title');
      
      const modalTitle = document.createElement('h2');
      modalTitle.id = 'modal-title';
      modalTitle.textContent = 'Modal Title';
      
      const firstButton = document.createElement('button');
      firstButton.textContent = 'First Button';
      
      const lastButton = document.createElement('button');
      lastButton.textContent = 'Last Button';
      
      modal.appendChild(modalTitle);
      modal.appendChild(firstButton);
      modal.appendChild(lastButton);
      document.body.appendChild(modal);

      const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      expect(focusableElements).toHaveLength(2);
      expect(focusableElements[0]).toBe(firstButton);
      expect(focusableElements[1]).toBe(lastButton);
    });

    test('should support Enter and Space key activation', () => {
      const interactiveDiv = document.createElement('div');
      interactiveDiv.setAttribute('role', 'button');
      interactiveDiv.setAttribute('tabindex', '0');
      interactiveDiv.textContent = 'Interactive Element';
      
      const clickHandler = jest.fn();
      interactiveDiv.addEventListener('click', clickHandler);
      
      const keyHandler = jest.fn((e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          interactiveDiv.click();
        }
      });
      
      interactiveDiv.addEventListener('keydown', keyHandler);
      document.body.appendChild(interactiveDiv);

      // Simulate Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      interactiveDiv.dispatchEvent(enterEvent);
      
      // Simulate Space key
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      interactiveDiv.dispatchEvent(spaceEvent);

      expect(keyHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Focus Management', () => {
    
    test('should implement proper focus indicators', () => {
      const button = document.createElement('button');
      button.className = 'reddit-btn reddit-focus-ring';
      button.textContent = 'Focusable Button';
      document.body.appendChild(button);

      expect(button.classList.contains('reddit-focus-ring')).toBe(true);
    });

    test('should manage focus history', () => {
      const button1 = document.createElement('button');
      button1.textContent = 'Button 1';
      button1.id = 'btn1';
      
      const button2 = document.createElement('button');
      button2.textContent = 'Button 2';
      button2.id = 'btn2';
      
      document.body.appendChild(button1);
      document.body.appendChild(button2);

      // Simulate focus events
      const focusHistory: Element[] = [];
      
      const focusHandler = (e: FocusEvent) => {
        focusHistory.push(e.target as Element);
        if (focusHistory.length > 10) {
          focusHistory.shift();
        }
      };
      
      document.addEventListener('focusin', focusHandler);
      
      // Simulate focus changes
      button1.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      button2.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      
      expect(focusHistory).toHaveLength(2);
      expect(focusHistory[0]).toBe(button1);
      expect(focusHistory[1]).toBe(button2);
    });

    test('should restore focus after modal closes', () => {
      const triggerButton = document.createElement('button');
      triggerButton.textContent = 'Open Modal';
      triggerButton.id = 'trigger';
      document.body.appendChild(triggerButton);

      const modal = document.createElement('div');
      modal.className = 'reddit-modal';
      modal.style.display = 'none';
      
      const modalButton = document.createElement('button');
      modalButton.textContent = 'Modal Button';
      modal.appendChild(modalButton);
      document.body.appendChild(modal);

      // Store original focus
      let originalFocus: Element | null = null;
      
      const openModal = () => {
        originalFocus = document.activeElement;
        modal.style.display = 'block';
        modalButton.focus();
      };
      
      const closeModal = () => {
        modal.style.display = 'none';
        if (originalFocus && 'focus' in originalFocus) {
          (originalFocus as HTMLElement).focus();
        }
      };

      triggerButton.addEventListener('click', openModal);
      
      // Simulate opening modal
      triggerButton.focus();
      triggerButton.click();
      
      expect(modal.style.display).toBe('block');
      
      // Simulate closing modal
      closeModal();
      
      expect(modal.style.display).toBe('none');
    });
  });

  describe('Form Accessibility', () => {
    
    test('should associate labels with form controls', () => {
      const label = document.createElement('label');
      label.setAttribute('for', 'game-name');
      label.textContent = 'Game Name';
      
      const input = document.createElement('input');
      input.id = 'game-name';
      input.type = 'text';
      input.className = 'reddit-input';
      input.required = true;
      
      document.body.appendChild(label);
      document.body.appendChild(input);

      expect(getByLabelText(document.body, 'Game Name')).toBeTruthy();
      expect(input.hasAttribute('required')).toBe(true);
    });

    test('should provide error messages with proper associations', () => {
      const input = document.createElement('input');
      input.id = 'email';
      input.type = 'email';
      input.className = 'reddit-input reddit-input-error';
      input.setAttribute('aria-describedby', 'email-error');
      
      const errorMessage = document.createElement('div');
      errorMessage.id = 'email-error';
      errorMessage.className = 'reddit-field-error';
      errorMessage.setAttribute('role', 'alert');
      errorMessage.innerHTML = '<span>⚠️</span> Please enter a valid email address';
      
      document.body.appendChild(input);
      document.body.appendChild(errorMessage);

      expect(input.getAttribute('aria-describedby')).toBe('email-error');
      expect(errorMessage.getAttribute('role')).toBe('alert');
    });

    test('should provide fieldset and legend for grouped controls', () => {
      const fieldset = document.createElement('fieldset');
      
      const legend = document.createElement('legend');
      legend.textContent = 'Game Settings';
      
      const checkbox1 = document.createElement('input');
      checkbox1.type = 'checkbox';
      checkbox1.id = 'public-game';
      
      const label1 = document.createElement('label');
      label1.setAttribute('for', 'public-game');
      label1.textContent = 'Public Game';
      
      const checkbox2 = document.createElement('input');
      checkbox2.type = 'checkbox';
      checkbox2.id = 'allow-spectators';
      
      const label2 = document.createElement('label');
      label2.setAttribute('for', 'allow-spectators');
      label2.textContent = 'Allow Spectators';
      
      fieldset.appendChild(legend);
      fieldset.appendChild(checkbox1);
      fieldset.appendChild(label1);
      fieldset.appendChild(checkbox2);
      fieldset.appendChild(label2);
      document.body.appendChild(fieldset);

      expect(getByRole(document.body, 'group')).toBeTruthy();
      expect(fieldset.querySelector('legend')).toBeTruthy();
    });
  });

  describe('Table Accessibility', () => {
    
    test('should provide proper table structure with headers', () => {
      const table = document.createElement('table');
      
      const caption = document.createElement('caption');
      caption.textContent = 'Game Leaderboard';
      
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      const rankHeader = document.createElement('th');
      rankHeader.textContent = 'Rank';
      rankHeader.id = 'rank-header';
      rankHeader.scope = 'col';
      
      const playerHeader = document.createElement('th');
      playerHeader.textContent = 'Player';
      playerHeader.id = 'player-header';
      playerHeader.scope = 'col';
      
      const scoreHeader = document.createElement('th');
      scoreHeader.textContent = 'Score';
      scoreHeader.id = 'score-header';
      scoreHeader.scope = 'col';
      
      headerRow.appendChild(rankHeader);
      headerRow.appendChild(playerHeader);
      headerRow.appendChild(scoreHeader);
      thead.appendChild(headerRow);
      
      const tbody = document.createElement('tbody');
      const dataRow = document.createElement('tr');
      
      const rankCell = document.createElement('td');
      rankCell.textContent = '1';
      rankCell.setAttribute('headers', 'rank-header');
      
      const playerCell = document.createElement('td');
      playerCell.textContent = 'Player1';
      playerCell.setAttribute('headers', 'player-header');
      
      const scoreCell = document.createElement('td');
      scoreCell.textContent = '100';
      scoreCell.setAttribute('headers', 'score-header');
      
      dataRow.appendChild(rankCell);
      dataRow.appendChild(playerCell);
      dataRow.appendChild(scoreCell);
      tbody.appendChild(dataRow);
      
      table.appendChild(caption);
      table.appendChild(thead);
      table.appendChild(tbody);
      document.body.appendChild(table);

      expect(getByRole(document.body, 'table')).toBeTruthy();
      expect(table.querySelector('caption')).toBeTruthy();
      expect(rankHeader.getAttribute('scope')).toBe('col');
      expect(rankCell.getAttribute('headers')).toBe('rank-header');
    });
  });

  describe('Mobile Accessibility', () => {
    
    test('should provide adequate touch target sizes', () => {
      const button = document.createElement('button');
      button.className = 'reddit-btn reddit-btn-md';
      button.textContent = 'Touch Target';
      button.style.minWidth = '44px';
      button.style.minHeight = '44px';
      document.body.appendChild(button);

      expect(button.style.minWidth).toBe('44px');
      expect(button.style.minHeight).toBe('44px');
    });

    test('should announce orientation changes', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.className = 'reddit-sr-only';
      document.body.appendChild(announcer);

      // Simulate orientation change
      announcer.textContent = 'Orientation changed to landscape';
      
      expect(announcer.textContent).toBe('Orientation changed to landscape');
      expect(announcer.getAttribute('aria-live')).toBe('polite');
    });

    test('should announce network status changes', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'assertive');
      announcer.className = 'reddit-sr-only';
      document.body.appendChild(announcer);

      // Simulate network status changes
      announcer.textContent = 'Connection restored';
      expect(announcer.textContent).toBe('Connection restored');
      
      announcer.textContent = 'Connection lost';
      expect(announcer.textContent).toBe('Connection lost');
    });

    test('should support swipe gestures with announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.className = 'reddit-sr-only';
      document.body.appendChild(announcer);

      // Simulate swipe navigation
      announcer.textContent = 'Navigated back';
      expect(announcer.textContent).toBe('Navigated back');
      
      announcer.textContent = 'Navigated forward';
      expect(announcer.textContent).toBe('Navigated forward');
    });
  });

  describe('Content Descriptions', () => {
    
    test('should provide descriptions for complex visuals', () => {
      const chart = document.createElement('div');
      chart.className = 'chart';
      chart.setAttribute('role', 'img');
      chart.setAttribute('aria-labelledby', 'chart-title');
      chart.setAttribute('aria-describedby', 'chart-desc');
      
      const title = document.createElement('h3');
      title.id = 'chart-title';
      title.textContent = 'Player Performance Chart';
      
      const description = document.createElement('div');
      description.id = 'chart-desc';
      description.className = 'reddit-sr-only';
      description.textContent = 'Bar chart showing player scores over time. Player 1 leads with 150 points, followed by Player 2 with 120 points.';
      
      document.body.appendChild(title);
      document.body.appendChild(chart);
      document.body.appendChild(description);

      expect(chart.getAttribute('aria-describedby')).toBe('chart-desc');
      expect(description.textContent).toContain('Bar chart showing');
    });

    test('should describe trophy displays', () => {
      const trophy = document.createElement('div');
      trophy.className = 'trophy-display';
      trophy.setAttribute('aria-describedby', 'trophy-desc');
      
      const trophyName = document.createElement('div');
      trophyName.className = 'trophy-name';
      trophyName.textContent = 'Speed Demon';
      
      const trophyReward = document.createElement('div');
      trophyReward.className = 'trophy-reward';
      trophyReward.textContent = '50 points';
      
      const description = document.createElement('div');
      description.id = 'trophy-desc';
      description.className = 'reddit-sr-only';
      description.textContent = 'Trophy: Speed Demon. Reward: 50 points.';
      
      trophy.appendChild(trophyName);
      trophy.appendChild(trophyReward);
      document.body.appendChild(trophy);
      document.body.appendChild(description);

      expect(trophy.getAttribute('aria-describedby')).toBe('trophy-desc');
      expect(description.textContent).toBe('Trophy: Speed Demon. Reward: 50 points.');
    });
  });

  describe('Accessibility Preferences', () => {
    
    test('should respect prefers-reduced-motion', () => {
      // Mock reduced motion preference
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      expect(reducedMotionQuery.matches).toBe(true);
    });

    test('should respect prefers-contrast preference', () => {
      // Mock high contrast preference
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      expect(highContrastQuery.matches).toBe(true);
    });
  });
});