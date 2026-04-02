/**
 * Integration Test Example for Checkpoint 8
 *
 * This file demonstrates how the room management and WebSocket handlers
 * work together in a real scenario. This is NOT an automated test, but
 * rather a code example showing the integration flow.
 *
 * To run actual integration tests against deployed infrastructure,
 * you would need to:
 * 1. Deploy the infrastructure (Task 2.4)
 * 2. Use a WebSocket client library
 * 3. Connect to the actual API Gateway WebSocket endpoint
 */

import {
  createRoom,
  getRoomByCode,
  broadcastToRoom,
} from './roomState/roomManagement';

/**
 * Example: Complete room creation and joining flow
 */
async function exampleRoomFlow() {
  console.log('=== Room Creation and Joining Flow ===\n');

  // Step 1: User A creates a room
  console.log('Step 1: User A creates a room for match-123 with Country theme');
  const room = await createRoom('match-123', 'Country');
  console.log(`✓ Room created: ${room.roomCode} (ID: ${room.roomId})`);
  console.log(`  Match: ${room.matchId}`);
  console.log(`  Theme: ${room.theme}`);
  console.log(`  Participants: ${room.participants.length}\n`);

  // Step 2: User B joins the room using the room code
  console.log('Step 2: User B joins using room code');
  const joinedRoom = await getRoomByCode(room.roomCode);
  if (joinedRoom) {
    console.log(`✓ Room found: ${joinedRoom.roomCode}`);
    console.log(`  Match: ${joinedRoom.matchId}`);
    console.log(`  Theme: ${joinedRoom.theme}\n`);
  } else {
    console.log('✗ Room not found\n');
  }

  // Step 3: Broadcast an event to all participants
  console.log('Step 3: Broadcasting match event to all participants');
  const matchEvent = {
    type: 'match_event',
    eventType: 'goal',
    timestamp: new Date().toISOString(),
    teamId: 'team-1',
    playerId: 'player-42',
    metadata: {
      minute: 67,
      assistedBy: 'player-10',
    },
  };

  try {
    const result = await broadcastToRoom(room.roomId, matchEvent);
    console.log(`✓ Broadcast complete:`);
    console.log(`  Success: ${result.successCount} connections`);
    console.log(`  Failed: ${result.failedConnections.length} connections\n`);
  } catch (error) {
    console.log(`✗ Broadcast failed: ${error}\n`);
  }
}

/**
 * Example: WebSocket message handling flow
 */
async function exampleWebSocketFlow() {
  console.log('=== WebSocket Message Handling Flow ===\n');

  // This demonstrates the message flow, but doesn't actually execute
  // because it requires a real WebSocket connection

  console.log('Step 1: Client connects to WebSocket API');
  console.log('  → $connect route triggered');
  console.log('  → handleConnect() stores connection in DynamoDB');
  console.log('  → Client receives current room state\n');

  console.log('Step 2: Client sends createRoom message');
  console.log(
    '  Message: { action: "createRoom", payload: { matchId: "match-123", theme: "Country" } }'
  );
  console.log('  → handleMessage() routes to createRoom handler');
  console.log('  → Room created and stored in DynamoDB');
  console.log('  → Client receives: { type: "roomCreated", room: {...} }\n');

  console.log('Step 3: Another client sends joinRoom message');
  console.log(
    '  Message: { action: "joinRoom", payload: { roomCode: "ABC123" } }'
  );
  console.log('  → handleMessage() routes to joinRoom handler');
  console.log('  → Connection added to room participants');
  console.log('  → Client receives: { type: "roomJoined", room: {...} }\n');

  console.log('Step 4: Match event occurs');
  console.log('  → EventBridge publishes event');
  console.log('  → Room State Lambda receives event');
  console.log('  → broadcastToRoom() sends to all participants');
  console.log('  → All clients receive: { type: "match_event", ... }\n');

  console.log('Step 5: Client sends heartbeat');
  console.log('  Message: { action: "heartbeat", payload: {} }');
  console.log('  → handleMessage() routes to heartbeat handler');
  console.log('  → lastHeartbeat timestamp updated');
  console.log(
    '  → Client receives: { type: "heartbeatAck", timestamp: "..." }\n'
  );

  console.log('Step 6: Client disconnects');
  console.log('  → $disconnect route triggered');
  console.log('  → handleDisconnect() removes connection from DynamoDB');
  console.log('  → Connection removed from room participants');
  console.log('  → Remaining participants receive updated participant list\n');
}

/**
 * Example: Rate limiting demonstration
 */
async function exampleRateLimiting() {
  console.log('=== Rate Limiting Example ===\n');

  console.log('Scenario: Client sends 101 messages in 1 second');
  console.log('  Messages 1-100: ✓ Allowed (within limit)');
  console.log('  Message 101: ✗ Rejected with 429 status');
  console.log('  Response: { error: "Rate limit exceeded", retryAfter: 1 }\n');

  console.log('After 1 second:');
  console.log('  Counter resets to 0');
  console.log('  Next message: ✓ Allowed\n');
}

/**
 * Example: Error handling scenarios
 */
async function exampleErrorHandling() {
  console.log('=== Error Handling Examples ===\n');

  console.log('Scenario 1: Invalid room code');
  console.log(
    '  Client sends: { action: "joinRoom", payload: { roomCode: "INVALID" } }'
  );
  console.log('  Response: { error: "Room not found" } (500 status)\n');

  console.log('Scenario 2: Missing required fields');
  console.log(
    '  Client sends: { action: "createRoom", payload: { theme: "Country" } }'
  );
  console.log(
    '  Response: { error: "matchId and theme are required" } (500 status)\n'
  );

  console.log('Scenario 3: Invalid theme');
  console.log(
    '  Client sends: { action: "createRoom", payload: { matchId: "match-123", theme: "Invalid" } }'
  );
  console.log(
    '  Response: { error: "Invalid theme. Must be Country, Club, or Private" } (500 status)\n'
  );

  console.log('Scenario 4: Stale WebSocket connection (410 Gone)');
  console.log('  → broadcastToRoom() detects stale connection');
  console.log('  → Connection removed from room participants');
  console.log('  → Broadcast continues to other connections\n');

  console.log('Scenario 5: Transient failure');
  console.log('  → broadcastToRoom() encounters temporary error');
  console.log('  → Retries with exponential backoff (100ms, 200ms, 400ms)');
  console.log('  → Succeeds on retry or marks as failed after 3 attempts\n');
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log(
    '\n╔════════════════════════════════════════════════════════════╗'
  );
  console.log('║  Checkpoint 8: Room and Connection Management Examples    ║');
  console.log(
    '╚════════════════════════════════════════════════════════════╝\n'
  );

  console.log(
    'NOTE: These are code examples demonstrating the integration flow.'
  );
  console.log(
    'They use mocked DynamoDB and WebSocket clients for demonstration.\n'
  );
  console.log('To test against real AWS infrastructure:');
  console.log(
    '  1. Deploy infrastructure: cd infrastructure && npm run deploy'
  );
  console.log(
    '  2. Use a WebSocket client to connect to the API Gateway endpoint'
  );
  console.log('  3. Send messages and observe responses\n');

  console.log(
    '═══════════════════════════════════════════════════════════════\n'
  );

  // Run examples
  await exampleRoomFlow();
  await exampleWebSocketFlow();
  await exampleRateLimiting();
  await exampleErrorHandling();

  console.log(
    '═══════════════════════════════════════════════════════════════\n'
  );
  console.log('✓ All examples completed');
  console.log('\nFor actual testing, run: npm test\n');
}

// Only run if executed directly (not imported)
if (require.main === module) {
  main().catch(console.error);
}

export {
  exampleRoomFlow,
  exampleWebSocketFlow,
  exampleRateLimiting,
  exampleErrorHandling,
};
