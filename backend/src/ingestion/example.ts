/**
 * Example: XML Parser + Normalizer Integration
 *
 * This example demonstrates how to use the XML parser and normalizer together
 * to process match event feeds.
 */

import { parseXMLEvent } from './xmlParser';
import { normalizeEvents, getValidEvents } from './normalizer';

// Example XML match event feed
const sampleXML = `
<events>
  <event>
    <matchId>match_wc2026_001</matchId>
    <eventType>goal</eventType>
    <timestamp>2026-06-15T14:23:45.000Z</timestamp>
    <teamId>team_ger</teamId>
    <playerId>player_mueller</playerId>
    <minute>23</minute>
    <half>1</half>
  </event>
  <event>
    <matchId>match_wc2026_001</matchId>
    <eventType>yellow_card</eventType>
    <timestamp>2026-06-15T14:35:12.000Z</timestamp>
    <teamId>team_fra</teamId>
    <playerId>player_mbappe</playerId>
    <minute>35</minute>
  </event>
  <event>
    <matchId>match_wc2026_001</matchId>
    <eventType>corner</eventType>
    <timestamp>2026-06-15T14:42:30.000Z</timestamp>
    <teamId>team_ger</teamId>
    <minute>42</minute>
  </event>
</events>
`;

/**
 * Process match event feed
 */
export function processMatchEventFeed(xml: string): void {
  console.log('=== Processing Match Event Feed ===\n');

  // Step 1: Parse XML
  console.log('Step 1: Parsing XML...');
  const parseResult = parseXMLEvent(xml);

  console.log(`✓ Parsed ${parseResult.events.length} events`);
  if (parseResult.errors.length > 0) {
    console.log(`⚠ ${parseResult.errors.length} parsing errors occurred`);
    parseResult.errors.forEach((error) => {
      console.log(`  - ${error.message}`);
    });
  }
  console.log();

  // Step 2: Normalize events
  console.log('Step 2: Normalizing events...');
  const normalizeResults = normalizeEvents(parseResult.events);

  const validCount = normalizeResults.filter((r) => r.isValid).length;
  const invalidCount = normalizeResults.length - validCount;

  console.log(`✓ ${validCount} valid events`);
  if (invalidCount > 0) {
    console.log(`⚠ ${invalidCount} invalid events`);
    normalizeResults.forEach((result, index) => {
      if (!result.isValid) {
        console.log(`  Event ${index + 1} validation errors:`);
        result.errors.forEach((error) => {
          console.log(`    - ${error.field}: ${error.message}`);
        });
      }
    });
  }
  console.log();

  // Step 3: Extract valid events
  console.log('Step 3: Extracting valid events...');
  const validEvents = getValidEvents(normalizeResults);

  console.log(`✓ ${validEvents.length} events ready for processing\n`);

  // Step 4: Display processed events
  console.log('=== Processed Events ===\n');
  validEvents.forEach((event, index) => {
    console.log(`Event ${index + 1}:`);
    console.log(`  Type: ${event.eventType}`);
    console.log(`  Match: ${event.matchId}`);
    console.log(`  Team: ${event.teamId}`);
    console.log(`  Time: ${event.timestamp}`);
    if (event.playerId) {
      console.log(`  Player: ${event.playerId}`);
    }
    if (Object.keys(event.metadata).length > 0) {
      console.log(`  Metadata:`, event.metadata);
    }
    console.log();
  });

  // Step 5: Ready for EventBridge
  console.log('=== Next Steps ===');
  console.log('✓ Events are normalized and validated');
  console.log('✓ Ready to publish to EventBridge');
  console.log('✓ Ready to route to match rooms');
  console.log();
}

// Run example if executed directly
if (require.main === module) {
  processMatchEventFeed(sampleXML);
}
