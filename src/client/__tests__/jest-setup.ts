// Jest setup for client tests
import '@testing-library/jest-dom';

// Mock global objects that are not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock getComputedStyle
global.getComputedStyle = jest.fn().mockImplementation(() => ({
  getPropertyValue: jest.fn().mockReturnValue(''),
}));

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn().mockImplementation(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn().mockImplementation(id => clearTimeout(id));