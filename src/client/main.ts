import {
  InitResponse,
} from "../shared/types/api";

// Initialize theme system - now detects Reddit's system theme
function initializeThemeSystem() {
  // Remove any stored theme preference since we're using system theme
  localStorage.removeItem('pictact-theme');
  
  // Set initial theme based on system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', handleSystemThemeChange);
  
  // Create theme indicator (shows current theme, not a toggle)
  const themeIndicator = document.createElement('div');
  themeIndicator.className = 'theme-indicator';
  themeIndicator.setAttribute('title', 'Theme follows your Reddit app setting');
  
  updateThemeIndicator(themeIndicator);
  document.body.appendChild(themeIndicator);
}

// Handle system theme changes
function handleSystemThemeChange(e: MediaQueryListEvent) {
  const newTheme = e.matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  
  const indicator = document.querySelector('.theme-indicator') as HTMLElement;
  if (indicator) {
    updateThemeIndicator(indicator);
  }
  
  console.log(`Theme changed to: ${newTheme} (following system preference)`);
}

// Update theme indicator to show current theme
function updateThemeIndicator(indicator: HTMLElement) {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const isDark = currentTheme === 'dark';
  
  indicator.innerHTML = `
    <span class="theme-icon">${isDark ? '🌙' : '☀️'}</span>
    <span class="theme-text">${isDark ? 'Dark' : 'Light'}</span>
  `;
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
    } else {
      console.error("Invalid response type from /api/init", data);
    }
  } catch (error) {
    console.error("Error fetching initial data:", error);
    titleElement.textContent = "🎯 PicTact";
  }
}

// Initialize theme system first
initializeThemeSystem();

// Then initialize app
fetchInitialCount();
