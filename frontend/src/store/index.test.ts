import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAppStore } from './index';

/**
 * Unit tests for Zustand store WebSocket integration
 * Requirements: 9.1, 7.7
 */

// Store mock manager instances for testing
let mockManagers: any[] = [];

// Mock WebSocketConnectionManager
vi.mock('../websocket/connectionManager', () => {
  return {
    WebSocketConnectionManager: vi.fn().mockImplementation((config) => {
      const mockManager = {
        connect: vi.fn(() => {
          // Simulate successful connection
          setTimeout(() => config.onOpen?.(), 10);
        }),
        disconnect: vi.fn(() => {
          config.onClose?.();
        }),
        send: vi.fn(),
        updateSessionState: vi.fn(),
        isConnected: vi.fn(() => true),
        config, // Store config for testing
      };
      mockManagers.push(mockManager);
      return mockManager;
    }),
  };
});

describe('Zustand Store - WebSocket Integration', () => {
  beforeEach(() => {
    // Clear mock managers
    mockManagers = [];

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

    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('connectWebSocket', () => {
    it('should create WebSocketConnectionManager with correct configuration', async () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      // Wait a bit for the manager to be created
      await vi.advanceTimersByTimeAsync(1);

      // Check that a manager was created with the right config
      const manager = mockManagers[mockManagers.length - 1];
      expect(manager).toBeDefined();
      expect(manager.config.url).toBe(url);
      expect(manager.config.userId).toBeUndefined();
      expect(manager.config.roomId).toBeUndefined();
      expect(manager.config.locale).toBe('en');
      expect(manager.config.maxReconnectAttempts).toBe(5);
    });

    it('should include user and room info in connection config', async () => {
      const store = useAppStore.getState();
      
      // Set user and room
      store.setUser({
        userId: 'user-123',
        displayName: 'Test User',
        isGuest: false,
      });
      
      store.setCurrentRoom({
        roomId: 'room-456',
        roomCode: 'ABC123',
        matchId: 'match-789',
        theme: 'Country',
      });

      const url = 'wss://example.com/ws';
      store.connectWebSocket(url);

      // Wait a bit for the manager to be created
      await vi.advanceTimersByTimeAsync(1);

      // Check that a manager was created with the right config
      const manager = mockManagers[mockManagers.length - 1];
      expect(manager).toBeDefined();
      expect(manager.config.url).toBe(url);
      expect(manager.config.userId).toBe('user-123');
      expect(manager.config.roomId).toBe('room-456');
      expect(manager.config.locale).toBe('en');
    });

    it('should call connect on the manager', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      const manager = mockManagers[mockManagers.length - 1];
      expect(manager.connect).toHaveBeenCalled();
    });

    it('should update wsConnected state when connection opens', async () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      // Wait for async connection
      await vi.advanceTimersByTimeAsync(20);

      const state = useAppStore.getState();
      expect(state.wsConnected).toBe(true);
      expect(state.reconnecting).toBe(false);
    });

    it('should update wsConnected state when connection closes', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      // Trigger onClose callback
      const manager = mockManagers[mockManagers.length - 1];
      manager.config.onClose();

      const state = useAppStore.getState();
      expect(state.wsConnected).toBe(false);
    });

    it('should set reconnecting state when reconnecting', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      // Trigger onReconnecting callback
      const manager = mockManagers[mockManagers.length - 1];
      manager.config.onReconnecting(1);

      const state = useAppStore.getState();
      expect(state.reconnecting).toBe(true);
    });

    it('should handle reconnection failure', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      // Trigger onReconnectFailed callback
      const manager = mockManagers[mockManagers.length - 1];
      manager.config.onReconnectFailed();

      const state = useAppStore.getState();
      expect(state.reconnecting).toBe(false);
      expect(state.wsConnected).toBe(false);
    });

    it('should close existing connection before creating new one', () => {
      const store = useAppStore.getState();
      const url1 = 'wss://example.com/ws1';
      const url2 = 'wss://example.com/ws2';

      // Create first connection
      store.connectWebSocket(url1);
      const firstManager = mockManagers[mockManagers.length - 1];

      // Create second connection
      store.connectWebSocket(url2);

      expect(firstManager.disconnect).toHaveBeenCalled();
    });
  });

  describe('disconnectWebSocket', () => {
    it('should disconnect the manager', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);
      const manager = mockManagers[mockManagers.length - 1];

      store.disconnectWebSocket();

      expect(manager.disconnect).toHaveBeenCalled();
    });

    it('should clear wsManager and wsConnected state', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);
      store.disconnectWebSocket();

      const state = useAppStore.getState();
      expect(state.wsManager).toBeNull();
      expect(state.wsConnected).toBe(false);
    });

    it('should handle disconnect when no connection exists', () => {
      const store = useAppStore.getState();

      // Should not throw
      expect(() => store.disconnectWebSocket()).not.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('should send message through manager when connected', async () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);
      await vi.advanceTimersByTimeAsync(20);

      const message = { action: 'test', payload: { data: 'value' } };
      store.sendMessage(message);

      const manager = mockManagers[mockManagers.length - 1];
      expect(manager.send).toHaveBeenCalledWith(message);
    });

    it('should not send message when not connected', () => {
      const store = useAppStore.getState();
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const message = { action: 'test' };
      store.sendMessage(message);

      expect(consoleWarn).toHaveBeenCalledWith(
        'WebSocket not connected, cannot send message'
      );
    });
  });

  describe('Message handling', () => {
    it('should handle matchEvent messages', async () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      const manager = mockManagers[mockManagers.length - 1];
      const matchEvent = {
        eventId: 'event-123',
        matchId: 'match-456',
        eventType: 'goal',
        timestamp: '2024-01-15T10:30:00Z',
        teamId: 'team-1',
        metadata: {},
      };

      manager.config.onMessage({
        type: 'matchEvent',
        payload: matchEvent,
      });

      const state = useAppStore.getState();
      expect(state.matchEvents).toHaveLength(1);
      expect(state.matchEvents[0]).toEqual(matchEvent);
    });

    it('should handle predictionWindow messages', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      const manager = mockManagers[mockManagers.length - 1];
      const predictionWindow = {
        windowId: 'window-123',
        roomId: 'room-456',
        matchId: 'match-789',
        predictionType: 'next_goal_scorer',
        options: ['Player A', 'Player B'],
        expiresAt: '2024-01-15T10:35:00Z',
        createdAt: '2024-01-15T10:30:00Z',
      };

      manager.config.onMessage({
        type: 'predictionWindow',
        payload: predictionWindow,
      });

      const state = useAppStore.getState();
      expect(state.activePredictionWindow).toEqual(predictionWindow);
    });

    it('should handle predictionClosed messages', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      // Set an active prediction window first
      store.setActivePredictionWindow({
        windowId: 'window-123',
        roomId: 'room-456',
        matchId: 'match-789',
        predictionType: 'next_goal_scorer',
        options: ['Player A', 'Player B'],
        expiresAt: '2024-01-15T10:35:00Z',
        createdAt: '2024-01-15T10:30:00Z',
      });

      store.connectWebSocket(url);

      const manager = mockManagers[mockManagers.length - 1];
      manager.config.onMessage({
        type: 'predictionClosed',
        payload: {},
      });

      const state = useAppStore.getState();
      expect(state.activePredictionWindow).toBeNull();
    });

    it('should handle leaderboardUpdate messages', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      const manager = mockManagers[mockManagers.length - 1];
      const leaderboard = [
        {
          userId: 'user-1',
          displayName: 'User 1',
          totalPoints: 100,
          streak: 3,
          rank: 1,
        },
        {
          userId: 'user-2',
          displayName: 'User 2',
          totalPoints: 80,
          streak: 1,
          rank: 2,
        },
      ];

      manager.config.onMessage({
        type: 'leaderboardUpdate',
        payload: { leaderboard },
      });

      const state = useAppStore.getState();
      expect(state.leaderboard).toEqual(leaderboard);
    });

    it('should handle participantUpdate messages', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      const manager = mockManagers[mockManagers.length - 1];
      const participants = [
        { userId: 'user-1', displayName: 'User 1', isGuest: false },
        { userId: 'user-2', displayName: 'User 2', isGuest: true },
      ];

      manager.config.onMessage({
        type: 'participantUpdate',
        payload: { participants },
      });

      const state = useAppStore.getState();
      expect(state.participants).toEqual(participants);
    });

    it('should handle scoreUpdate messages', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      const manager = mockManagers[mockManagers.length - 1];
      const score = { home: 2, away: 1 };

      manager.config.onMessage({
        type: 'scoreUpdate',
        payload: { score },
      });

      const state = useAppStore.getState();
      expect(state.currentScore).toEqual(score);
    });

    it('should handle roomState messages', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);

      const manager = mockManagers[mockManagers.length - 1];
      const roomState = {
        room: {
          roomId: 'room-123',
          roomCode: 'ABC123',
          matchId: 'match-456',
          theme: 'Country' as const,
        },
        participants: [
          { userId: 'user-1', displayName: 'User 1', isGuest: false },
        ],
        leaderboard: [
          {
            userId: 'user-1',
            displayName: 'User 1',
            totalPoints: 50,
            streak: 2,
            rank: 1,
          },
        ],
        score: { home: 1, away: 0 },
      };

      manager.config.onMessage({
        type: 'roomState',
        payload: roomState,
      });

      const state = useAppStore.getState();
      expect(state.currentRoom).toEqual(roomState.room);
      expect(state.participants).toEqual(roomState.participants);
      expect(state.leaderboard).toEqual(roomState.leaderboard);
      expect(state.currentScore).toEqual(roomState.score);
    });

    it('should handle unknown message types gracefully', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      store.connectWebSocket(url);

      const manager = mockManagers[mockManagers.length - 1];
      manager.config.onMessage({
        type: 'unknownType',
        payload: {},
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        'Unknown WebSocket message type:',
        'unknownType'
      );
    });

    it('should handle message parsing errors gracefully', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      store.connectWebSocket(url);

      const manager = mockManagers[mockManagers.length - 1];
      
      // Trigger an error by passing invalid data
      manager.config.onMessage(null);

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to handle WebSocket message:',
        expect.any(Error)
      );
    });
  });

  describe('Session state restoration', () => {
    it('should update session state when user changes', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);
      const manager = mockManagers[mockManagers.length - 1];

      store.setUser({
        userId: 'user-123',
        displayName: 'Test User',
        isGuest: false,
      });

      expect(manager.updateSessionState).toHaveBeenCalledWith({
        userId: 'user-123',
      });
    });

    it('should update session state when room changes', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);
      const manager = mockManagers[mockManagers.length - 1];

      store.setCurrentRoom({
        roomId: 'room-456',
        roomCode: 'ABC123',
        matchId: 'match-789',
        theme: 'Club',
      });

      expect(manager.updateSessionState).toHaveBeenCalledWith({
        roomId: 'room-456',
      });
    });

    it('should update session state when locale changes', () => {
      const store = useAppStore.getState();
      const url = 'wss://example.com/ws';

      store.connectWebSocket(url);
      const manager = mockManagers[mockManagers.length - 1];

      store.setLocale('fr');

      expect(manager.updateSessionState).toHaveBeenCalledWith({
        locale: 'fr',
      });
    });
  });
});
