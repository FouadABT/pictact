# PicTact Project Structure

## Root Directory
```
pictact/
├── src/                    # Source code
├── dist/                   # Build output
├── tools/                  # Build configuration
├── .kiro/                  # Kiro AI configuration
├── node_modules/           # Dependencies
└── package.json            # Project configuration
```

## Source Code Organization

### Client (`src/client/`)
- **Multi-page application** with separate HTML entry points
- **Main pages**: index.html, create-event.html, event-details.html, event-game.html
- **TypeScript files**: Corresponding .ts/.js files for each page
- **Styling**: Centralized style.css with design system
- **Build config**: vite.config.ts, tsconfig.json

### Server (`src/server/`)
- **Express.js API** with Devvit integration
- **Core logic**: Business logic in core/ subdirectory
- **Entry point**: index.ts with API routes
- **Build config**: vite.config.ts for SSR build, tsconfig.json

### Shared (`src/shared/`)
- **Type definitions**: API interfaces and shared types
- **Cross-platform code**: Utilities used by both client and server
- **Build config**: tsconfig.json for shared compilation

## Key Configuration Files
- **devvit.json**: Devvit app configuration and menu items
- **tsconfig.json**: Root TypeScript project references
- **tools/tsconfig-base.json**: Shared TypeScript configuration
- **package.json**: Dependencies and build scripts

## Build Output Structure
```
dist/
├── client/                 # Client-side assets
│   ├── index.html
│   ├── *.js files
│   └── *.css files
├── server/                 # Server bundle
│   └── index.cjs
└── types/                  # TypeScript declarations
    ├── client/
    ├── server/
    └── shared/
```

## Development Patterns
- **Monorepo structure** with TypeScript project references
- **Shared types** prevent client-server interface drift
- **Incremental builds** via TypeScript composite projects
- **Hot reloading** in development via Vite watch mode