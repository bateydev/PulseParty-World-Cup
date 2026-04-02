import { parseXMLEvent } from './xmlParser';

describe('XML Parser - Task 4.1', () => {
  describe('parseXMLEvent - complete event parsing', () => {
    it('should parse XML event with all fields', () => {
      const xml = `
        <event>
          <eventId>evt_123</eventId>
          <matchId>match_456</matchId>
          <eventType>goal</eventType>
          <timestamp>2024-01-15T10:30:00Z</timestamp>
          <teamId>team_789</teamId>
          <playerId>player_101</playerId>
          <minute>45</minute>
          <half>1</half>
        </event>
      `;

      const result = parseXMLEvent(xml);

      expect(result.errors).toHaveLength(0);
      expect(result.events).toHaveLength(1);

      const event = result.events[0];
      expect(event.eventId).toBe('evt_123');
      expect(event.matchId).toBe('match_456');
      expect(event.eventType).toBe('goal');
      expect(event.timestamp).toBe('2024-01-15T10:30:00.000Z');
      expect(event.teamId).toBe('team_789');
      expect(event.playerId).toBe('player_101');
      expect(event.metadata.minute).toBe(45);
      expect(event.metadata.half).toBe(1);
    });

    it('should parse XML event with missing optional fields', () => {
      const xml = `
        <event>
          <matchId>match_456</matchId>
          <eventType>corner</eventType>
          <timestamp>2024-01-15T10:35:00Z</timestamp>
          <teamId>team_789</teamId>
        </event>
      `;

      const result = parseXMLEvent(xml);

      expect(result.errors).toHaveLength(0);
      expect(result.events).toHaveLength(1);

      const event = result.events[0];
      expect(event.matchId).toBe('match_456');
      expect(event.eventType).toBe('corner');
      expect(event.timestamp).toBe('2024-01-15T10:35:00.000Z');
      expect(event.teamId).toBe('team_789');
      expect(event.playerId).toBeUndefined();
      expect(event.eventId).toBeDefined(); // Should be auto-generated
    });

    it('should parse multiple events from XML', () => {
      const xml = `
        <events>
          <event>
            <matchId>match_1</matchId>
            <eventType>goal</eventType>
            <timestamp>2024-01-15T10:30:00Z</timestamp>
            <teamId>team_1</teamId>
          </event>
          <event>
            <matchId>match_1</matchId>
            <eventType>yellow_card</eventType>
            <timestamp>2024-01-15T10:35:00Z</timestamp>
            <teamId>team_2</teamId>
            <playerId>player_5</playerId>
          </event>
        </events>
      `;

      const result = parseXMLEvent(xml);

      expect(result.errors).toHaveLength(0);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].eventType).toBe('goal');
      expect(result.events[1].eventType).toBe('yellow_card');
      expect(result.events[1].playerId).toBe('player_5');
    });
  });

  describe('parseXMLEvent - event type normalization', () => {
    it('should normalize various event type formats', () => {
      const testCases = [
        { input: 'goal', expected: 'goal' },
        { input: 'GOAL', expected: 'goal' },
        { input: 'yellow_card', expected: 'yellow_card' },
        { input: 'yellowcard', expected: 'yellow_card' },
        { input: 'yellow', expected: 'yellow_card' },
        { input: 'red_card', expected: 'red_card' },
        { input: 'redcard', expected: 'red_card' },
        { input: 'substitution', expected: 'substitution' },
        { input: 'sub', expected: 'substitution' },
      ];

      testCases.forEach(({ input, expected }) => {
        const xml = `
          <event>
            <matchId>match_1</matchId>
            <eventType>${input}</eventType>
            <timestamp>2024-01-15T10:30:00Z</timestamp>
            <teamId>team_1</teamId>
          </event>
        `;

        const result = parseXMLEvent(xml);
        expect(result.events[0].eventType).toBe(expected);
      });
    });
  });

  describe('parseXMLEvent - error handling', () => {
    it('should handle malformed XML and log error', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const xml = '<event><matchId>test</matchId><unclosed>';

      const result = parseXMLEvent(xml);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toBeDefined();
      expect(result.errors[0].xmlSnippet).toBeDefined();
      expect(result.errors[0].timestamp).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing required fields', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const xml = `
        <event>
          <matchId>match_1</matchId>
          <timestamp>2024-01-15T10:30:00Z</timestamp>
        </event>
      `;

      const result = parseXMLEvent(xml);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('eventType');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should continue processing after encountering error in one event', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const xml = `
        <events>
          <event>
            <matchId>match_1</matchId>
            <timestamp>2024-01-15T10:30:00Z</timestamp>
          </event>
          <event>
            <matchId>match_1</matchId>
            <eventType>goal</eventType>
            <timestamp>2024-01-15T10:35:00Z</timestamp>
            <teamId>team_1</teamId>
          </event>
        </events>
      `;

      const result = parseXMLEvent(xml);

      expect(result.errors).toHaveLength(1);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventType).toBe('goal');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty XML', () => {
      const xml = '';

      const result = parseXMLEvent(xml);

      expect(result.events).toHaveLength(0);
    });

    it('should handle invalid timestamp format', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const xml = `
        <event>
          <matchId>match_1</matchId>
          <eventType>goal</eventType>
          <timestamp>invalid-date</timestamp>
          <teamId>team_1</teamId>
        </event>
      `;

      const result = parseXMLEvent(xml);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('parseXMLEvent - different XML structures', () => {
    it('should parse matchEvents/matchEvent structure', () => {
      const xml = `
        <matchEvents>
          <matchEvent>
            <matchId>match_1</matchId>
            <eventType>goal</eventType>
            <timestamp>2024-01-15T10:30:00Z</timestamp>
            <teamId>team_1</teamId>
          </matchEvent>
        </matchEvents>
      `;

      const result = parseXMLEvent(xml);

      expect(result.errors).toHaveLength(0);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventType).toBe('goal');
    });

    it('should parse attributes as fields', () => {
      const xml = `
        <event type="goal" matchId="match_1" timestamp="2024-01-15T10:30:00Z" teamId="team_1">
          <playerId>player_1</playerId>
        </event>
      `;

      const result = parseXMLEvent(xml);

      expect(result.errors).toHaveLength(0);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventType).toBe('goal');
      expect(result.events[0].matchId).toBe('match_1');
    });
  });

  describe('parseXMLEvent - metadata extraction', () => {
    it('should extract additional fields as metadata', () => {
      const xml = `
        <event>
          <matchId>match_1</matchId>
          <eventType>goal</eventType>
          <timestamp>2024-01-15T10:30:00Z</timestamp>
          <teamId>team_1</teamId>
          <minute>45</minute>
          <half>1</half>
          <assistPlayer>player_2</assistPlayer>
          <goalType>header</goalType>
        </event>
      `;

      const result = parseXMLEvent(xml);

      expect(result.errors).toHaveLength(0);
      expect(result.events).toHaveLength(1);

      const event = result.events[0];
      expect(event.metadata.minute).toBe(45);
      expect(event.metadata.half).toBe(1);
      expect(event.metadata.assistPlayer).toBe('player_2');
      expect(event.metadata.goalType).toBe('header');
    });
  });
});
