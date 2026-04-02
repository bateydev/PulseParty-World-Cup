# PulseParty Rooms

Real-time social multiplayer fan experience platform for live football matches.

## Project Structure

This is a monorepo containing:

- `backend/` - AWS Lambda functions (Node.js + TypeScript)
- `frontend/` - Progressive Web Application (React + Vite + TailwindCSS)

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install all dependencies
npm run install:all
```

### Development

#### Backend

```bash
cd backend
npm run build      # Compile TypeScript
npm run test       # Run tests
npm run lint       # Lint code
```

#### Frontend

```bash
cd frontend
npm run dev        # Start development server
npm run build      # Build for production
npm run test       # Run tests
npm run lint       # Lint code
```

### Testing

The project uses a dual testing approach:

- **Unit tests**: Jest (backend) and Vitest (frontend)
- **Property-based tests**: fast-check for both backend and frontend

```bash
# Run all tests
npm run test

# Run tests with coverage
cd backend && npm run test:coverage
cd frontend && npm run test:coverage
```

### Code Quality

```bash
# Lint all code
npm run lint

# Format all code
npm run format
```

## Technology Stack

### Backend
- Node.js + TypeScript
- AWS Lambda
- AWS SDK v3 (DynamoDB, EventBridge, API Gateway)
- Jest + fast-check for testing

### Frontend
- React 18
- Vite
- TailwindCSS
- Zustand (state management)
- react-i18next (internationalization)
- Vitest + fast-check for testing
- PWA support with vite-plugin-pwa

## Features

- Real-time match event streaming via WebSocket
- Themed match rooms (Country, Club, Private)
- Micro-prediction moments with scoring
- Live leaderboards with streak multipliers
- Personalized wrapped recaps
- Multilingual support (EN, FR, DE, SW)
- Progressive Web App with offline support
- Guest mode and optional authentication

## License

See LICENSE file for details.
