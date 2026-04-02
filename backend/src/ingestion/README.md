# Ingestion Module

This module handles parsing and processing of match event data from external XML feeds.

## XML Parser

The `xmlParser.ts` module provides functionality to parse XML match event feeds and convert them to the internal `MatchEvent` format.

### Features

- **Fast XML Parsing**: Uses `fast-xml-parser` for efficient XML processing
- **Error Handling**: Gracefully handles malformed XML and logs errors with snippets
- **Event Type Normalization**: Supports various event type formats (e.g., "yellow_card", "yellowcard", "yellow")
- **Flexible Structure**: Handles multiple XML structures (single event, multiple events, nested structures)
- **Metadata Extraction**: Automatically extracts additional fields as metadata
- **Performance**: Designed to parse events within 200ms (Requirement 2.1)

### Usage

```typescript
import { parseXMLEvent } from './ingestion/xmlParser';

// Parse XML string
const xml = `
  <event>
    <matchId>match_123</matchId>
    <eventType>goal</eventType>
    <timestamp>2024-01-15T10:30:00Z</timestamp>
    <teamId>team_456</teamId>
    <playerId>player_789</playerId>
    <minute>45</minute>
  </event>
`;

const result = parseXMLEvent(xml);

// Check for errors
if (result.errors.length > 0) {
  console.error('Parsing errors:', result.errors);
}

// Process successfully parsed events
result.events.forEach(event => {
  console.log(`Event: ${event.eventType} at ${event.timestamp}`);
  console.log(`Match: ${event.matchId}, Team: ${event.teamId}`);
  if (event.playerId) {
    console.log(`Player: ${event.playerId}`);
  }
  console.log('Metadata:', event.metadata);
});
```

### Supported XML Structures

The parser supports multiple XML structures:

**Single Event:**
```xml
<event>
  <matchId>match_1</matchId>
  <eventType>goal</eventType>
  <timestamp>2024-01-15T10:30:00Z</timestamp>
  <teamId>team_1</teamId>
</event>
```

**Multiple Events:**
```xml
<events>
  <event>...</event>
  <event>...</event>
</events>
```

**Alternative Structure:**
```xml
<matchEvents>
  <matchEvent>...</matchEvent>
  <matchEvent>...</matchEvent>
</matchEvents>
```

**Attributes:**
```xml
<event type="goal" matchId="match_1" timestamp="2024-01-15T10:30:00Z" teamId="team_1">
  <playerId>player_1</playerId>
</event>
```

### Supported Event Types

- `goal` - Goal scored
- `assist` - Assist provided
- `yellow_card` - Yellow card issued
- `red_card` - Red card issued
- `substitution` - Player substitution
- `corner` - Corner kick
- `shot` - Shot on/off target
- `possession` - Possession update

### Error Handling

The parser implements robust error handling as per Requirement 11.3:

- **Malformed XML**: Logs error with XML snippet, continues processing
- **Missing Required Fields**: Logs validation error, skips event
- **Invalid Timestamps**: Logs error, skips event
- **Partial Failures**: Continues processing remaining events

All errors are logged to CloudWatch with structured logging format.

### Requirements Satisfied

- **Requirement 2.1**: Parse XML data and extract event type, timestamp, team, player within 200ms
- **Requirement 11.1**: Parse XML structure and extract all MatchEvent nodes
- **Requirement 11.2**: Extract event type, timestamp, team identifier, player identifier, and metadata
- **Requirement 11.3**: Log errors with malformed XML snippet and continue processing

### Testing

Run unit tests:
```bash
npm test -- xmlParser.test.ts
```

The test suite includes:
- Complete event parsing with all fields
- Parsing with missing optional fields
- Multiple events parsing
- Event type normalization
- Error handling for malformed XML
- Missing required fields handling
- Different XML structures
- Metadata extraction

## Event Normalizer

The `normalizer.ts` module provides functionality to validate and normalize parsed match events to ensure they conform to the standardized JSON schema.

### Features

- **Field Validation**: Validates all required fields (event_type, timestamp, match_id, teamId, eventId)
- **ISO 8601 Validation**: Ensures timestamps are in valid ISO 8601 format
- **Standardized Schema**: Converts events to consistent JSON structure with standardized field names
- **Error Reporting**: Provides detailed error messages for validation failures
- **Batch Processing**: Supports normalizing multiple events at once
- **Type Safety**: Full TypeScript type checking for normalized events

### Usage

```typescript
import { normalizeEvent, normalizeEvents, getValidEvents } from './ingestion/normalizer';

// Normalize a single event
const parsedEvent = {
  eventId: 'event-123',
  matchId: 'match-456',
  eventType: 'goal',
  timestamp: '2024-01-15T10:30:00.000Z',
  teamId: 'team-789',
  playerId: 'player-101',
  metadata: { minute: 45 }
};

const result = normalizeEvent(parsedEvent);

if (result.isValid) {
  console.log('Normalized event:', result.event);
  // Use result.event for further processing
} else {
  console.error('Validation errors:', result.errors);
  // Handle validation errors
}

// Batch normalize multiple events
const events = [event1, event2, event3];
const results = normalizeEvents(events);

// Extract only valid events
const validEvents = getValidEvents(results);
console.log(`${validEvents.length} valid events out of ${events.length}`);
```

### Validation Rules

**Required Fields:**
- `eventId` - Unique event identifier
- `matchId` - Match identifier (validates Requirement 11.5)
- `eventType` - Event type (validates Requirement 11.5)
- `timestamp` - ISO 8601 timestamp (validates Requirement 11.5)
- `teamId` - Team identifier

**Optional Fields:**
- `playerId` - Player identifier (optional for team-level events)
- `metadata` - Additional event data (defaults to empty object)

**Timestamp Validation:**
- Must be valid ISO 8601 format
- Must be parseable as a Date
- Must round-trip correctly (Date.parse → toISOString)

### Error Handling

The normalizer provides detailed error information:

```typescript
interface NormalizationError {
  field: string;        // Field that failed validation
  message: string;      // Human-readable error message
  value?: unknown;      // The invalid value (if present)
}
```

Example error output:
```typescript
{
  event: null,
  errors: [
    {
      field: 'timestamp',
      message: 'Invalid timestamp format: must be ISO 8601',
      value: '2024-01-15 10:30:00'
    }
  ],
  isValid: false
}
```

### Requirements Satisfied

- **Requirement 2.2**: Normalize event data into standardized internal format
- **Requirement 11.4**: Normalize to standardized JSON schema with consistent field names and data types
- **Requirement 11.5**: Validate that each normalized event contains required fields (event_type, timestamp, match_id)

### Testing

Run unit tests:
```bash
npm test -- normalizer.test.ts
```

The test suite includes:
- Valid event normalization
- Missing required fields detection
- Invalid timestamp format detection
- Optional field handling
- Batch normalization
- Valid event extraction
- All event types support
- Edge cases (empty metadata, multiple errors)

### Integration with XML Parser

The normalizer is designed to work seamlessly with the XML parser:

```typescript
import { parseXMLEvent } from './ingestion/xmlParser';
import { normalizeEvents, getValidEvents } from './ingestion/normalizer';

// Parse XML
const parseResult = parseXMLEvent(xmlString);

// Normalize parsed events
const normalizeResults = normalizeEvents(parseResult.events);

// Get only valid, normalized events
const validEvents = getValidEvents(normalizeResults);

// Log any normalization errors
normalizeResults.forEach((result, index) => {
  if (!result.isValid) {
    console.error(`Event ${index} validation failed:`, result.errors);
  }
});

// Process valid events
validEvents.forEach(event => {
  // Publish to EventBridge, store in DynamoDB, etc.
});
```


## EventBridge Publisher

The `eventBridgePublisher.ts` module provides functionality to publish normalized match events to AWS EventBridge with retry logic and exponential backoff.

### Features

- **Retry Logic**: Exponential backoff with 3 attempts (0ms, 100ms, 200ms delays)
- **Match ID Routing**: Events include match ID as routing attribute for EventBridge rules
- **Event Metadata**: Includes priority (high/medium/low), timestamp, and original metadata
- **Priority Classification**:
  - High: goal, red_card, assist
  - Medium: yellow_card, substitution, corner
  - Low: shot, possession
- **Batch Publishing**: Support for publishing multiple events efficiently
- **Error Handling**: Detailed error reporting with attempt tracking

### Usage

```typescript
import { publishToEventBridge, publishEventsToEventBridge } from './ingestion/eventBridgePublisher';

// Publish a single event
const event: MatchEvent = {
  eventId: 'evt-123',
  matchId: 'match-456',
  eventType: 'goal',
  timestamp: '2024-01-15T10:30:00.000Z',
  teamId: 'team-789',
  playerId: 'player-101',
  metadata: { minute: 45, score: '1-0' }
};

const result = await publishToEventBridge(event);

if (result.success) {
  console.log(`Event published successfully (EventBridge ID: ${result.eventId})`);
  console.log(`Attempts: ${result.attempts}`);
} else {
  console.error(`Publish failed after ${result.attempts} attempts:`, result.error);
}

// Batch publish multiple events
const events: MatchEvent[] = [event1, event2, event3];
const results = await publishEventsToEventBridge(events);

const successCount = results.filter(r => r.success).length;
console.log(`Published ${successCount}/${events.length} events`);
```

### Retry Strategy

The publisher implements exponential backoff for failed publish attempts:

1. **Attempt 1**: Immediate (0ms delay)
2. **Attempt 2**: 100ms delay
3. **Attempt 3**: 200ms delay

After 3 failed attempts, the function returns an error result with detailed information.

### Event Structure

Events published to EventBridge have the following structure:

```typescript
{
  Source: 'pulseparty.ingestion',
  DetailType: 'MatchEvent',
  Detail: JSON.stringify({
    eventId: 'evt-123',
    matchId: 'match-456',
    eventType: 'goal',
    timestamp: '2024-01-15T10:30:00.000Z',
    teamId: 'team-789',
    playerId: 'player-101',
    metadata: {
      minute: 45,
      score: '1-0',
      priority: 'high',              // Added by publisher
      publishedAt: '2024-01-15T10:30:00.123Z'  // Added by publisher
    }
  }),
  EventBusName: 'PulsePartyEventBus',
  Resources: ['match:match-456']  // Match ID routing attribute
}
```

### Priority Classification

Events are automatically classified by priority based on their type:

**High Priority** (critical match events):
- `goal` - Goal scored
- `red_card` - Red card issued
- `assist` - Assist provided

**Medium Priority** (important match events):
- `yellow_card` - Yellow card issued
- `substitution` - Player substitution
- `corner` - Corner kick

**Low Priority** (informational events):
- `shot` - Shot on/off target
- `possession` - Possession update

### Error Handling

The publisher provides detailed error information through the `PublishResult` interface:

```typescript
interface PublishResult {
  success: boolean;      // Whether publish succeeded
  eventId?: string;      // EventBridge event ID (if successful)
  error?: Error;         // Error object (if failed)
  attempts: number;      // Number of attempts made
}
```

Example error handling:

```typescript
const result = await publishToEventBridge(event);

if (!result.success) {
  console.error(`Failed to publish event ${event.eventId}`);
  console.error(`Error: ${result.error?.message}`);
  console.error(`Attempts: ${result.attempts}`);
  
  // Send to dead-letter queue or alert monitoring
  await sendToDLQ(event, result.error);
}
```

### Batch Publishing

The `publishEventsToEventBridge` function handles batch publishing with automatic batching:

- Processes events in batches of 10 (EventBridge limit)
- Each event has individual retry logic
- Returns array of results matching input order
- Continues processing even if some events fail

```typescript
const events = [event1, event2, event3, /* ... up to 100 events */];
const results = await publishEventsToEventBridge(events);

// Check individual results
results.forEach((result, index) => {
  if (!result.success) {
    console.error(`Event ${index} failed:`, result.error);
  }
});

// Summary
const successCount = results.filter(r => r.success).length;
const failureCount = results.filter(r => !r.success).length;
console.log(`Success: ${successCount}, Failed: ${failureCount}`);
```

### Requirements Satisfied

- **Requirement 2.3**: Publish normalized event to EventBridge within 100ms
- **Requirement 12.1**: Publish event to EventBridge with match ID as routing attribute
- **Requirement 12.5**: Include event metadata (event type, priority, timestamp) in EventBridge message

### Environment Variables

The publisher uses the following environment variables:

- `AWS_REGION` - AWS region for EventBridge client (default: 'us-east-1')
- `EVENT_BUS_NAME` - EventBridge event bus name (default: 'PulsePartyEventBus')

### Testing

Run unit tests:
```bash
npm test -- eventBridgePublisher.test.ts
```

The test suite includes:
- Successful publish on first attempt
- Match ID routing attribute verification
- Event metadata inclusion (priority, timestamp)
- Priority classification for all event types
- Retry with exponential backoff
- Error handling after exhausted retries
- EventBridge FailedEntryCount handling
- Batch publishing with multiple events
- Mixed success/failure scenarios

## Complete Ingestion Pipeline

Here's how all three modules work together:

```typescript
import { parseXMLEvent } from './ingestion/xmlParser';
import { normalizeEvents, getValidEvents } from './ingestion/normalizer';
import { publishEventsToEventBridge } from './ingestion/eventBridgePublisher';

// 1. Parse XML feed
const parseResult = parseXMLEvent(xmlFeedString);

if (parseResult.errors.length > 0) {
  console.error('XML parsing errors:', parseResult.errors);
}

// 2. Normalize all parsed events
const normalizeResults = normalizeEvents(parseResult.events);
const validEvents = getValidEvents(normalizeResults);

console.log(`Normalized ${validEvents.length}/${parseResult.events.length} events`);

// 3. Publish to EventBridge
const publishResults = await publishEventsToEventBridge(validEvents);

// 4. Check results
const successCount = publishResults.filter(r => r.success).length;
console.log(`Published ${successCount}/${validEvents.length} events to EventBridge`);

// 5. Handle failures
const failures = publishResults.filter(r => !r.success);
if (failures.length > 0) {
  console.error(`${failures.length} events failed to publish`);
  // Send to DLQ, alert monitoring, etc.
}
```

### Performance Characteristics

- **XML Parsing**: < 200ms per event (Requirement 2.1)
- **Normalization**: < 10ms per event (in-memory validation)
- **EventBridge Publishing**: < 100ms per event (Requirement 2.3)
- **Total Pipeline**: < 310ms per event (well within requirements)

### Monitoring and Logging

All modules implement structured logging for CloudWatch:

```typescript
// XML Parser logs
console.error('XML parsing error:', { error, xmlSnippet, timestamp });

// Normalizer logs
console.error('Event normalization failed:', { errors, event, timestamp });

// Publisher logs
console.log('Successfully published event', { eventId, ebEventId, attempts });
console.error('EventBridge publish failed:', { error, eventId, matchId, attempts });
```

These logs enable:
- CloudWatch Insights queries
- Error rate monitoring
- Performance analysis
- Debugging failed events


## Simulator Mode

The `simulator.ts` module provides a fallback mechanism for demo purposes when the live event feed is unavailable. It replays recorded match events with realistic timing.

### Features

- **Recorded Event Replay**: 24 pre-recorded events covering a complete match scenario
- **Realistic Timing**: Events replay with actual time delays between them
- **Environment Variable Configuration**: Enable via `SIMULATOR_MODE` environment variable
- **Speed Multiplier**: Control replay speed (1.0 = real-time, 2.0 = 2x speed, etc.)
- **Loop Mode**: Optionally loop events for continuous replay
- **Automatic Metadata**: Tags events with `simulated: true` for user notification
- **Diverse Event Types**: Includes goals, cards, corners, shots, substitutions, possession updates
- **Seamless Integration**: Works with existing ingestion pipeline

### Requirements Satisfied

- **Requirement 2.7**: When event feed is unavailable, activate simulator mode and replay recorded events with realistic timing
- **Requirement 2.8**: While in simulator mode, indicate to users that simulated data is being used
- **Requirement 13.8**: Seamlessly operate in simulator mode without user intervention during demo

### Configuration

Enable simulator mode via environment variable:

```bash
# Enable simulator mode
export SIMULATOR_MODE=true

# Alternative formats
export SIMULATOR_MODE=1
export SIMULATOR_MODE=enabled

# Disable simulator mode
export SIMULATOR_MODE=false
# or unset the variable
```

### Usage

**Basic Usage:**

```typescript
import { createSimulator } from './ingestion/simulator';

// Create simulator (automatically detects SIMULATOR_MODE env var)
const simulator = createSimulator();

if (simulator.isEnabled()) {
  console.log('Simulator mode is active');
  
  simulator.start(async (event) => {
    console.log(`Event: ${event.eventType} at ${event.timestamp}`);
    
    // Check if simulated (Requirement 2.8)
    if (event.metadata.simulated) {
      console.log('⚠ Using simulated match data');
    }
    
    // Process event through normal pipeline
    const normalized = normalizeEvent(event);
    if (normalized.isValid) {
      await publishToEventBridge(normalized.event);
    }
  });
}
```

**Custom Configuration:**

```typescript
const simulator = createSimulator({
  enabled: true,           // Force enable (override env var)
  speedMultiplier: 10.0,   // 10x speed for demos
  loop: false,             // Don't loop events
});

simulator.start(async (event) => {
  // Process event
});

// Stop simulator when done
simulator.stop();
```

**Fallback Logic:**

```typescript
import { createSimulator } from './ingestion/simulator';

async function runIngestion(liveEventFeedAvailable: boolean) {
  if (liveEventFeedAvailable) {
    // Connect to live XML feed
    console.log('Using live event feed');
    // ... process live events
  } else {
    // Activate simulator mode as fallback
    console.log('Live feed unavailable - activating simulator mode');
    
    const simulator = createSimulator({
      enabled: true,
      speedMultiplier: 5.0,
    });
    
    simulator.start(async (event) => {
      // Process simulated events through same pipeline
      const normalized = normalizeEvent(event);
      if (normalized.isValid) {
        await publishToEventBridge(normalized.event);
      }
    });
  }
}
```

### Speed Multiplier

Control replay speed for different scenarios:

- `1.0` - Real-time (90 minutes for full match)
- `2.0` - 2x speed (45 minutes)
- `5.0` - 5x speed (18 minutes)
- `10.0` - 10x speed (9 minutes) - **recommended for demos**
- `0.5` - Half speed (180 minutes) - for detailed testing

```typescript
const simulator = createSimulator({
  speedMultiplier: 10.0, // 10x speed
});
```

### Loop Mode

Enable loop mode to continuously replay events:

```typescript
const simulator = createSimulator({
  enabled: true,
  loop: true, // Events will loop indefinitely
});

simulator.start(async (event) => {
  // Process event
});

// Simulator will restart from first event after completing all events
```

### Recorded Events

The simulator includes 24 pre-recorded events representing a realistic Germany vs France match:

**Event Types Included:**
- **Goals**: 3 goals with assists
- **Cards**: 2 yellow cards, 1 red card
- **Corners**: 4 corner kicks
- **Shots**: 5 shots (on target and off target)
- **Substitutions**: 2 player substitutions
- **Possession**: 4 possession updates
- **Assists**: 3 assists

**Match Timeline:**
- Minute 0: Match kickoff
- Minute 5-42: First half events
- Minute 45: Half-time
- Minute 60-89: Second half events
- Full 90-minute match coverage

**Event Metadata:**
Each event includes rich metadata:
- Match minute
- Half (1 or 2)
- Score updates (for goals)
- Player names
- Event descriptions
- Additional context (e.g., "from corner", "on target")

### State Management

Track simulator state:

```typescript
const simulator = createSimulator({ enabled: true });

// Check if enabled
console.log('Enabled:', simulator.isEnabled());

// Check if currently running
console.log('Active:', simulator.isActive());

// Get current state
const state = simulator.getState();
console.log('Current event index:', state.currentEventIndex);
console.log('Events replayed:', state.eventsReplayed);
console.log('Start time:', state.startTime);

// Get configuration
const config = simulator.getConfig();
console.log('Speed multiplier:', config.speedMultiplier);
console.log('Loop mode:', config.loop);
```

### Error Handling

The simulator handles errors gracefully:

```typescript
simulator.start(async (event) => {
  try {
    // Process event
    await processEvent(event);
  } catch (error) {
    // Error is logged, but simulator continues with next event
    console.error('Error processing event:', error);
  }
});

// Simulator will continue even if individual events fail
```

### User Notification

Indicate simulator mode to users (Requirement 2.8):

```typescript
function getUserNotification(event: MatchEvent): string {
  if (event.metadata.simulated) {
    return '⚠ Demo Mode: Using simulated match data';
  } else {
    return '✓ Live Mode: Real-time match events';
  }
}

simulator.start(async (event) => {
  const notification = getUserNotification(event);
  console.log(notification);
  
  // Send notification to frontend via WebSocket
  await broadcastToRoom(roomId, {
    type: 'system_notification',
    message: notification,
  });
});
```

### Integration Example

Complete integration with ingestion pipeline:

```typescript
import { createSimulator } from './ingestion/simulator';
import { normalizeEvent } from './ingestion/normalizer';
import { publishToEventBridge } from './ingestion/eventBridgePublisher';

async function runIngestionPipeline() {
  const simulator = createSimulator({
    speedMultiplier: 10.0, // 10x speed for demo
  });

  if (!simulator.isEnabled()) {
    console.log('Simulator disabled - would connect to live feed');
    return;
  }

  console.log('Starting simulator mode...');
  
  let eventsProcessed = 0;
  let eventsPublished = 0;

  simulator.start(async (event) => {
    try {
      // Normalize event
      const normalized = normalizeEvent(event);
      
      if (!normalized.isValid) {
        console.error('Normalization failed:', normalized.errors);
        return;
      }

      // Publish to EventBridge
      const result = await publishToEventBridge(normalized.event!);
      
      if (result.success) {
        eventsPublished++;
        console.log(`✓ Published event ${eventsProcessed + 1}`);
      } else {
        console.error(`✗ Publish failed:`, result.error);
      }

      eventsProcessed++;
    } catch (error) {
      console.error('Error processing event:', error);
    }
  });

  // Wait for completion
  await new Promise<void>((resolve) => {
    const checkInterval = setInterval(() => {
      if (!simulator.isActive()) {
        clearInterval(checkInterval);
        console.log(`\nCompleted: ${eventsPublished}/${eventsProcessed} events published`);
        resolve();
      }
    }, 100);
  });
}
```

### Testing

Run unit tests:
```bash
npm test -- simulator.test.ts
```

The test suite includes:
- Simulator initialization and configuration
- Environment variable detection (true, 1, enabled)
- Event replay with realistic timing
- Speed multiplier application
- Simulated event metadata tagging
- Loop mode functionality
- State management tracking
- Error handling during replay
- Stop functionality
- Factory function usage
- Recorded events validation
- Chronological event ordering
- Diverse event type coverage

### Examples

See `simulatorExample.ts` for complete integration examples:
- Basic simulator usage
- Fallback logic when live feed unavailable
- User notification for simulator mode
- Complete ingestion pipeline with simulator

Run the example:
```bash
export SIMULATOR_MODE=true
npm run build
node dist/ingestion/simulatorExample.js
```

### Performance

- **Event Replay**: Configurable timing based on speed multiplier
- **Memory Usage**: Minimal (24 events pre-loaded)
- **CPU Usage**: Low (simple setTimeout scheduling)
- **Scalability**: Single simulator per ingestion Lambda instance

### Monitoring

The simulator logs all activity for CloudWatch monitoring:

```typescript
// Startup logs
console.log('Starting simulator mode...');
console.log(`Speed multiplier: ${speedMultiplier}x`);
console.log(`Loop mode: ${loop ? 'enabled' : 'disabled'}`);

// Event replay logs
console.log(`[Simulator] Replaying event ${index}/${total}: ${eventType} at ${timestamp}`);

// Completion logs
console.log(`Simulator stopped. Replayed ${eventsReplayed} events.`);

// Error logs
console.error('[Simulator] Error replaying event:', error);
```

These logs enable:
- Simulator activation tracking
- Event replay monitoring
- Error rate analysis
- Performance debugging
