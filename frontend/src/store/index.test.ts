import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './index';

describe('Store Message Handlers', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      user: null,
      locale: 'en',
      currentRoom: null,
      participants: [],
      matchEvents: [],
      currentScore: { home: 0, away: 0 },
      activePredictionWindow: null,
      userPredictions: [],
      leaderboard: [],
      wsConnected: false,
      reconnecting: false,
      wsManager: null,
    });
  });

  describe('Match Event Handler', () => {
    it('should add match event to matchEvents state', () => {
      const store = useAppStore.getState();
      const matchEvent = {
        eventId: 'evt-1',
        matchId: 'match-1',
        eventType: 'goal',
        timestamp: '2024-01-01T12:00:00Z',
        teamId: 'team-1',
        playerId: 'player-1',
        metadata: {},
      };

      store.addMatchEvent(matchEvent);

      const state = useAppStore.getState();
      expect(state.matchEvents).toHaveLength(1);
      expect(state.matchEvents[0]).toEqual(matchEvent);
    });

    it('should handle multiple match events', () => {
      const store = useAppStore.getState();
      const event1 = {
        eventId: 'evt-1',
        matchId: 'match-1',
        eventType: 'goal',
        timestamp: '2024-01-01T12:00:00Z',
        teamId: 'team-1',
        metadata: {},
      };
      const event2 = {
        eventId: 'evt-2',
        matchId: 'match-1',
        eventType: 'corner',
        timestamp: '2024-01-01T12:05:00Z',
        teamId: 'team-2',
        metadata: {},
      };

      store.addMatchEvent(event1);
      store.addMatchEvent(event2);

      const state = useAppStore.getState();
      expect(state.matchEvents).toHaveLength(2);
      expect(state.matchEvents[0]).toEqual(event1);
      expect(state.matchEvents[1]).toEqual(event2);
    });
  });

  describe('Prediction Window Handler', () => {
    it('should set active prediction window', () => {
      const store = useAppStore.getState();
      const predictionWindow = {
        windowId: 'window-1',
        roomId: 'room-1',
        matchId: 'match-1',
        predictionType: 'next_goal_scorer',
        options: ['Player A', 'Player B', 'Player C'],
        expiresAt: '2024-01-01T12:05:00Z',
        createdAt: '2024-01-01T12:00:00Z',
      };

      store.setActivePredictionWindow(predictionWindow);

      const state = useAppStore.getState();
      expect(state.activePredictionWindow).toEqual(predictionWindow);
    });

    it('should clear active prediction window', () => {
      const store = useAppStore.getState();
      const predictionWindow = {
        windowId: 'window-1',
        roomId: 'room-1',
        matchId: 'match-1',
        predictionType: 'next_goal_scorer',
        options: ['Player A', 'Player B'],
        expiresAt: '2024-01-01T12:05:00Z',
        createdAt: '2024-01-01T12:00:00Z',
      };

      store.setActivePredictionWindow(predictionWindow);
      expect(useAppStore.getState().activePredictionWindow).toEqual(
        predictionWindow
      );

      store.setActivePredictionWindow(null);
      expect(useAppStore.getState().activePredictionWindow).toBeNull();
    });
  });

  describe('Leaderboard Handler', () => {
    it('should update leaderboard state', () => {
      const store = useAppStore.getState();
      const leaderboard = [
        {
          userId: 'user-1',
          displayName: 'Player 1',
          totalPoints: 100,
          streak: 3,
          rank: 1,
        },
        {
          userId: 'user-2',
          displayName: 'Player 2',
          totalPoints: 75,
          streak: 1,
          rank: 2,
        },
      ];

      store.setLeaderboard(leaderboard);

      const state = useAppStore.getState();
      expect(state.leaderboard).toEqual(leaderboard);
    });

    it('should replace existing leaderboard', () => {
      const store = useAppStore.getState();
      const initialLeaderboard = [
        {
          userId: 'user-1',
          displayName: 'Player 1',
          totalPoints: 50,
          streak: 1,
          rank: 1,
        },
      ];
      const updatedLeaderboard = [
        {
          userId: 'user-1',
          displayName: 'Player 1',
          totalPoints: 100,
          streak: 3,
          rank: 1,
        },
        {
          userId: 'user-2',
          displayName: 'Player 2',
          totalPoints: 75,
          streak: 1,
          rank: 2,
        },
      ];

      store.setLeaderboard(initialLeaderboard);
      expect(useAppStore.getState().leaderboard).toEqual(initialLeaderboard);

      store.setLeaderboard(updatedLeaderboard);
      expect(useAppStore.getState().leaderboard).toEqual(updatedLeaderboard);
    });
  });

  describe('Participants Handler', () => {
    it('should update participants state', () => {
      const store = useAppStore.getState();
      const participants = [
        { userId: 'user-1', displayName: 'Player 1', isGuest: false },
        { userId: 'user-2', displayName: 'Player 2', isGuest: true },
      ];

      store.setParticipants(participants);

      const state = useAppStore.getState();
      expect(state.participants).toEqual(participants);
    });

    it('should handle participant list updates', () => {
      const store = useAppStore.getState();
      const initialParticipants = [
        { userId: 'user-1', displayName: 'Player 1', isGuest: false },
      ];
      const updatedParticipants = [
        { userId: 'user-1', displayName: 'Player 1', isGuest: false },
        { userId: 'user-2', displayName: 'Player 2', isGuest: true },
        { userId: 'user-3', displayName: 'Player 3', isGuest: true },
      ];

      store.setParticipants(initialParticipants);
      expect(useAppStore.getState().participants).toEqual(initialParticipants);

      store.setParticipants(updatedParticipants);
      expect(useAppStore.getState().participants).toEqual(updatedParticipants);
    });
  });

  describe('Score Update Handler', () => {
    it('should update current score', () => {
      const store = useAppStore.getState();
      const score = { home: 2, away: 1 };

      store.updateScore(score);

      const state = useAppStore.getState();
      expect(state.currentScore).toEqual(score);
    });

    it('should handle score changes', () => {
      const store = useAppStore.getState();

      store.updateScore({ home: 1, away: 0 });
      expect(useAppStore.getState().currentScore).toEqual({ home: 1, away: 0 });

      store.updateScore({ home: 1, away: 1 });
      expect(useAppStore.getState().currentScore).toEqual({ home: 1, away: 1 });

      store.updateScore({ home: 2, away: 1 });
      expect(useAppStore.getState().currentScore).toEqual({ home: 2, away: 1 });
    });
  });

  describe('Room State Handler', () => {
    it('should handle initial room state message', () => {
      const store = useAppStore.getState();
      const room = {
        roomId: 'room-1',
        roomCode: 'ABC123',
        matchId: 'match-1',
        theme: 'Country' as const,
      };
      const participants = [
        { userId: 'user-1', displayName: 'Player 1', isGuest: false },
      ];
      const leaderboard = [
        {
          userId: 'user-1',
          displayName: 'Player 1',
          totalPoints: 50,
          streak: 1,
          rank: 1,
        },
      ];
      const score = { home: 1, away: 0 };

      store.setCurrentRoom(room);
      store.setParticipants(participants);
      store.setLeaderboard(leaderboard);
      store.updateScore(score);

      const state = useAppStore.getState();
      expect(state.currentRoom).toEqual(room);
      expect(state.participants).toEqual(participants);
      expect(state.leaderboard).toEqual(leaderboard);
      expect(state.currentScore).toEqual(score);
    });
  });

  describe('Reset Match State', () => {
    it('should reset all match-related state', () => {
      const store = useAppStore.getState();

      // Set up some state
      store.addMatchEvent({
        eventId: 'evt-1',
        matchId: 'match-1',
        eventType: 'goal',
        timestamp: '2024-01-01T12:00:00Z',
        teamId: 'team-1',
        metadata: {},
      });
      store.setActivePredictionWindow({
        windowId: 'window-1',
        roomId: 'room-1',
        matchId: 'match-1',
        predictionType: 'next_goal_scorer',
        options: ['Player A'],
        expiresAt: '2024-01-01T12:05:00Z',
        createdAt: '2024-01-01T12:00:00Z',
      });
      store.updateScore({ home: 2, away: 1 });
      store.setLeaderboard([
        {
          userId: 'user-1',
          displayName: 'Player 1',
          totalPoints: 100,
          streak: 3,
          rank: 1,
        },
      ]);

      // Reset
      store.resetMatchState();

      // Verify reset
      const state = useAppStore.getState();
      expect(state.matchEvents).toEqual([]);
      expect(state.currentScore).toEqual({ home: 0, away: 0 });
      expect(state.activePredictionWindow).toBeNull();
      expect(state.userPredictions).toEqual([]);
      expect(state.leaderboard).toEqual([]);
    });
  });
});
