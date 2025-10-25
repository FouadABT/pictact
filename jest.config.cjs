/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      roots: ['<rootDir>/src/server'],
      testMatch: [
        '<rootDir>/src/server/**/__tests__/**/*.ts',
        '<rootDir>/src/server/**/?(*.)+(spec|test).ts'
      ],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      setupFilesAfterEnv: ['<rootDir>/src/server/__tests__/setup.ts'],
      transformIgnorePatterns: [
        'node_modules/(?!(@devvit/.*)/)'
      ]
    },
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src/client'],
      testMatch: [
        '<rootDir>/src/client/**/__tests__/**/*.ts',
        '<rootDir>/src/client/**/?(*.)+(spec|test).ts'
      ],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      setupFiles: ['<rootDir>/src/client/__tests__/jest-setup.ts']
    }
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.config.ts'
  ]
};