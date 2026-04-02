# Implementation Plan: PulseParty Rooms

## Overview

This implementation plan converts the PulseParty Rooms design into actionable coding tasks. The system is built with TypeScript on AWS Lambda (backend) and React with Vite (frontend), using EventBridge for event routing, DynamoDB for storage, and API Gateway WebSockets for real-time communication.

The implementation follows an incremental approach: infrastructure setup → backend core → frontend core → integration → testing → deployment. Each task builds on previous work, with checkpoints to validate progress.

## Tasks

### Phase 1: Infrastructure and Project Setup

- [ ] 1. Initialize project structure and dependencies
  - Create monorepo structure with `backend/` and `frontend/` directories
  - Initialize TypeScript configuration for both backend and frontend
  - Set up package.json with dependencies: AWS SDK, fast-check, Jest, Vitest, React, Zustand, TailwindCSS
  - Configure ESLint and Prettier for code quality
  - _Requirements: All_

- [ ] 2. Set up AWS infrastructure with CDK or SAM
  - [ ] 2.1 Define DynamoDB single-table with GSI for match+theme discovery
    - Create table with PK, SK, GSI1PK, GSI1SK, and TTL attribute
    - Configure on-demand billing mode
    - _Requirements: 10.1, 10.2, 10.9_
  
  - [ ] 2.2 Define EventBridge event bus and routing rules
    - Create custom event bus for match events
    - Define routing rules by match ID to target Lambda functions
    - Configure dead-letter queue for failed events
    - _Requirements: 12.1, 12.2, 12.7_
  
  - [ ] 2.3 Define API Gateway WebSocket API
    - Create WebSocket API with $connect, $disconnect, $default routes
    - Configure Lambda integrations for each route
    - Set up CloudWatch logging
    - _Requirements: 9.1_
  
  - [ ] 2.4 Define Lambda functions with IAM roles
    - Create 6 Lambda function definitions: Ingestion, RoomState, MomentEngine, Scoring, Recap, WebSocket handlers
    - Configure environment variables (table name, event bus name, API Gateway endpoint)
    - Set up IAM roles with least-privilege permissions
    - _Requirements: All backend requirements_


### Phase 2: Backend Core Implementation

- [ ] 3. Implement shared types and utilities
  - [ ] 3.1 Create TypeScript interfaces for all data models
    - Define MatchEvent, Room, PredictionWindow, UserScore, Prediction, WrappedRecap, RoomRecap interfaces
    - Define WebSocketMessage action types
    - _Requirements: 2.1, 10.3, 10.4, 10.5_
  
  - [ ]* 3.2 Write property test for data model interfaces
    - **Property 38: Room entity structure**
    - **Property 39: Prediction entity structure**
    - **Property 40: Leaderboard entity structure**
    - **Validates: Requirements 10.3, 10.4, 10.5**
  
  - [ ] 3.3 Create DynamoDB helper utilities
    - Write functions for put, get, query, update operations with error handling
    - Implement retry logic with exponential backoff for throttling
    - _Requirements: 10.6, 10.7_

- [ ] 4. Implement Ingestion Lambda
  - [ ] 4.1 Create XML parser for match event feed
    - Write parseXMLEvent function to extract event type, timestamp, team, player
    - Implement error handling for malformed XML
    - _Requirements: 2.1, 11.1, 11.2, 11.3_
  
  - [ ]* 4.2 Write property test for XML parsing
    - **Property 7: XML event parsing**
    - **Validates: Requirements 2.1, 11.1, 11.2**
  
  - [ ] 4.3 Create event normalization function
    - Write normalizeEvent function to convert parsed XML to standardized JSON schema
    - Validate required fields (event_type, timestamp, match_id)
    - _Requirements: 2.2, 11.4, 11.5_
  
  - [ ]* 4.4 Write property tests for event normalization
    - **Property 8: Event normalization schema**
    - **Property 42: Event field validation**
    - **Property 44: Event serialization round-trip**
    - **Validates: Requirements 2.2, 11.4, 11.5, 11.6, 11.8**
  
  - [ ] 4.5 Implement EventBridge publisher
    - Write publishToEventBridge function with match ID routing attribute
    - Add retry logic with exponential backoff (3 attempts)
    - _Requirements: 2.3, 12.1, 12.5_
  
  - [ ]* 4.6 Write property test for EventBridge publishing
    - **Property 45: EventBridge message metadata**
    - **Validates: Requirements 12.1, 12.5**
  
  - [ ] 4.7 Implement simulator mode fallback
    - Create recorded event replay mechanism with realistic timing
    - Add environment variable to toggle simulator mode
    - _Requirements: 2.7, 2.8, 13.8_
  
  - [ ]* 4.8 Write unit tests for Ingestion Lambda
    - Test XML parsing with complete and partial data
    - Test error handling for malformed XML
    - Test simulator mode activation

- [ ] 5. Checkpoint - Validate ingestion pipeline
  - Deploy Ingestion Lambda to AWS
  - Test with sample XML events
  - Verify events published to EventBridge
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 6. Implement Room State Lambda
  - [ ] 6.1 Create room management functions
    - Write createRoom function to generate unique room code and store in DynamoDB
    - Write getRoomByCode function to query room by code
    - Write getActiveRoomsByMatch function to query rooms by match ID
    - _Requirements: 1.1, 1.3, 1.4, 12.3_
  
  - [ ]* 6.2 Write property tests for room management
    - **Property 1: Room code uniqueness**
    - **Property 3: Room-match association**
    - **Property 4: Valid room code join**
    - **Property 5: Invalid room code rejection**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5**
  
  - [ ] 6.3 Implement room theme validation and discovery
    - Write validateTheme function to check theme is in {Country, Club, Private}
    - Write discoverRooms function using GSI1 for public room discovery
    - _Requirements: 1.2, 1.7, 1.8_
  
  - [ ]* 6.4 Write property tests for theme validation and discovery
    - **Property 2: Room theme validation**
    - **Property 6: Room discovery by theme**
    - **Validates: Requirements 1.2, 1.7, 1.8**
  
  - [ ] 6.5 Implement event distribution to rooms
    - Write broadcastToRoom function to send events via WebSocket
    - Query active rooms by match ID and broadcast to all participants
    - _Requirements: 2.4, 2.5, 12.3, 12.4_
  
  - [ ]* 6.6 Write property tests for event routing
    - **Property 9: Event routing to rooms**
    - **Property 10: WebSocket broadcast delivery**
    - **Validates: Requirements 2.4, 2.5, 12.3, 12.4**
  
  - [ ]* 6.7 Write unit tests for Room State Lambda
    - Test room creation with valid and invalid themes
    - Test room discovery filtering by theme
    - Test broadcast to multiple participants

- [ ] 7. Implement WebSocket Connection Handlers
  - [ ] 7.1 Create connection handler
    - Write handleConnect function to store connection ID in DynamoDB
    - Send current room state on connection
    - _Requirements: 9.1, 9.2_
  
  - [ ]* 7.2 Write property test for connection establishment
    - **Property 35: WebSocket connection establishment**
    - **Validates: Requirements 9.1, 9.2**
  
  - [ ] 7.3 Create disconnect handler
    - Write handleDisconnect function to remove connection from DynamoDB
    - Broadcast updated participant list to room
    - _Requirements: 9.5, 9.7_
  
  - [ ] 7.4 Create message handler with action routing
    - Write handleMessage function to route actions: createRoom, joinRoom, submitPrediction, leaveRoom, heartbeat
    - Implement rate limiting (100 messages/second per connection)
    - _Requirements: 9.8_
  
  - [ ]* 7.5 Write property test for rate limiting
    - **Property 37: WebSocket rate limiting**
    - **Validates: Requirements 9.8**
  
  - [ ]* 7.6 Write unit tests for WebSocket handlers
    - Test connection storage and retrieval
    - Test disconnect cleanup
    - Test message action routing
    - Test rate limiting enforcement

- [ ] 8. Checkpoint - Validate room and connection management
  - Deploy Room State Lambda and WebSocket handlers
  - Test room creation and joining via WebSocket
  - Test event broadcast to multiple connections
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 9. Implement Moment Engine Lambda
  - [ ] 9.1 Create prediction window generation logic
    - Write generatePredictionWindow function triggered by match events (goal, corner, free kick)
    - Implement time-based prediction generation (10-minute intervals)
    - Define prediction types: next_goal_scorer, next_card, next_corner, match_outcome
    - _Requirements: 3.1, 3.2, 3.8_
  
  - [ ]* 9.2 Write property tests for prediction generation
    - **Property 11: Event-triggered prediction generation**
    - **Property 12: Prediction window structure**
    - **Validates: Requirements 3.1, 3.4**
  
  - [ ] 9.3 Implement prediction window storage and broadcast
    - Store prediction window in DynamoDB with expiration timestamp
    - Broadcast prediction window to all room participants via WebSocket
    - _Requirements: 3.3, 3.4_
  
  - [ ] 9.4 Create prediction submission handler
    - Write submitPrediction function to record user prediction with timestamp
    - Validate prediction is submitted before window expiration
    - Broadcast submission count without revealing individual predictions
    - _Requirements: 3.5, 3.6, 9.4_
  
  - [ ]* 9.5 Write property tests for prediction submission
    - **Property 13: Prediction recording with timestamp**
    - **Property 14: Expired window rejection**
    - **Property 36: Prediction submission privacy**
    - **Validates: Requirements 3.5, 3.6, 9.4**
  
  - [ ] 9.6 Implement prediction evaluation
    - Write evaluatePredictions function to resolve predictions when outcome occurs
    - Close prediction window and determine correct predictions
    - _Requirements: 3.7_
  
  - [ ]* 9.7 Write unit tests for Moment Engine Lambda
    - Test prediction generation for different event types
    - Test time-based prediction generation
    - Test prediction submission validation
    - Test prediction evaluation logic

- [ ] 10. Implement Scoring Lambda
  - [ ] 10.1 Create points calculation functions
    - Write calculatePoints function with difficulty-based base points (10/25/50)
    - Write applyStreakMultiplier function: 1.0 + (0.1 × streak), max 2.0
    - Write applyClutchBonus function: 1.5× if submitted in final 10 seconds
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 10.2 Write property tests for scoring logic
    - **Property 15: Correct prediction scoring**
    - **Property 16: Streak multiplier application**
    - **Property 17: Clutch bonus application**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  
  - [ ] 10.3 Implement leaderboard management
    - Write updateLeaderboard function to recalculate ranks and update DynamoDB
    - Query all scores for room and sort by total points
    - Broadcast updated leaderboard to all room participants
    - _Requirements: 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 10.4 Write property tests for leaderboard
    - **Property 18: Leaderboard update propagation**
    - **Property 19: Leaderboard data structure**
    - **Property 20: Leaderboard persistence**
    - **Validates: Requirements 4.4, 4.5, 4.6, 4.7**
  
  - [ ]* 10.5 Write unit tests for Scoring Lambda
    - Test base points calculation for different difficulties
    - Test streak multiplier with various streak counts
    - Test clutch bonus timing calculation
    - Test leaderboard sorting and ranking

- [ ] 11. Checkpoint - Validate prediction and scoring flow
  - Deploy Moment Engine and Scoring Lambdas
  - Test end-to-end: event → prediction window → submission → evaluation → score update → leaderboard
  - Verify streak and clutch bonuses apply correctly
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 12. Implement Recap Lambda
  - [ ] 12.1 Create wrapped recap generation
    - Write generateWrappedRecap function to calculate user stats: total points, final rank, accuracy, longest streak, clutch moments
    - Store wrapped recap in DynamoDB with shareable URL
    - _Requirements: 5.2, 5.3, 5.5, 5.6_
  
  - [ ]* 12.2 Write property tests for wrapped recap
    - **Property 22: Wrapped recap generation**
    - **Property 23: Shareable recap link generation**
    - **Property 24: Recap persistence**
    - **Validates: Requirements 5.2, 5.3, 5.5, 5.6, 5.7**
  
  - [ ] 12.3 Create room recap generation
    - Write generateRoomRecap function to aggregate room stats: total participants, top 3 performers, most predicted event, engagement metrics
    - Store room recap in DynamoDB
    - _Requirements: 5.1, 5.4_
  
  - [ ]* 12.4 Write property test for room recap
    - **Property 21: Room recap generation**
    - **Validates: Requirements 5.1, 5.4**
  
  - [ ] 12.5 Implement recap retrieval
    - Write getUserRecaps function to query historical recaps for a user
    - Broadcast recaps to room participants on match conclusion
    - _Requirements: 5.7_
  
  - [ ]* 12.6 Write unit tests for Recap Lambda
    - Test wrapped recap calculation with various user stats
    - Test room recap aggregation with multiple users
    - Test recap retrieval query

- [ ] 13. Implement authentication and user management
  - [ ] 13.1 Create guest user generation
    - Write generateGuestUser function to create temporary user ID and display name
    - Store guest user in DynamoDB with session TTL
    - _Requirements: 7.1, 7.2_
  
  - [ ]* 13.2 Write property test for guest user generation
    - **Property 25: Guest user generation**
    - **Validates: Requirements 7.2**
  
  - [ ] 13.3 Integrate AWS Cognito for authenticated users
    - Configure Cognito user pool and identity pool
    - Implement sign-in flow with JWT validation
    - Link Cognito ID to user entity in DynamoDB
    - _Requirements: 7.3, 7.4_
  
  - [ ]* 13.4 Write property tests for authenticated users
    - **Property 26: Authenticated user persistence**
    - **Property 27: Custom display name setting**
    - **Validates: Requirements 7.4, 7.5**
  
  - [ ] 13.5 Implement WebSocket reconnection logic
    - Add exponential backoff retry mechanism (5 attempts)
    - Restore user session state on reconnection
    - _Requirements: 7.6, 7.7_
  
  - [ ]* 13.6 Write property test for reconnection
    - **Property 28: WebSocket reconnection with backoff**
    - **Validates: Requirements 7.7**
  
  - [ ]* 13.7 Write unit tests for authentication
    - Test guest user creation and storage
    - Test Cognito JWT validation
    - Test reconnection backoff timing

- [ ] 14. Checkpoint - Validate recap generation and authentication
  - Deploy Recap Lambda and authentication integration
  - Test wrapped recap and room recap generation
  - Test guest and authenticated user flows
  - Ensure all tests pass, ask the user if questions arise.


### Phase 3: Frontend Implementation

- [ ] 15. Set up React PWA project structure
  - [ ] 15.1 Initialize Vite + React + TypeScript project
    - Create frontend directory with Vite configuration
    - Install dependencies: React, Zustand, TailwindCSS, react-i18next, fast-check, Vitest
    - Configure TailwindCSS with mobile-first breakpoints
    - _Requirements: 6.1_
  
  - [ ] 15.2 Configure PWA manifest and service worker
    - Create web app manifest with app name, icons, theme colors
    - Implement service worker with cache-first strategy for static assets
    - Configure Workbox for offline support
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ] 15.3 Set up i18n configuration
    - Configure react-i18next with EN, FR, DE, SW translations
    - Implement locale detection from browser preferences
    - Set up translation files structure
    - _Requirements: 8.1, 8.2_

- [ ] 16. Implement Zustand state management
  - [ ] 16.1 Create app state store
    - Define AppState interface with user, room, match, prediction, leaderboard, connection state
    - Implement state actions: connectWebSocket, createRoom, joinRoom, submitPrediction, setLocale
    - Add middleware for persistence to localStorage
    - _Requirements: 9.1, 9.2_
  
  - [ ]* 16.2 Write unit tests for Zustand store
    - Test state updates for each action
    - Test localStorage persistence
    - Test WebSocket message handling

- [ ] 17. Implement WebSocket client integration
  - [ ] 17.1 Create WebSocket connection manager
    - Write connectWebSocket function with automatic reconnection
    - Implement exponential backoff retry logic
    - Handle connection, disconnection, and message events
    - _Requirements: 9.1, 7.7_
  
  - [ ] 17.2 Implement message handlers for state updates
    - Handle match event messages and update matchEvents state
    - Handle prediction window messages and update activePredictionWindow state
    - Handle leaderboard messages and update leaderboard state
    - Handle participant messages and update participants state
    - _Requirements: 9.2, 9.3_
  
  - [ ]* 17.3 Write unit tests for WebSocket client
    - Test connection establishment and reconnection
    - Test message parsing and state updates
    - Test error handling for malformed messages

- [ ] 18. Implement core React components
  - [ ] 18.1 Create RoomLobby component
    - Implement theme selection UI (Country/Club/Private buttons)
    - Implement room code input and join button
    - Implement public room list with match and theme filters
    - _Requirements: 1.2, 1.4, 1.7_
  
  - [ ]* 18.2 Write unit tests for RoomLobby
    - Test theme selection interaction
    - Test room code validation
    - Test room list filtering
  
  - [ ] 18.3 Create MatchTimeline component
    - Display match events as cards with icons and timestamps
    - Implement auto-scroll to latest event
    - Localize event descriptions using i18n
    - _Requirements: 2.5, 8.5_
  
  - [ ]* 18.4 Write unit tests for MatchTimeline
    - Test event rendering with different event types
    - Test auto-scroll behavior
    - Test localized descriptions
  
  - [ ] 18.5 Create PredictionWidget component
    - Display prediction window with countdown timer
    - Render multiple choice options as buttons
    - Implement submit button with loading state
    - Show result feedback animation after evaluation
    - _Requirements: 3.3, 3.4, 3.5_
  
  - [ ]* 18.6 Write unit tests for PredictionWidget
    - Test countdown timer updates
    - Test option selection and submission
    - Test disabled state after expiration
    - Test result feedback display
  
  - [ ] 18.7 Create Leaderboard component
    - Display user rank, name, points, streak in table format
    - Highlight current user row
    - Implement smooth rank transition animations
    - _Requirements: 4.6_
  
  - [ ]* 18.8 Write unit tests for Leaderboard
    - Test leaderboard rendering with multiple users
    - Test current user highlighting
    - Test rank sorting
  
  - [ ] 18.9 Create WrappedRecapView component
    - Display personal stats with animations (total points, rank, accuracy, streak, clutch moments)
    - Implement share button for social media
    - Show historical recap access
    - _Requirements: 5.2, 5.3, 5.5_
  
  - [ ]* 18.10 Write unit tests for WrappedRecapView
    - Test stats rendering
    - Test share button functionality
    - Test historical recap navigation

- [ ] 19. Checkpoint - Validate frontend core functionality
  - Run frontend development server
  - Test room creation and joining UI
  - Test match timeline display
  - Test prediction widget interaction
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 20. Implement internationalization (i18n)
  - [ ] 20.1 Create translation files for all languages
    - Write EN, FR, DE, SW translation files for UI text, labels, messages
    - Translate match event descriptions and prediction prompts
    - _Requirements: 8.1, 8.5_
  
  - [ ] 20.2 Implement locale detection and switching
    - Detect browser language preference on app load
    - Implement language selector component
    - Persist language preference to localStorage
    - _Requirements: 8.2, 8.3, 8.4_
  
  - [ ]* 20.3 Write property tests for i18n
    - **Property 29: Locale detection and setting**
    - **Property 30: Language switching**
    - **Property 31: Language preference persistence**
    - **Property 32: Event and prompt translation**
    - **Property 34: Recap localization**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.7**
  
  - [ ] 20.4 Implement locale-specific formatting
    - Format timestamps using locale conventions
    - Format numbers and scores using locale conventions
    - _Requirements: 8.6_
  
  - [ ]* 20.5 Write property test for locale formatting
    - **Property 33: Locale-specific formatting**
    - **Validates: Requirements 8.6**
  
  - [ ]* 20.6 Write unit tests for i18n
    - Test translation loading for each language
    - Test language switching updates UI
    - Test locale persistence

- [ ] 21. Implement PWA offline support
  - [ ] 21.1 Configure service worker caching strategies
    - Implement cache-first for static assets (JS, CSS, images)
    - Implement network-first with cache fallback for API responses
    - Implement network-only for real-time WebSocket data
    - _Requirements: 6.2_
  
  - [ ] 21.2 Implement offline indicator and state management
    - Display offline banner when network connectivity lost
    - Show cached UI with last known state
    - Queue prediction submissions for sync on reconnect
    - _Requirements: 6.4, 6.5_
  
  - [ ] 21.3 Implement low-bandwidth mode
    - Add toggle for low-bandwidth mode in settings
    - Reduce WebSocket message frequency
    - Transmit only essential match events
    - _Requirements: 6.6, 6.7_
  
  - [ ]* 21.4 Write unit tests for service worker
    - Test cache storage and retrieval
    - Test offline mode behavior
    - Test online/offline transition

- [ ] 22. Optimize frontend performance
  - [ ] 22.1 Implement code splitting and lazy loading
    - Split routes for room lobby, match view, recap view
    - Lazy load heavy components (WrappedRecapView)
    - _Requirements: 6.8_
  
  - [ ] 22.2 Optimize bundle size and assets
    - Minify JavaScript and CSS
    - Compress images and icons
    - Enable gzip/brotli compression
    - _Requirements: 6.8_
  
  - [ ] 22.3 Run Lighthouse audit and optimize
    - Achieve performance score above 80
    - Fix accessibility issues
    - Optimize first contentful paint and time to interactive
    - _Requirements: 6.8_

- [ ] 23. Checkpoint - Validate PWA and i18n features
  - Test PWA installation on mobile device
  - Test offline mode with cached content
  - Test language switching for all supported languages
  - Run Lighthouse audit and verify performance score
  - Ensure all tests pass, ask the user if questions arise.


### Phase 4: Integration and End-to-End Testing

- [ ] 24. Implement complete match event flow
  - [ ] 24.1 Wire ingestion → EventBridge → room state → WebSocket broadcast
    - Verify events flow from XML feed to frontend display
    - Test with all supported event types (goal, card, corner, shot, possession)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ]* 24.2 Write property tests for complete event flow
    - **Property 43: Event data enrichment**
    - **Property 46: Goal event complete flow**
    - **Property 47: Card event timeline display**
    - **Property 48: Corner event display and stats**
    - **Validates: Requirements 11.7, 13.3, 13.4, 13.5**
  
  - [ ]* 24.3 Write integration tests for event flow
    - Test end-to-end: XML → parse → normalize → publish → route → broadcast → display
    - Test with multiple concurrent rooms
    - Test with simulator mode

- [ ] 25. Implement complete prediction and scoring flow
  - [ ] 25.1 Wire event → prediction window → submission → evaluation → scoring → leaderboard
    - Verify prediction windows generated on trigger events
    - Test prediction submission and evaluation
    - Test score calculation with streak and clutch bonuses
    - Test leaderboard updates and broadcast
    - _Requirements: 3.1, 3.5, 3.7, 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 25.2 Write integration tests for prediction flow
    - Test complete gamification loop: prompt → submit → resolve → score → rank
    - Test with multiple users in same room
    - Test streak accumulation across multiple predictions
    - Test clutch bonus timing edge cases

- [ ] 26. Implement complete recap generation flow
  - [ ] 26.1 Wire match end → recap generation → storage → broadcast → display
    - Verify wrapped recap generated for each user
    - Verify room recap generated for room
    - Test shareable link generation
    - Test recap retrieval and display
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7_
  
  - [ ]* 26.2 Write integration tests for recap flow
    - Test recap generation at match conclusion
    - Test recap persistence and retrieval
    - Test shareable link functionality

- [ ] 27. Implement multi-user synchronization testing
  - [ ] 27.1 Test concurrent user interactions
    - Create room with User A, join with User B
    - Verify both users receive same events simultaneously
    - Verify leaderboard shows both users with correct ranks
    - Test participant list updates on join/leave
    - _Requirements: 1.6, 9.3, 9.5, 13.1_
  
  - [ ]* 27.2 Write property test for room capacity
    - **Property 41: Room TTL configuration**
    - **Validates: Requirements 10.9**
  
  - [ ]* 27.3 Write integration tests for multi-user scenarios
    - Test 2+ users in same room receiving synchronized updates
    - Test user disconnect and reconnect behavior
    - Test participant list broadcast

- [ ] 28. Checkpoint - Validate end-to-end integration
  - Deploy complete system to staging environment
  - Run full integration test suite
  - Test with multiple concurrent users and rooms
  - Verify all real-time updates work correctly
  - Ensure all tests pass, ask the user if questions arise.


### Phase 5: Error Handling and Monitoring

- [ ] 29. Implement comprehensive error handling
  - [ ] 29.1 Add error handling to all Lambda functions
    - Implement try-catch blocks with structured logging
    - Add retry logic with exponential backoff for transient errors
    - Configure dead-letter queues for failed events
    - _Requirements: All backend requirements_
  
  - [ ] 29.2 Add error handling to frontend
    - Implement error boundaries for React components
    - Display user-friendly error messages
    - Log errors to console with context
    - _Requirements: All frontend requirements_
  
  - [ ] 29.3 Implement graceful degradation
    - Activate simulator mode when event feed unavailable
    - Fall back to guest mode when Cognito fails
    - Display cached content when offline
    - _Requirements: 2.7, 6.4_
  
  - [ ]* 29.4 Write unit tests for error handling
    - Test Lambda error handling and retry logic
    - Test frontend error boundaries
    - Test graceful degradation scenarios

- [ ] 30. Set up monitoring and alerting
  - [ ] 30.1 Configure CloudWatch Logs and metrics
    - Enable structured logging for all Lambda functions
    - Create custom metrics for key operations (event processing, prediction submission, score updates)
    - Set up log retention policies
    - _Requirements: All backend requirements_
  
  - [ ] 30.2 Configure CloudWatch Alarms
    - Create alarm for DLQ message count > 10 in 5 minutes
    - Create alarm for Lambda error rate > 5%
    - Create alarm for WebSocket connection failure rate > 10%
    - Create alarm for DynamoDB throttled requests > 0
    - _Requirements: All backend requirements_
  
  - [ ] 30.3 Set up X-Ray tracing
    - Enable X-Ray for all Lambda functions
    - Trace event flow through EventBridge
    - Identify slow DynamoDB queries
    - _Requirements: All backend requirements_

- [ ] 31. Implement DynamoDB TTL cleanup
  - [ ] 31.1 Configure TTL attribute on room entities
    - Set TTL to 7 days after match completion
    - Verify automatic deletion of expired rooms
    - _Requirements: 10.9_
  
  - [ ] 31.2 Configure TTL for guest user sessions
    - Set TTL to 24 hours after last activity
    - Verify automatic cleanup of inactive guest users
    - _Requirements: 7.2_

- [ ] 32. Checkpoint - Validate error handling and monitoring
  - Test error scenarios (malformed XML, DynamoDB throttling, WebSocket failures)
  - Verify CloudWatch alarms trigger correctly
  - Review X-Ray traces for performance bottlenecks
  - Ensure all tests pass, ask the user if questions arise.


### Phase 6: Deployment and Demo Preparation

- [ ] 33. Set up CI/CD pipeline
  - [ ] 33.1 Configure GitHub Actions workflow
    - Create workflow for running unit tests on every PR
    - Create workflow for running property tests on every PR (100 iterations)
    - Create workflow for running integration tests on merge to main
    - _Requirements: All_
  
  - [ ] 33.2 Configure automated deployment
    - Deploy backend to AWS on merge to main
    - Deploy frontend to S3 + CloudFront on merge to main
    - Run smoke tests against staging environment
    - Require manual approval for production deployment
    - _Requirements: All_

- [ ] 34. Deploy to production environment
  - [ ] 34.1 Deploy backend infrastructure
    - Deploy DynamoDB table with GSI
    - Deploy EventBridge event bus and rules
    - Deploy API Gateway WebSocket API
    - Deploy all 6 Lambda functions
    - _Requirements: All backend requirements_
  
  - [ ] 34.2 Deploy frontend to S3 + CloudFront
    - Build optimized production bundle
    - Upload static assets to S3
    - Configure CloudFront distribution with edge caching
    - Set up custom domain and SSL certificate
    - _Requirements: All frontend requirements_
  
  - [ ] 34.3 Configure production environment variables
    - Set API Gateway WebSocket endpoint URL
    - Set DynamoDB table name
    - Set EventBridge event bus name
    - Set Cognito user pool ID and client ID
    - _Requirements: All_

- [ ] 35. Prepare hackathon demo
  - [ ] 35.1 Create demo script and test data
    - Prepare recorded match events for simulator mode
    - Create demo room codes for quick access
    - Prepare demo user accounts (guest and authenticated)
    - _Requirements: 2.7, 13.8_
  
  - [ ] 35.2 Test complete demo flow
    - Test room creation and joining with 2+ users
    - Test real-time event integration with 3+ event types (goal, card, corner)
    - Test complete gamification loop: prediction → submission → evaluation → score → leaderboard
    - Test wrapped recap and room recap generation
    - Test simulator mode fallback
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_
  
  - [ ] 35.3 Verify all evaluation criteria
    - Confirm 2+ concurrent users supported
    - Confirm 3+ match event types integrated
    - Confirm complete gamification loop demonstrated
    - Confirm recaps generated and displayed
    - Confirm simulator mode works seamlessly
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

- [ ] 36. Final checkpoint - Production readiness validation
  - Run complete test suite (unit, property, integration)
  - Verify all 48 correctness properties pass
  - Test production deployment with real users
  - Verify monitoring and alerting configured
  - Confirm demo script works end-to-end
  - Ensure all tests pass, ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (48 total)
- Unit tests validate specific examples, edge cases, and integration points
- The implementation uses TypeScript for both backend (Node.js Lambda) and frontend (React)
- All 48 correctness properties from the design document are covered by property-based tests
- Integration tests validate end-to-end flows across multiple components
- The system is designed for the Fan Squad hackathon with demo requirements in mind

## Test Coverage Summary

- **Property-based tests**: 48 properties covering all acceptance criteria
- **Unit tests**: Backend (6 Lambda functions) + Frontend (5 core components + state management)
- **Integration tests**: 4 end-to-end flows (event, prediction, recap, multi-user)
- **Performance tests**: Lighthouse audit for PWA optimization
- **Demo tests**: Complete hackathon evaluation criteria validation

## Implementation Order Rationale

1. **Infrastructure first**: Set up AWS resources before writing business logic
2. **Backend core**: Implement data flow from ingestion to storage
3. **Frontend core**: Build UI components and state management
4. **Integration**: Wire backend and frontend together
5. **Error handling**: Add resilience and monitoring
6. **Deployment**: Prepare for production and demo

This order ensures each phase builds on stable foundations, with checkpoints to validate progress before moving forward.
