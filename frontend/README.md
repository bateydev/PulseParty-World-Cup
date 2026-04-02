# PulseParty Frontend

Progressive Web Application for the PulseParty Rooms platform.

## Structure

- `src/` - Source code
  - `components/` - React components (to be implemented)
  - `store/` - Zustand state management
  - `hooks/` - Custom React hooks (to be implemented)
  - `services/` - API and WebSocket services (to be implemented)
  - `i18n.ts` - Internationalization configuration
  - `test/` - Test utilities and setup

## Components

The following components will be implemented:

1. **RoomLobby** - Room creation and discovery
2. **MatchTimeline** - Live event feed display
3. **PredictionWidget** - Micro-prediction interface
4. **Leaderboard** - Real-time rankings
5. **WrappedRecapView** - Post-match summary

## Development

```bash
npm run dev               # Start development server on port 3000
npm run build             # Build for production
npm run preview           # Preview production build
```

## Testing

```bash
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
```

## Features

- Mobile-first responsive design with TailwindCSS
- Real-time WebSocket communication
- Offline support via Service Worker
- Multilingual support (EN, FR, DE, SW)
- PWA installable on mobile devices
