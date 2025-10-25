import {
  InitResponse,
} from "../shared/types/api";

// Import Reddit integrations
import './reddit-theme-integration.js';
import './reddit-mobile-components.js';
import './reddit-web-optimization.js';
import './reddit-mobile-app-integration.js';
import './reddit-third-party-compatibility.js';

// Initialize Reddit-native theme system
function initializeRedditThemeSystem() {
  // The Reddit theme integration will handle theme management
  // This is just a fallback for basic functionality
  
  // Set initial theme based on system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', handleSystemThemeChange);
}

// Handle system theme changes (fallback)
function handleSystemThemeChange(e: MediaQueryListEvent) {
  const newTheme = e.matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  
  console.log(`Theme changed to: ${newTheme} (following Reddit system preference)`);
}

const titleElement = document.getElementById("title") as HTMLHeadingElement;

async function fetchInitialCount() {
  try {
    const response = await fetch("/api/init");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = (await response.json()) as InitResponse;
    if (data.type === "init") {
      titleElement.textContent = `🎯 PicTact - Welcome ${data.username}!`;
      
      // Load real game data
      await loadGameData();
      await loadUpcomingEvents();
      await loadLeaderboard();
    } else {
      console.error("Invalid response type from /api/init", data);
    }
  } catch (error) {
    console.error("Error fetching initial data:", error);
    titleElement.textContent = "🎯 PicTact";
    showEmptyStates();
  }
}

async function loadGameData() {
  try {
    // TODO: Replace with actual API endpoint when backend is ready
    const response = await fetch("/api/games/live");
    
    if (response.ok) {
      const games = await response.json();
      displayLiveGames(games);
    } else {
      // For now, show empty state since backend isn't fully connected
      showEmptyGamesState();
    }
  } catch (error) {
    console.error("Error loading games:", error);
    showEmptyGamesState();
  }
}

async function loadUpcomingEvents() {
  try {
    // TODO: Replace with actual API endpoint when backend is ready
    const response = await fetch("/api/events/upcoming");
    
    if (response.ok) {
      const events = await response.json();
      displayUpcomingEvents(events);
    } else {
      showEmptyUpcomingState();
    }
  } catch (error) {
    console.error("Error loading upcoming events:", error);
    showEmptyUpcomingState();
  }
}

async function loadLeaderboard() {
  try {
    // TODO: Replace with actual API endpoint when backend is ready
    const response = await fetch("/api/leaderboard");
    
    if (response.ok) {
      const leaderboard = await response.json();
      displayLeaderboard(leaderboard);
    } else {
      showEmptyLeaderboardState();
    }
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    showEmptyLeaderboardState();
  }
}

function displayLiveGames(games: any[]) {
  const gamesGrid = document.getElementById('gamesGrid');
  const gameCount = document.getElementById('gameCount');
  
  if (!gamesGrid || !gameCount) return;
  
  // Clear loading placeholder
  gamesGrid.innerHTML = '';
  
  if (games.length === 0) {
    showEmptyGamesState();
    return;
  }
  
  gameCount.textContent = games.length.toString();
  
  games.forEach(game => {
    const gameCard = createGameCard(game);
    gamesGrid.appendChild(gameCard);
  });
}

function displayUpcomingEvents(events: any[]) {
  const upcomingList = document.getElementById('upcomingList');
  if (!upcomingList) return;
  
  upcomingList.innerHTML = '';
  
  if (events.length === 0) {
    showEmptyUpcomingState();
    return;
  }
  
  events.forEach(event => {
    const eventItem = createUpcomingEventItem(event);
    upcomingList.appendChild(eventItem);
  });
}

function displayLeaderboard(leaderboard: any[]) {
  const leaderboardEl = document.getElementById('leaderboard');
  if (!leaderboardEl) return;
  
  leaderboardEl.innerHTML = '';
  
  if (leaderboard.length === 0) {
    showEmptyLeaderboardState();
    return;
  }
  
  leaderboard.forEach((player, index) => {
    const playerItem = createLeaderboardItem(player, index + 1);
    leaderboardEl.appendChild(playerItem);
  });
}

function showEmptyStates() {
  showEmptyGamesState();
  showEmptyUpcomingState();
  showEmptyLeaderboardState();
}

function showEmptyGamesState() {
  const gamesGrid = document.getElementById('gamesGrid');
  const noGamesMessage = document.getElementById('noGamesMessage');
  const gameCount = document.getElementById('gameCount');
  
  if (gamesGrid && noGamesMessage && gameCount) {
    gamesGrid.innerHTML = '';
    gamesGrid.appendChild(noGamesMessage);
    noGamesMessage.style.display = 'block';
    gameCount.textContent = '0';
  }
}

function showEmptyUpcomingState() {
  const upcomingList = document.getElementById('upcomingList');
  const noUpcomingMessage = document.getElementById('noUpcomingMessage');
  
  if (upcomingList && noUpcomingMessage) {
    upcomingList.innerHTML = '';
    upcomingList.appendChild(noUpcomingMessage);
    noUpcomingMessage.style.display = 'block';
  }
}

function showEmptyLeaderboardState() {
  const leaderboard = document.getElementById('leaderboard');
  const noLeaderboardMessage = document.getElementById('noLeaderboardMessage');
  
  if (leaderboard && noLeaderboardMessage) {
    leaderboard.innerHTML = '';
    leaderboard.appendChild(noLeaderboardMessage);
    noLeaderboardMessage.style.display = 'block';
  }
}

function createGameCard(game: any): HTMLElement {
  const card = document.createElement('div');
  card.className = 'game-card live-game reddit-card reddit-card-interactive';
  card.innerHTML = `
    <div class="game-header reddit-flex reddit-justify-between reddit-items-start">
      <div class="game-info reddit-flex-1">
        <h4 class="game-title reddit-text-title reddit-font-semibold">${game.title}</h4>
        <p class="game-creator reddit-text-metadata">by <span class="username reddit-text-primary reddit-font-medium">@${game.creator}</span></p>
      </div>
      <div class="game-status">
        <span class="reddit-badge reddit-badge-danger reddit-live-indicator">
          <span class="reddit-live-dot"></span>
          LIVE
        </span>
      </div>
    </div>
    
    <div class="game-stats reddit-flex reddit-gap-16 reddit-p-12 reddit-rounded-8" style="background-color: var(--reddit-canvas-secondary);">
      <div class="stat reddit-flex reddit-items-center reddit-gap-8">
        <span class="stat-icon">👥</span>
        <span class="stat-value reddit-text-body-strong">${game.playerCount} players</span>
      </div>
      <div class="stat reddit-flex reddit-items-center reddit-gap-8">
        <span class="stat-icon">⏰</span>
        <span class="stat-value reddit-text-body-strong">${game.timeRemaining}</span>
      </div>
      <div class="stat reddit-flex reddit-items-center reddit-gap-8">
        <span class="stat-icon">🏆</span>
        <span class="stat-value reddit-text-body-strong">${game.maxPoints} pts</span>
      </div>
    </div>
    
    <div class="current-challenge reddit-p-16 reddit-rounded-8 reddit-border" style="background-color: var(--reddit-canvas-tertiary);">
      <p class="challenge-label reddit-text-caption-strong reddit-text-secondary">Current Challenge:</p>
      <p class="challenge-text reddit-text-body reddit-font-medium" style="font-style: italic; margin-top: var(--reddit-space-8);">"${game.currentChallenge}"</p>
    </div>
    
    <button class="btn btn-primary btn-md game-join-btn reddit-focus-ring" style="width: 100%; justify-content: center;" onclick="joinGame('${game.id}')">🚀 Join Now</button>
  `;
  return card;
}

function createUpcomingEventItem(event: any): HTMLElement {
  const item = document.createElement('div');
  item.className = 'upcoming-item';
  item.innerHTML = `
    <div class="upcoming-time">
      <span class="time-value">${event.timeUntil}</span>
      <span class="time-label">from now</span>
    </div>
    <div class="upcoming-info">
      <h4 class="upcoming-title">${event.title}</h4>
      <p class="upcoming-creator">by @${event.creator} • Expected ${event.expectedPlayers}+ players</p>
    </div>
    <button class="btn btn-outline btn-sm" onclick="setReminder('${event.id}')">Set Reminder</button>
  `;
  return item;
}

function createLeaderboardItem(player: any, rank: number): HTMLElement {
  const item = document.createElement('div');
  const rankClass = rank <= 3 ? `rank-${rank}` : '';
  item.className = `leaderboard-item ${rankClass}`;
  
  let rankDisplay = '';
  if (rank === 1) rankDisplay = '<div class="rank-medal">🥇</div>';
  else if (rank === 2) rankDisplay = '<div class="rank-medal">🥈</div>';
  else if (rank === 3) rankDisplay = '<div class="rank-medal">🥉</div>';
  else rankDisplay = `<div class="rank-number">${rank}</div>`;
  
  item.innerHTML = `
    ${rankDisplay}
    <div class="user-info">
      <span class="username">@${player.username}</span>
      <span class="user-stats">${player.wins} wins • ${player.accuracy}% accuracy</span>
    </div>
    <div class="points">${player.points} pts</div>
  `;
  return item;
}

// Global functions for button clicks
(window as any).joinGame = function(gameId: string) {
  window.location.href = `event-game.html?id=${gameId}`;
};

(window as any).setReminder = function(eventId: string) {
  alert('Reminder set! You\'ll be notified when this event starts.');
};

// Initialize Reddit theme system first
initializeRedditThemeSystem();

// Then initialize app
fetchInitialCount();

// Add Reddit-native interactions
document.addEventListener('DOMContentLoaded', () => {
  // Add Reddit-style keyboard navigation
  setupRedditKeyboardNavigation();
  
  // Add Reddit-style loading states
  setupRedditLoadingStates();
});

function setupRedditKeyboardNavigation() {
  // Enhanced keyboard navigation for game cards
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const target = e.target as HTMLElement;
      if (target.classList.contains('reddit-card-interactive')) {
        e.preventDefault();
        target.click();
      }
    }
  });
}

function setupRedditLoadingStates() {
  // Show Reddit-style loading for async operations
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const loadingElements = document.querySelectorAll('.loading-placeholder');
    loadingElements.forEach(el => {
      (window as any).RedditLoadingManager?.showSkeleton(el);
    });
    
    try {
      const response = await originalFetch(...args);
      return response;
    } finally {
      // Hide loading states after a brief delay
      setTimeout(() => {
        loadingElements.forEach(el => {
          const skeleton = el.querySelector('.reddit-skeleton');
          if (skeleton) {
            (window as any).RedditLoadingManager?.hideSkeleton(skeleton);
          }
        });
      }, 300);
    }
  };
}
