# PulseParty Backend

AWS Lambda functions for the PulseParty Rooms platform.

## Structure

- `src/` - Source code
  - `types/` - TypeScript type definitions
  - `lambdas/` - Lambda function handlers (to be implemented)
  - `utils/` - Shared utilities (to be implemented)

## Lambda Functions

The following Lambda functions will be implemented:

1. **Ingestion Lambda** - Parse XML match events and normalize to JSON
2. **Room State Lambda** - Distribute events to rooms via WebSocket
3. **Moment Engine Lambda** - Generate prediction windows
4. **Scoring Lambda** - Calculate points and update leaderboards
5. **Recap Lambda** - Generate wrapped and room recaps
6. **WebSocket Handlers** - Connection, disconnection, and message routing

## Testing

```bash
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
```

## Building

```bash
npm run build             # Compile TypeScript to dist/
```

## Dependencies

- AWS SDK v3 for DynamoDB, EventBridge, and API Gateway
- fast-xml-parser for XML parsing
- nanoid for generating unique IDs
- fast-check for property-based testing
