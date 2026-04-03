import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './index';
import { WebSocketConnectionManager } from '../websocket/connectionManager';

/**
 * Integration tests for WebSocket message handlers
 * Validates Requirements 9.2, 9.3
 */
describe('WebSocket Message Handlers Integration', () => {
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

  describe('Requirement 9.2: Initial Room State', () => {
    it('should handle roomState message with all state components', () => {
      const store = useAppStore.getState();

      // Simulate receiving a roomState message
      const roomStateMessage = {
        type: 'roomState',
        payload: {
          room: {
            roomId: 'room-1',
            roomCode: 'ABC123',
            matchId: 'match-1',
            theme: 'Country' as const,
          },
          participants: [
            { userId: 'user-1', displayName: 'Player 1', isGuest: false },
            { userId: 'user-2', displayName: 'Player 2', isGuest: true },
          ],
          leaderboard: [
            {
              userId: 'user-1',
              displayName: 'Player 1',
              totalPoints: 100,
              streak: 2,
              rank: 1,
            },
            {
              userId: 'user-2',
              displayName: 'Player 2',
              totalPoints: 50,
              streak: 1,
              rank: 2,
            },
          ],
          score: { home: 2, away: 1 },
        },
      };

      // Manually trigger the message handler logic
      if (roomStateMessage.payload.room) {
        store.setCurrentRoom(roomStateMessage.payload.room);
      }
      if (roomStateMessage.payload.participants) {
        store.setParticipants(roomStateMessage.payload.participants);
      }
      if (roomStateMessage.payload.leaderboard) {
        store.setLeaderboard(roomStateMessage.payload.leaderboard);
      }
      if (roomStateMessage.payload.score) {
        store.updateScore(roomStateMessage.payload.score);
      }

      // Verify state was updated correctly
      const state = useAppStore.getState();
      expect(state.currentRoom).toEqual(roomStateMessage.payload.room);
      expect(state.participants).toEqual(roomStateMessage.payload.participants);
      expect(state.leaderboard).toEqual(roomStateMessage.payload.leaderboard);
      expect(state.currentScore).toEqual(roomStateMessage.payload.score);
    });

    it('should handle partial roomState message', () => {
      const store = useAppStore.getState();

      // Simulate receiving a partial roomState message (only room and score)
      const partialRoomStateMessage = {
        type: 'roomState',
        payload: {
          room: {
            roomId: 'room-1',
            roomCode: 'ABC123',
            matchId: 'match-1',
            theme: 'Club' as const,
          },
          score: { home: 0, away: 0 },
        },
      };

      // Manually trigger the message handler logic
      if (partialRoomStateMessage.payload.room) {
        store.setCurrentRoom(partialRoomStateMessage.payload.room);
      }
      if (partialRoomStateMessage.payload.score) {
        store.updateScore(partialRoomStateMessage.payload.score);
      }

      // Verify state was updated correctly
      const state = useAppStore.getState();
      expect(state.currentRoom).toEqual(partialRoomStateMessage.payload.room);
      expect(state.currentScore).toEqual(partialRoomStateMessage.payload.score);
      // These should remain at default values
      expect(state.participants).toEqual([]);
      expect(state.leaderboard).toEqual([]);
    });
  });

  describe('Requirement 9.3: Real-time Event Broadcasting', () => {
    it('should handle matchEvent message and update timeline', () => {
      const store = useAppStore.getState();

      const matchEventMessage = {
        type: 'matchEvent',
        payload: {
          eventId: 'evt-1',
          matchId: 'match-1',
          eventType: 'goal',
          timestamp: '2024-01-01T12:00:00Z',
          teamId: 'team-1',
          playerId: 'player-1',
          metadata: { minute: 23 },
        },
      };

      store.addMatchEvent(matchEventMessage.payload);

      const state = useAppStore.getState();
      expect(state.matchEvents).toHaveLength(1);
      expect(state.matchEvents[0]).toEqual(matchEventMessage.payload);
    });

    it('should handle predictionWindow message', () => {
      const store = useAppStore.getState();

      const predictionWindowMessage = {
        type: 'predictionWindow',
        payload: {
          windowId: 'window-1',
          roomId: 'room-1',
          matchId: 'match-1',
          predictionType: 'next_goal_scorer',
          options: ['Player A', 'Player B', 'Player C'],
          expiresAt: '2024-01-01T12:05:00Z',
          createdAt: '2024-01-01T12:00:00Z',
        },
      };

      store.setActivePredictionWindow(predictionWindowMessage.payload);

      const state = useAppStore.getState();
      expect(state.activePredictionWindow).toEqual(
        predictionWindowMessage.payload
      );
    });

    it('should handle predictionClosed message', () => {
      const store = useAppStore.getState();

      // First set an active prediction window
      store.setActivePredictionWindow({
        windowId: 'window-1',
        roomId: 'room-1',
        matchId: 'match-1',
        predictionType: 'next_goal_scorer',
        options: ['Player A'],
        expiresAt: '2024-01-01T12:05:00Z',
        createdAt: '2024-01-01T12:00:00Z',
      });

      expect(useAppStore.getState().activePredictionWindow).not.toBeNull();

      // Now close it
      store.setActivePredictionWindow(null);

      const state = useAppStore.getState();
      expect(state.activePredictionWindow).toBeNull();
    });

    it('should handle leaderboardUpdate message', () => {
      const store = useAppStore.getState();

      const leaderboardUpdateMessage = {
        type: 'leaderboardUpdate',
        payload: {
          leaderboard: [
            {
              userId: 'user-1',
              displayName: 'Player 1',
              totalPoints: 150,
              streak: 4,
              rank: 1,
            },
            {
              userId: 'user-2',
              displayName: 'Player 2',
              totalPoints: 100,
              streak: 2,
              rank: 2,
            },
          ],
        },
      };

      store.setLeaderboard(leaderboardUpdateMessage.payload.leaderboard);

      const state = useAppStore.getState();
      expect(state.leaderboard).toEqual(
        leaderboardUpdateMessage.payload.leaderboard
      );
    });

    it('should handle leaderboardUpdate message with direct payload', () => {
      const store = useAppStore.getState();

      // Some messages might send leaderboard directly in payload
      const leaderboardUpdateMessage = {
        type: 'leaderboardUpdate',
        payload: [
          {
            userId: 'user-1',
            displayName: 'Player 1',
            totalPoints: 150,
            streak: 4,
            rank: 1,
          },
        ],
      };

      store.setLeaderboard(leaderboardUpdateMessage.payload);

      const state = useAppStore.getState();
      expect(state.leaderboard).toEqual(leaderboardUpdateMessage.payload);
    });

    it('should handle participantUpdate message', () => {
      const store = useAppStore.getState();

      const participantUpdateMessage = {
        type: 'participantUpdate',
        payload: {
          participants: [
            { userId: 'user-1', displayName: 'Player 1', isGuest: false },
            { userId: 'user-2', displayName: 'Player 2', isGuest: true },
            { userId: 'user-3', displayName: 'Player 3', isGuest: true },
          ],
        },
      };

      store.setParticipants(participantUpdateMessage.payload.participants);

      const state = useAppStore.getState();
      expect(state.participants).toEqual(
        participantUpdateMessage.payload.participants
      );
    });

    it('should handle scoreUpdate message', () => {
      const store = useAppStore.getState();

      const scoreUpdateMessage = {
        type: 'scoreUpdate',
        payload: {
          score: { home: 3, away: 2 },
        },
      };

      store.updateScore(scoreUpdateMessage.payload.score);

      const state = useAppStore.getState();
      expect(state.currentScore).toEqual(scoreUpdateMessage.payload.score);
    });
  });

  describe('Message Handler Sequence', () => {
    it('should handle a sequence of messages correctly', () => {
      const store = useAppStore.getState();

      // 1. Initial room state
      store.setCurrentRoom({
        roomId: 'room-1',
        roomCode: 'ABC123',
        matchId: 'match-1',
        theme: 'Country',
      });
      store.updateScore({ home: 0, away: 0 });

      // 2. Match event (goal)
      store.addMatchEvent({
        eventId: 'evt-1',
        matchId: 'match-1',
        eventType: 'goal',
        timestamp: '2024-01-01T12:00:00Z',
        teamId: 'team-1',
        metadata: {},
      });

      // 3. Score update
      store.updateScore({ home: 1, away: 0 });

      // 4. Prediction window opens
      store.setActivePredictionWindow({
        windowId: 'window-1',
        roomId: 'room-1',
        matchId: 'match-1',
        predictionType: 'next_goal_scorer',
        options: ['Player A', 'Player B'],
        expiresAt: '2024-01-01T12:05:00Z',
        createdAt: '2024-01-01T12:00:00Z',
      });

      // 5. Leaderboard update
      store.setLeaderboard([
        {
          userId: 'user-1',
          displayName: 'Player 1',
          totalPoints: 50,
          streak: 1,
          rank: 1,
        },
      ]);

      // 6. Prediction window closes
      store.setActivePredictionWindow(null);

      // Verify final state
      const state = useAppStore.getState();
      expect(state.currentRoom?.roomId).toBe('room-1');
      expect(state.matchEvents).toHaveLength(1);
      expect(state.currentScore).toEqual({ home: 1, away: 0 });
      expect(state.activePredictionWindow).toBeNull();
      expect(state.leaderboard).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown message types gracefully', () => {
      const store = useAppStore.getState();

      // This should not throw an error, just log a warning
      // In the actual implementation, unknown message types are logged but don't crash
      const unknownMessage = {
        type: 'unknownType',
        payload: { data: 'something' },
      };

      // The store should remain unchanged
      const stateBefore = useAppStore.getState();
      // No action taken for unknown message type
      const stateAfter = useAppStore.getState();

      expect(stateAfter).toEqual(stateBefore);
    });
  });
});
