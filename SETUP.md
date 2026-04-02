# Project Setup Guide

This document describes the initial project structure for PulseParty Rooms.

## What Has Been Created

### Root Level Configuration

- **package.json** - Monorepo workspace configuration with shared dev dependencies
- **tsconfig.json** - Root TypeScript configuration (referenced by backend/frontend)
- **.eslintrc.json** - ESLint configuration for code quality
- **.prettierrc.json** - Prettier configuration for code formatting
- **.gitignore** - Git ignore patterns for the entire project
- **README.md** - Project documentation

### Backend (`backend/`)

#### Configuration Files
- **package.json** - Backend dependencies (AWS SDK, fast-check, Jest)
- **tsconfig.json** - TypeScript configuration targeting Node.js/Lambda
- **jest.config.js** - Jest test configuration with 80% coverage threshold
- **.gitignore** - Backend-specific ignore patterns

#### Source Structure
- **src/index.ts** - Entry point placeholder
- **src/types/index.ts** - Shared TypeScript type definitions for:
  - MatchEvent
  - Room
  - PredictionWindow
  - UserScore
  - WrappedRecap
  - RoomRecap

#### Key Dependencies
- `@aws-sdk/client-dynamodb` - DynamoDB operations
- `@aws-sdk/client-eventbridge` - Event routing
- `@aws-sdk/client-apigatewaymanagementapi` - WebSocket broadcasting
- `fast-xml-parser` - XML event parsing
- `nanoid` - Unique ID generation
- `fast-check` - Property-based testing
- `jest` + `ts-jest` - Unit testing

### Frontend (`frontend/`)

#### Configuration Files
- **package.json** - Frontend dependencies (React, Vite, TailwindCSS, Zustand)
- **tsconfig.json** - TypeScript configuration for React
- **tsconfig.node.json** - TypeScript configuration for Vite config
- **vite.config.ts** - Vite build configuration with PWA plugin
- **vitest.config.ts** - Vitest test configuration with 70% coverage threshold
- **tailwind.config.js** - TailwindCSS theme configuration
- **postcss.config.js** - PostCSS configuration for TailwindCSS
- **.eslintrc.json** - Frontend-specific ESLint rules
- **.gitignore** - Frontend-specific ignore patterns
- **index.html** - HTML entry point

#### Source Structure
- **src/main.tsx** - React application entry point
- **src/App.tsx** - Root React component
- **src/index.css** - Global styles with TailwindCSS imports
- **src/i18n.ts** - i18next configuration with EN/FR/DE/SW support
- **src/store/index.ts** - Zustand state management store with:
  - User state
  - Room state
  - Match state
  - Prediction state
  - Leaderboard state
  - Connection state
- **src/test/setup.ts** - Vitest test setup
- **src/vite-env.d.ts** - Vite type declarations

#### Key Dependencies
- `react` + `react-dom` - UI framework
- `vite` - Build tool and dev server
- `tailwindcss` - Utility-first CSS framework
- `zustand` - State management
- `react-i18next` + `i18next` - Internationalization
- `vite-plugin-pwa` - Progressive Web App support
- `fast-check` - Property-based testing
- `vitest` - Unit testing
- `@testing-library/react` - React component testing

## Next Steps

### 1. Install Dependencies

```bash
# Install all dependencies for root, backend, and frontend
npm run install:all
```

### 2. Verify Setup

```bash
# Backend
cd backend
npm run build    # Should compile TypeScript successfully
npm run test     # Should run (no tests yet)

# Frontend
cd frontend
npm run build    # Should build React app successfully
npm run test     # Should run (no tests yet)
```

### 3. Development Workflow

```bash
# Start frontend development server
cd frontend
npm run dev      # Runs on http://localhost:3000

# Build backend
cd backend
npm run build    # Compiles to dist/
```

### 4. Code Quality

```bash
# From root directory
npm run lint     # Lint all code
npm run format   # Format all code with Prettier
```

## Project Structure Overview

```
pulseparty-rooms/
├── backend/                 # AWS Lambda functions
│   ├── src/
│   │   ├── types/          # Shared type definitions
│   │   └── index.ts        # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── frontend/                # React PWA
│   ├── src/
│   │   ├── store/          # Zustand state management
│   │   ├── test/           # Test utilities
│   │   ├── App.tsx         # Root component
│   │   ├── main.tsx        # Entry point
│   │   ├── i18n.ts         # Internationalization
│   │   └── index.css       # Global styles
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
├── package.json             # Monorepo workspace
├── .eslintrc.json          # Linting rules
├── .prettierrc.json        # Formatting rules
└── README.md               # Project documentation
```

## Technology Decisions

### Why Monorepo?
- Shared TypeScript types between backend and frontend
- Unified dependency management
- Consistent code quality tools (ESLint, Prettier)
- Simplified CI/CD pipeline

### Why These Tools?
- **Vite**: Fast development server and optimized builds
- **Zustand**: Lightweight state management (simpler than Redux)
- **TailwindCSS**: Rapid UI development with utility classes
- **fast-check**: Property-based testing as required by spec
- **Jest/Vitest**: Industry-standard testing frameworks
- **AWS SDK v3**: Modular imports for smaller Lambda bundles

## Configuration Highlights

### TypeScript
- Strict mode enabled for type safety
- ES2022 target for modern JavaScript features
- Source maps enabled for debugging

### Testing
- Backend: 80% coverage threshold (Jest)
- Frontend: 70% coverage threshold (Vitest)
- Property-based testing with fast-check (100 iterations minimum)

### Code Quality
- ESLint with TypeScript support
- Prettier for consistent formatting
- Pre-configured rules for React and Node.js

### PWA
- Service worker for offline support
- Web app manifest for installation
- Workbox for runtime caching strategies

## Ready for Implementation

The project structure is now ready for implementing:
1. Lambda function handlers
2. React components
3. WebSocket services
4. DynamoDB data access layer
5. Unit and property-based tests

All configuration files are in place and dependencies are specified.
