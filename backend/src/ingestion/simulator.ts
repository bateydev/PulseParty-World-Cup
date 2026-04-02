import { MatchEvent } from '../types';

/**
 * Simulator Mode
 * Provides fallback mechanism for demo purposes when live event feed is unavailable
 * Replays recorded match events with realistic timing
 *
 * Requirements:
 * - 2.7: When event feed is unavailable, activate simulator mode and replay recorded events with realistic timing
 * - 2.8: While in simulator mode, indicate to users that simulated data is being used
 * - 13.8: Seamlessly operate in simulator mode without user intervention during demo
 */

export interface SimulatorConfig {
  enabled: boolean;
  speedMultiplier: number; // 1.0 = real-time, 2.0 = 2x speed, 0.5 = half speed
  loop: boolean; // Whether to loop events after completion
}

export interface SimulatorState {
  isActive: boolean;
  currentEventIndex: number;
  startTime: Date;
  eventsReplayed: number;
}

/**
 * Recorded match events for simulator mode
 * These represent a realistic match scenario with various event types
 */
export const RECORDED_MATCH_EVENTS: MatchEvent[] = [
  {
    eventId: 'sim_event_001',
    matchId: 'match_demo_001',
    eventType: 'possession',
    timestamp: '2026-06-15T14:00:00.000Z',
    teamId: 'team_ger',
    metadata: {
      possession: 55,
      minute: 0,
      half: 1,
      description: 'Match kickoff',
    },
  },
  {
    eventId: 'sim_event_002',
    matchId: 'match_demo_001',
    eventType: 'shot',
    timestamp: '2026-06-15T14:05:30.000Z',
    teamId: 'team_ger',
    playerId: 'player_mueller',
    metadata: {
      minute: 5,
      half: 1,
      onTarget: true,
      description: 'Shot on target by Mueller',
    },
  },
  {
    eventId: 'sim_event_003',
    matchId: 'match_demo_001',
    eventType: 'corner',
    timestamp: '2026-06-15T14:08:15.000Z',
    teamId: 'team_ger',
    metadata: {
      minute: 8,
      half: 1,
      description: 'Corner kick for Germany',
    },
  },
  {
    eventId: 'sim_event_004',
    matchId: 'match_demo_001',
    eventType: 'yellow_card',
    timestamp: '2026-06-15T14:12:45.000Z',
    teamId: 'team_fra',
    playerId: 'player_kante',
    metadata: {
      minute: 12,
      half: 1,
      reason: 'Tactical foul',
      description: 'Yellow card for Kante',
    },
  },
  {
    eventId: 'sim_event_005',
    matchId: 'match_demo_001',
    eventType: 'shot',
    timestamp: '2026-06-15T14:18:20.000Z',
    teamId: 'team_fra',
    playerId: 'player_mbappe',
    metadata: {
      minute: 18,
      half: 1,
      onTarget: false,
      description: 'Shot wide by Mbappe',
    },
  },
  {
    eventId: 'sim_event_006',
    matchId: 'match_demo_001',
    eventType: 'goal',
    timestamp: '2026-06-15T14:23:45.000Z',
    teamId: 'team_ger',
    playerId: 'player_mueller',
    metadata: {
      minute: 23,
      half: 1,
      assistBy: 'player_kroos',
      score: { home: 1, away: 0 },
      description: 'GOAL! Mueller scores for Germany',
    },
  },
  {
    eventId: 'sim_event_007',
    matchId: 'match_demo_001',
    eventType: 'assist',
    timestamp: '2026-06-15T14:23:45.000Z',
    teamId: 'team_ger',
    playerId: 'player_kroos',
    metadata: {
      minute: 23,
      half: 1,
      goalScorer: 'player_mueller',
      description: 'Assist by Kroos',
    },
  },
  {
    eventId: 'sim_event_008',
    matchId: 'match_demo_001',
    eventType: 'possession',
    timestamp: '2026-06-15T14:30:00.000Z',
    teamId: 'team_fra',
    metadata: {
      possession: 48,
      minute: 30,
      half: 1,
      description: 'Possession update',
    },
  },
  {
    eventId: 'sim_event_009',
    matchId: 'match_demo_001',
    eventType: 'corner',
    timestamp: '2026-06-15T14:35:10.000Z',
    teamId: 'team_fra',
    metadata: {
      minute: 35,
      half: 1,
      description: 'Corner kick for France',
    },
  },
  {
    eventId: 'sim_event_010',
    matchId: 'match_demo_001',
    eventType: 'shot',
    timestamp: '2026-06-15T14:35:25.000Z',
    teamId: 'team_fra',
    playerId: 'player_griezmann',
    metadata: {
      minute: 35,
      half: 1,
      onTarget: true,
      fromCorner: true,
      description: 'Header from corner by Griezmann',
    },
  },
  {
    eventId: 'sim_event_011',
    matchId: 'match_demo_001',
    eventType: 'goal',
    timestamp: '2026-06-15T14:42:30.000Z',
    teamId: 'team_fra',
    playerId: 'player_mbappe',
    metadata: {
      minute: 42,
      half: 1,
      assistBy: 'player_griezmann',
      score: { home: 1, away: 1 },
      description: 'GOAL! Mbappe equalizes for France',
    },
  },
  {
    eventId: 'sim_event_012',
    matchId: 'match_demo_001',
    eventType: 'assist',
    timestamp: '2026-06-15T14:42:30.000Z',
    teamId: 'team_fra',
    playerId: 'player_griezmann',
    metadata: {
      minute: 42,
      half: 1,
      goalScorer: 'player_mbappe',
      description: 'Assist by Griezmann',
    },
  },
  {
    eventId: 'sim_event_013',
    matchId: 'match_demo_001',
    eventType: 'possession',
    timestamp: '2026-06-15T15:00:00.000Z',
    teamId: 'team_ger',
    metadata: {
      possession: 52,
      minute: 45,
      half: 2,
      description: 'Second half begins',
    },
  },
  {
    eventId: 'sim_event_014',
    matchId: 'match_demo_001',
    eventType: 'substitution',
    timestamp: '2026-06-15T15:15:00.000Z',
    teamId: 'team_ger',
    playerId: 'player_sane',
    metadata: {
      minute: 60,
      half: 2,
      playerOut: 'player_gnabry',
      playerIn: 'player_sane',
      description: 'Substitution: Sane replaces Gnabry',
    },
  },
  {
    eventId: 'sim_event_015',
    matchId: 'match_demo_001',
    eventType: 'yellow_card',
    timestamp: '2026-06-15T15:20:30.000Z',
    teamId: 'team_ger',
    playerId: 'player_kimmich',
    metadata: {
      minute: 65,
      half: 2,
      reason: 'Dissent',
      description: 'Yellow card for Kimmich',
    },
  },
  {
    eventId: 'sim_event_016',
    matchId: 'match_demo_001',
    eventType: 'corner',
    timestamp: '2026-06-15T15:25:45.000Z',
    teamId: 'team_ger',
    metadata: {
      minute: 70,
      half: 2,
      description: 'Corner kick for Germany',
    },
  },
  {
    eventId: 'sim_event_017',
    matchId: 'match_demo_001',
    eventType: 'shot',
    timestamp: '2026-06-15T15:26:00.000Z',
    teamId: 'team_ger',
    playerId: 'player_rudiger',
    metadata: {
      minute: 70,
      half: 2,
      onTarget: true,
      fromCorner: true,
      description: 'Header from corner by Rudiger',
    },
  },
  {
    eventId: 'sim_event_018',
    matchId: 'match_demo_001',
    eventType: 'goal',
    timestamp: '2026-06-15T15:32:15.000Z',
    teamId: 'team_ger',
    playerId: 'player_sane',
    metadata: {
      minute: 77,
      half: 2,
      assistBy: 'player_kimmich',
      score: { home: 2, away: 1 },
      description: 'GOAL! Sane gives Germany the lead',
    },
  },
  {
    eventId: 'sim_event_019',
    matchId: 'match_demo_001',
    eventType: 'assist',
    timestamp: '2026-06-15T15:32:15.000Z',
    teamId: 'team_ger',
    playerId: 'player_kimmich',
    metadata: {
      minute: 77,
      half: 2,
      goalScorer: 'player_sane',
      description: 'Assist by Kimmich',
    },
  },
  {
    eventId: 'sim_event_020',
    matchId: 'match_demo_001',
    eventType: 'substitution',
    timestamp: '2026-06-15T15:35:00.000Z',
    teamId: 'team_fra',
    playerId: 'player_coman',
    metadata: {
      minute: 80,
      half: 2,
      playerOut: 'player_dembele',
      playerIn: 'player_coman',
      description: 'Substitution: Coman replaces Dembele',
    },
  },
  {
    eventId: 'sim_event_021',
    matchId: 'match_demo_001',
    eventType: 'red_card',
    timestamp: '2026-06-15T15:38:30.000Z',
    teamId: 'team_fra',
    playerId: 'player_kante',
    metadata: {
      minute: 83,
      half: 2,
      reason: 'Second yellow card',
      description: 'RED CARD! Kante sent off',
    },
  },
  {
    eventId: 'sim_event_022',
    matchId: 'match_demo_001',
    eventType: 'possession',
    timestamp: '2026-06-15T15:42:00.000Z',
    teamId: 'team_ger',
    metadata: {
      possession: 58,
      minute: 87,
      half: 2,
      description: 'Germany controlling possession',
    },
  },
  {
    eventId: 'sim_event_023',
    matchId: 'match_demo_001',
    eventType: 'corner',
    timestamp: '2026-06-15T15:44:15.000Z',
    teamId: 'team_fra',
    metadata: {
      minute: 89,
      half: 2,
      description: 'Late corner for France',
    },
  },
  {
    eventId: 'sim_event_024',
    matchId: 'match_demo_001',
    eventType: 'shot',
    timestamp: '2026-06-15T15:44:30.000Z',
    teamId: 'team_fra',
    playerId: 'player_varane',
    metadata: {
      minute: 89,
      half: 2,
      onTarget: false,
      fromCorner: true,
      description: 'Header wide by Varane',
    },
  },
];

/**
 * Simulator class for replaying recorded match events
 */
export class MatchEventSimulator {
  private config: SimulatorConfig;
  private state: SimulatorState;
  private events: MatchEvent[];
  private timer: NodeJS.Timeout | null = null;

  constructor(config: Partial<SimulatorConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? this.isSimulatorModeEnabled(),
      speedMultiplier: config.speedMultiplier ?? 1.0,
      loop: config.loop ?? false,
    };

    this.state = {
      isActive: false,
      currentEventIndex: 0,
      startTime: new Date(),
      eventsReplayed: 0,
    };

    this.events = RECORDED_MATCH_EVENTS;
  }

  /**
   * Check if simulator mode is enabled via environment variable
   * Requirement 2.7: Environment variable to toggle simulator mode
   */
  private isSimulatorModeEnabled(): boolean {
    const envValue = process.env.SIMULATOR_MODE;
    return envValue === 'true' || envValue === '1' || envValue === 'enabled';
  }

  /**
   * Start the simulator
   * Begins replaying recorded events with realistic timing
   *
   * @param onEvent - Callback function to handle each replayed event
   */
  public start(onEvent: (event: MatchEvent) => void | Promise<void>): void {
    if (!this.config.enabled) {
      console.log('Simulator mode is disabled');
      return;
    }

    if (this.state.isActive) {
      console.log('Simulator is already running');
      return;
    }

    console.log('Starting simulator mode...');
    console.log(`Speed multiplier: ${this.config.speedMultiplier}x`);
    console.log(`Loop mode: ${this.config.loop ? 'enabled' : 'disabled'}`);
    console.log(`Total events: ${this.events.length}`);

    this.state.isActive = true;
    this.state.startTime = new Date();
    this.state.currentEventIndex = 0;
    this.state.eventsReplayed = 0;

    this.scheduleNextEvent(onEvent);
  }

  /**
   * Schedule the next event to be replayed
   * Calculates realistic timing based on event timestamps
   */
  private scheduleNextEvent(
    onEvent: (event: MatchEvent) => void | Promise<void>
  ): void {
    if (!this.state.isActive) {
      return;
    }

    // Check if we've replayed all events
    if (this.state.currentEventIndex >= this.events.length) {
      if (this.config.loop) {
        console.log('Looping simulator events...');
        this.state.currentEventIndex = 0;
        this.state.startTime = new Date();
      } else {
        console.log('Simulator completed all events');
        this.stop();
        return;
      }
    }

    const currentEvent = this.events[this.state.currentEventIndex];
    const nextIndex = this.state.currentEventIndex + 1;

    // Calculate delay until next event
    let delay = 0;
    if (nextIndex < this.events.length) {
      const currentTime = new Date(currentEvent.timestamp).getTime();
      const nextTime = new Date(this.events[nextIndex].timestamp).getTime();
      const realDelay = nextTime - currentTime;

      // Apply speed multiplier
      delay = realDelay / this.config.speedMultiplier;
    }

    // Replay current event
    this.timer = setTimeout(async () => {
      try {
        // Add simulator metadata to event
        const simulatedEvent: MatchEvent = {
          ...currentEvent,
          metadata: {
            ...currentEvent.metadata,
            simulated: true,
            simulatorTimestamp: new Date().toISOString(),
          },
        };

        console.log(
          `[Simulator] Replaying event ${this.state.currentEventIndex + 1}/${this.events.length}: ${simulatedEvent.eventType} at ${simulatedEvent.timestamp}`
        );

        // Call the event handler
        await onEvent(simulatedEvent);

        this.state.eventsReplayed++;
        this.state.currentEventIndex++;

        // Schedule next event
        this.scheduleNextEvent(onEvent);
      } catch (error) {
        console.error('[Simulator] Error replaying event:', error);
        // Continue with next event even if current one fails
        this.state.currentEventIndex++;
        this.scheduleNextEvent(onEvent);
      }
    }, delay);
  }

  /**
   * Stop the simulator
   */
  public stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.state.isActive = false;
    console.log(
      `Simulator stopped. Replayed ${this.state.eventsReplayed} events.`
    );
  }

  /**
   * Get current simulator state
   */
  public getState(): SimulatorState {
    return { ...this.state };
  }

  /**
   * Get simulator configuration
   */
  public getConfig(): SimulatorConfig {
    return { ...this.config };
  }

  /**
   * Check if simulator is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if simulator is currently active
   */
  public isActive(): boolean {
    return this.state.isActive;
  }
}

/**
 * Create and configure a simulator instance
 * @param config - Optional simulator configuration
 * @returns Configured simulator instance
 */
export function createSimulator(
  config?: Partial<SimulatorConfig>
): MatchEventSimulator {
  return new MatchEventSimulator(config);
}
