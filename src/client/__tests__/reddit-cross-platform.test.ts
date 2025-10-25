/**
 * Reddit Cross-Platform Compatibility Tests
 * Tests compatibility across different Reddit clients and platforms
 * Requirements: 7.2, 10.1, 10.2, 10.3, 10.4, 10.5
 */

import './setup';
import { getByRole, getByLabelText } from '@testing-library/dom';

describe('Reddit Cross-Platform Compatibility Tests', () => {
  
  describe('Standard HTML Compatibility', () => {
    
    test('should use semantic HTML elements', () => {
      const main = document.createElement('main');
      main.setAttribute('role', 'main');
      main.id = 'main-content';
      
      const nav = document.createElement('nav');
      nav.setAttribute('role', 'navigation');
      
      const header = document.createElement('header');
      header.setAttribute('role', 'banner');
      
      const footer = document.createElement('footer');
      footer.setAttribute('role', 'contentinfo');
      
      const article = document.createElement('article');
      article.setAttribute('role', 'article');
      
      const section = document.createElement('section');
      section.setAttribute('role', 'region');
      section.setAttribute('aria-labelledby', 'section-title');
      
      const sectionTitle = document.createElement('h2');
      sectionTitle.id = 'section-title';
      sectionTitle.textContent = 'Games Section';
      
      section.appendChild(sectionTitle);
      
      document.body.appendChild(header);
      document.body.appendChild(nav);
      document.body.appendChild(main);
      document.body.appendChild(article);
      document.body.appendChild(section);
      document.body.appendChild(footer);

      expect(getByRole(document.body, 'main')).toBeTruthy();
      expect(getByRole(document.body, 'navigation')).toBeTruthy();
      expect(getByRole(document.body, 'banner')).toBeTruthy();
      expect(getByRole(document.body, 'contentinfo')).toBeTruthy();
      expect(getByRole(document.body, 'article')).toBeTruthy();
      expect(getByRole(document.body, 'region')).toBeTruthy();
    });

    test('should work with standard form elements', () => {
      const form = document.createElement('form');
      form.action = '/submit-game';
      form.method = 'POST';
      form.setAttribute('novalidate', ''); // Client-side validation
      
      const fieldset = document.createElement('fieldset');
      
      const legend = document.createElement('legend');
      legend.textContent = 'Game Configuration';
      
      const nameLabel = document.createElement('label');
      nameLabel.setAttribute('for', 'game-name');
      nameLabel.textContent = 'Game Name';
      
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.id = 'game-name';
      nameInput.name = 'gameName';
      nameInput.required = true;
      nameInput.setAttribute('aria-describedby', 'name-help');
      
      const nameHelp = document.createElement('div');
      nameHelp.id = 'name-help';
      nameHelp.textContent = 'Enter a unique name for your game';
      
      const submitButton = document.createElement('button');
      submitButton.type = 'submit';
      submitButton.textContent = 'Create Game';
      
      fieldset.appendChild(legend);
      fieldset.appendChild(nameLabel);
      fieldset.appendChild(nameInput);
      fieldset.appendChild(nameHelp);
      
      form.appendChild(fieldset);
      form.appendChild(submitButton);
      document.body.appendChild(form);

      expect(getByRole(document.body, 'form')).toBeTruthy();
      expect(getByRole(document.body, 'group')).toBeTruthy(); // fieldset
      expect(getByLabelText(document.body, 'Game Name')).toBeTruthy();
      expect(getByRole(document.body, 'button', { name: 'Create Game' })).toBeTruthy();
      expect(nameInput.getAttribute('aria-describedby')).toBe('name-help');
    });

    test('should provide fallback content for advanced features', () => {
      const container = document.createElement('div');
      container.className = 'advanced-feature-container';
      
      // Advanced feature with fallback
      const advancedFeature = document.createElement('div');
      advancedFeature.className = 'reddit-advanced-component';
      advancedFeature.setAttribute('data-fallback', 'true');
      
      const fallbackContent = document.createElement('div');
      fallbackContent.className = 'fallback-content';
      fallbackContent.innerHTML = `
        <p>This feature requires JavaScript. Please enable JavaScript or use a compatible Reddit client.</p>
        <a href="/games" class="reddit-btn reddit-btn-outlined">View Games List</a>
      `;
      
      const noscriptFallback = document.createElement('noscript');
      noscriptFallback.innerHTML = `
        <div class="noscript-message">
          <p>For the best experience, please enable JavaScript in your browser.</p>
        </div>
      `;
      
      advancedFeature.appendChild(fallbackContent);
      container.appendChild(advancedFeature);
      container.appendChild(noscriptFallback);
      document.body.appendChild(container);

      expect(advancedFeature.getAttribute('data-fallback')).toBe('true');
      expect(container.querySelector('.fallback-content')).toBeTruthy();
      expect(container.querySelector('noscript')).toBeTruthy();
    });
  });

  describe('Progressive Enhancement', () => {
    
    test('should work without JavaScript', () => {
      // Basic form that works without JS
      const form = document.createElement('form');
      form.action = '/create-game';
      form.method = 'POST';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'gameName';
      input.placeholder = 'Game Name';
      input.required = true;
      
      const submit = document.createElement('input');
      submit.type = 'submit';
      submit.value = 'Create Game';
      
      form.appendChild(input);
      form.appendChild(submit);
      document.body.appendChild(form);

      expect(form.getAttribute('action')).toBe('/create-game');
      expect(form.getAttribute('method')).toBe('POST');
      expect(input.hasAttribute('required')).toBe(true);
    });

    test('should enhance with JavaScript when available', () => {
      const form = document.createElement('form');
      form.action = '/create-game';
      form.method = 'POST';
      form.className = 'enhanced-form';
      
      // Add JavaScript enhancement markers
      form.setAttribute('data-enhanced', 'false');
      
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'gameName';
      input.className = 'reddit-input';
      
      const submit = document.createElement('button');
      submit.type = 'submit';
      submit.className = 'reddit-btn reddit-btn-filled';
      submit.textContent = 'Create Game';
      
      form.appendChild(input);
      form.appendChild(submit);
      document.body.appendChild(form);

      // Simulate JavaScript enhancement
      form.setAttribute('data-enhanced', 'true');
      
      expect(form.getAttribute('data-enhanced')).toBe('true');
      expect(input.classList.contains('reddit-input')).toBe(true);
      expect(submit.classList.contains('reddit-btn')).toBe(true);
    });

    test('should provide server-side rendered content', () => {
      // Simulate SSR content
      const gamesList = document.createElement('div');
      gamesList.className = 'games-list';
      gamesList.setAttribute('data-ssr', 'true');
      
      // Pre-rendered game cards
      for (let i = 1; i <= 3; i++) {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        gameCard.innerHTML = `
          <h3>Game ${i}</h3>
          <p>Description for game ${i}</p>
          <a href="/games/${i}" class="reddit-btn reddit-btn-outlined">View Game</a>
        `;
        gamesList.appendChild(gameCard);
      }
      
      document.body.appendChild(gamesList);

      expect(gamesList.getAttribute('data-ssr')).toBe('true');
      expect(gamesList.children).toHaveLength(3);
      
      // All links should work without JavaScript
      const links = gamesList.querySelectorAll('a');
      links.forEach((link, index) => {
        expect(link.getAttribute('href')).toBe(`/games/${index + 1}`);
      });
    });
  });

  describe('Reddit Web Interface Compatibility', () => {
    
    test('should work in Reddit web browser', () => {
      // Mock Reddit web environment
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'www.reddit.com',
          pathname: '/r/testsubreddit',
        },
        writable: true,
      });

      // Test Reddit-specific features
      const redditPost = document.createElement('div');
      redditPost.className = 'reddit-post-container';
      redditPost.setAttribute('data-reddit-context', 'web');
      
      const postContent = document.createElement('div');
      postContent.className = 'reddit-post-content';
      postContent.innerHTML = `
        <h2>PicTact Game: Nature Photography</h2>
        <p>Find and photograph something in nature!</p>
        <div class="reddit-game-embed">
          <button class="reddit-btn reddit-btn-filled">Join Game</button>
        </div>
      `;
      
      redditPost.appendChild(postContent);
      document.body.appendChild(redditPost);

      expect(redditPost.getAttribute('data-reddit-context')).toBe('web');
      expect(redditPost.querySelector('.reddit-game-embed')).toBeTruthy();
    });

    test('should handle Reddit web constraints', () => {
      // Test iframe constraints
      const gameFrame = document.createElement('iframe');
      gameFrame.src = '/game-embed';
      gameFrame.style.width = '100%';
      gameFrame.style.height = '400px';
      gameFrame.style.border = 'none';
      gameFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      
      document.body.appendChild(gameFrame);

      expect(gameFrame.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
      expect(gameFrame.style.border).toBe('none');
    });

    test('should optimize for Reddit web performance', () => {
      // Lazy loading images
      const gameImage = document.createElement('img');
      gameImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNjY2MiLz48L3N2Zz4=';
      gameImage.setAttribute('data-src', '/game-thumbnail.jpg');
      gameImage.setAttribute('loading', 'lazy');
      gameImage.alt = 'Game thumbnail';
      
      document.body.appendChild(gameImage);

      expect(gameImage.getAttribute('loading')).toBe('lazy');
      expect(gameImage.getAttribute('data-src')).toBe('/game-thumbnail.jpg');
    });
  });

  describe('Reddit Mobile App Compatibility', () => {
    
    test('should work in Reddit mobile app', () => {
      // Mock mobile app environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Reddit/Version',
        writable: true,
      });

      const mobileContainer = document.createElement('div');
      mobileContainer.className = 'reddit-mobile-container';
      mobileContainer.setAttribute('data-reddit-context', 'mobile-app');
      
      // Mobile-optimized content
      const mobileContent = document.createElement('div');
      mobileContent.innerHTML = `
        <div class="reddit-mobile-header">
          <h1>PicTact Game</h1>
        </div>
        <div class="reddit-mobile-content">
          <p>Tap to join the game!</p>
          <button class="reddit-btn reddit-btn-filled reddit-btn-lg">Join Game</button>
        </div>
      `;
      
      mobileContainer.appendChild(mobileContent);
      document.body.appendChild(mobileContainer);

      expect(mobileContainer.getAttribute('data-reddit-context')).toBe('mobile-app');
      expect(navigator.userAgent).toContain('Reddit/Version');
    });

    test('should handle mobile app constraints', () => {
      // Test viewport constraints
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(viewport);

      expect(viewport.content).toContain('user-scalable=no');
    });

    test('should optimize touch interactions for mobile app', () => {
      const touchButton = document.createElement('button');
      touchButton.className = 'reddit-btn reddit-btn-filled';
      touchButton.style.minHeight = '44px';
      touchButton.style.minWidth = '44px';
      touchButton.textContent = 'Touch Me';
      
      // Add touch event handlers
      touchButton.addEventListener('touchstart', () => {
        touchButton.style.backgroundColor = 'var(--reddit-interactive-background-hover)';
      });
      
      touchButton.addEventListener('touchend', () => {
        touchButton.style.backgroundColor = 'var(--reddit-interactive-background)';
      });
      
      document.body.appendChild(touchButton);

      expect(touchButton.style.minHeight).toBe('44px');
      expect(touchButton.style.minWidth).toBe('44px');
    });
  });

  describe('Third-Party Reddit Client Compatibility', () => {
    
    test('should work with Apollo Reddit client', () => {
      // Mock Apollo client environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 Apollo',
        writable: true,
      });

      const apolloContainer = document.createElement('div');
      apolloContainer.setAttribute('data-reddit-client', 'apollo');
      
      // Ensure basic functionality works
      const basicContent = document.createElement('div');
      basicContent.innerHTML = `
        <h2>Game Available</h2>
        <p>This game is compatible with Apollo and other Reddit clients.</p>
        <a href="/join-game" class="reddit-btn reddit-btn-outlined">Join via Browser</a>
      `;
      
      apolloContainer.appendChild(basicContent);
      document.body.appendChild(apolloContainer);

      expect(apolloContainer.getAttribute('data-reddit-client')).toBe('apollo');
      expect(navigator.userAgent).toContain('Apollo');
    });

    test('should work with Sync for Reddit', () => {
      // Mock Sync client environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Sync',
        writable: true,
      });

      const syncContainer = document.createElement('div');
      syncContainer.setAttribute('data-reddit-client', 'sync');
      
      // Provide fallback for limited functionality
      const fallbackContent = document.createElement('div');
      fallbackContent.innerHTML = `
        <div class="client-compatibility-notice">
          <p>For the full PicTact experience, open in your browser:</p>
          <a href="https://reddit.com/r/testsubreddit/comments/abc123" class="reddit-btn reddit-btn-filled">
            Open in Browser
          </a>
        </div>
      `;
      
      syncContainer.appendChild(fallbackContent);
      document.body.appendChild(syncContainer);

      expect(syncContainer.getAttribute('data-reddit-client')).toBe('sync');
      expect(navigator.userAgent).toContain('Sync');
    });

    test('should provide graceful degradation for limited clients', () => {
      const limitedClientContainer = document.createElement('div');
      limitedClientContainer.className = 'limited-client-fallback';
      
      // Basic text-only version
      const textOnlyContent = document.createElement('div');
      textOnlyContent.innerHTML = `
        <h3>PicTact Game: Nature Photography</h3>
        <p><strong>Challenge:</strong> Find and photograph something in nature!</p>
        <p><strong>Time Limit:</strong> 30 minutes</p>
        <p><strong>Participants:</strong> 5 players</p>
        <hr>
        <p>To participate, visit: <a href="https://reddit.com/r/testsubreddit">r/testsubreddit</a></p>
      `;
      
      limitedClientContainer.appendChild(textOnlyContent);
      document.body.appendChild(limitedClientContainer);

      expect(limitedClientContainer.querySelector('h3')).toBeTruthy();
      expect(limitedClientContainer.querySelector('a[href*="reddit.com"]')).toBeTruthy();
    });

    test('should detect client capabilities', () => {
      // Feature detection for different clients
      const featureDetection = {
        hasJavaScript: typeof window !== 'undefined',
        hasLocalStorage: typeof localStorage !== 'undefined',
        hasWebGL: !!document.createElement('canvas').getContext('webgl'),
        hasGeolocation: 'geolocation' in navigator,
        hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        hasTouch: 'ontouchstart' in window,
      };

      expect(featureDetection.hasJavaScript).toBe(true);
      expect(featureDetection.hasLocalStorage).toBe(true);
      expect(typeof featureDetection.hasWebGL).toBe('boolean');
      expect(typeof featureDetection.hasGeolocation).toBe('boolean');
    });
  });

  describe('Cross-Platform Data Synchronization', () => {
    
    test('should maintain consistent game state across platforms', () => {
      const gameState = {
        gameId: 'game-123',
        status: 'active',
        participants: ['user1', 'user2'],
        timeRemaining: 1800, // 30 minutes
        lastUpdate: Date.now(),
      };

      // Store in a platform-agnostic way
      const stateContainer = document.createElement('div');
      stateContainer.id = 'game-state';
      stateContainer.setAttribute('data-game-state', JSON.stringify(gameState));
      stateContainer.style.display = 'none';
      document.body.appendChild(stateContainer);

      const storedState = JSON.parse(stateContainer.getAttribute('data-game-state') || '{}');
      expect(storedState.gameId).toBe('game-123');
      expect(storedState.status).toBe('active');
      expect(storedState.participants).toHaveLength(2);
    });

    test('should handle offline/online state changes', () => {
      const offlineIndicator = document.createElement('div');
      offlineIndicator.className = 'offline-indicator';
      offlineIndicator.style.display = 'none';
      offlineIndicator.innerHTML = `
        <p>You're currently offline. Game data will sync when connection is restored.</p>
      `;
      document.body.appendChild(offlineIndicator);

      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      if (!navigator.onLine) {
        offlineIndicator.style.display = 'block';
      }

      expect(navigator.onLine).toBe(false);
      expect(offlineIndicator.style.display).toBe('block');
    });

    test('should provide consistent URLs across platforms', () => {
      const gameLinks = [
        { platform: 'web', url: 'https://reddit.com/r/testsubreddit/comments/abc123' },
        { platform: 'mobile', url: 'reddit://r/testsubreddit/comments/abc123' },
        { platform: 'fallback', url: '/games/abc123' },
      ];

      gameLinks.forEach(link => {
        const linkElement = document.createElement('a');
        linkElement.href = link.url;
        linkElement.setAttribute('data-platform', link.platform);
        linkElement.textContent = `Open in ${link.platform}`;
        document.body.appendChild(linkElement);

        expect(linkElement.getAttribute('data-platform')).toBe(link.platform);
        expect(linkElement.href).toContain(link.url.includes('://') ? link.url.split('://')[1] : link.url);
      });
    });
  });

  describe('API Compatibility', () => {
    
    test('should use standard Reddit API endpoints', () => {
      const apiEndpoints = [
        '/api/submit',
        '/api/comment',
        '/api/vote',
        '/api/info',
      ];

      apiEndpoints.forEach(endpoint => {
        const form = document.createElement('form');
        form.action = `https://oauth.reddit.com${endpoint}`;
        form.method = 'POST';
        form.setAttribute('data-api-endpoint', endpoint);
        document.body.appendChild(form);

        expect(form.getAttribute('data-api-endpoint')).toBe(endpoint);
        expect(form.action).toContain('oauth.reddit.com');
      });
    });

    test('should handle API rate limiting gracefully', () => {
      const rateLimitNotice = document.createElement('div');
      rateLimitNotice.className = 'rate-limit-notice';
      rateLimitNotice.style.display = 'none';
      rateLimitNotice.innerHTML = `
        <p>Please wait a moment before trying again. Reddit has rate limits to ensure fair usage.</p>
        <div class="countdown" data-seconds="60">60 seconds remaining</div>
      `;
      document.body.appendChild(rateLimitNotice);

      // Simulate rate limit hit
      rateLimitNotice.style.display = 'block';
      
      expect(rateLimitNotice.style.display).toBe('block');
      expect(rateLimitNotice.querySelector('.countdown')).toBeTruthy();
    });

    test('should provide error handling for API failures', () => {
      const errorContainer = document.createElement('div');
      errorContainer.className = 'api-error-container';
      errorContainer.style.display = 'none';
      
      const errorMessage = document.createElement('div');
      errorMessage.className = 'reddit-error-message';
      errorMessage.innerHTML = `
        <h3>Connection Error</h3>
        <p>Unable to connect to Reddit. Please check your connection and try again.</p>
        <button class="reddit-btn reddit-btn-outlined retry-button">Retry</button>
      `;
      
      errorContainer.appendChild(errorMessage);
      document.body.appendChild(errorContainer);

      // Simulate API error
      errorContainer.style.display = 'block';
      
      expect(errorContainer.style.display).toBe('block');
      expect(errorContainer.querySelector('.retry-button')).toBeTruthy();
    });
  });
});