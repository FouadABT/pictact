# PicTact Tech Stack

## Platform & Framework
- **Reddit Devvit**: Primary platform for Reddit app development
- **TypeScript**: Primary language across client and server
- **Vite**: Build tool for both client and server bundles
- **Express.js**: Server-side API framework

## Architecture
- **Client-Server Split**: Separate client and server builds with shared types
- **Multi-page Client**: Multiple HTML entry points (main, create-event, event-details, event-game)
- **SSR Server**: Node.js server with CommonJS output for Devvit compatibility
- **Shared Types**: Common TypeScript interfaces between client and server

## Build System
- **Development**: `npm run dev` - Concurrent client/server watch + Devvit playtest
- **Build**: `npm run build` - Builds both client and server to dist/
- **Deploy**: `npm run deploy` - Build and upload to Devvit
- **Launch**: `npm run launch` - Build, deploy, and publish

## Key Dependencies
- **@devvit/web**: Reddit's web framework for Devvit apps
- **devvit**: Core Devvit SDK
- **express**: Server framework
- **concurrently**: Run multiple dev processes
- **dotenv-cli**: Environment variable management

## Development Commands
```bash
# Start development environment
npm run dev

# Build for production
npm run build

# Deploy to Reddit
npm run deploy

# Type checking
npm run type-check

# Login to Devvit
npm run login
```

## Project Configuration
- **TypeScript**: Strict mode enabled with composite builds
- **Module System**: ESM with bundler resolution
- **Target**: ES2022 for modern browser support
- **Build Output**: Client to dist/client, server to dist/server