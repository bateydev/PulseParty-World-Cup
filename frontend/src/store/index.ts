import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WebSocketConnectionManager } from '../websocket/connectionManager';

// Type definitions
interface User {
  userId: string;
  displayName: string;
  isGuest: boolean;
}

interface Room {
  roomId: string;
  roomCode: string;
  matchId: string;
  theme: 'Country' | 'Club' | 'Private';
}

interface MatchEvent {
  eventId: string;
  matchId: string;
  eventType: string;
  timestamp: string;
  teamId: string;
  playerId?: string;
  metadata: Record<string, unknown>;
}

interface PredictionWindow {
  windowId: string;
  roomId: string;
  matchId: string;
  predictionType: string;
  options: string[];
  expiresAt: string;
  createdAt: string;
}

interface Prediction {
  windowId: string;
  choice: string;
  submittedAt: string;
}

interface UserScore {
  userId: string;
  displayName: string;
  totalPoints: number;
  streak: number;
  rank: number;
}

interface AppState {
  // User state
  user: User | null;
  locale: string;

  // Room state
  currentRoom: Room | null;
  participants: User[];

  // Match state
  matchEvents: MatchEvent[];
  currentScore: { home: number; away: number };

  // Prediction state
  activePredictionWindow: PredictionWindow | null;
  userPredictions: Prediction[];

  // Leaderboard state
  leaderboard: UserScore[];

  // Connection state
  wsConnected: boolean;
  reconnecting: boolean;
  wsManager: WebSocketConnectionManager | null;

  // Actions
  setUser: (user: User | null) => void;
  setLocale: (locale: string) => void;
  setCurrentRoom: (room: Room | null) => void;
  setParticipants: (participants: User[]) => void;
  addMatchEvent: (event: MatchEvent) => void;
  updateScore: (score: { home: number; away: number }) => void;
  setActivePredictionWindow: (window: PredictionWindow | null) => void;
  addUserPrediction: (prediction: Prediction) => void;
  setLeaderboard: (leaderboard: UserScore[]) => void;
  setWsConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;

  // WebSocket actions
  connectWebSocket: (url: string) => void;
  disconnectWebSocket: () => void;
  sendMessage: (message: unknown) => void;

  // Room actions
  createRoom: (theme: string, matchId: string) => Promise<string>;
  joinRoom: (roomCode: string) => Promise<void>;
  leaveRoom: () => void;

  // Prediction actions
  submitPrediction: (windowId: string, choice: string) => Promise<void>;

  // Reset actions
  resetMatchState: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
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

      // Basic setters
      setUser: (user) => {
        set({ user });
        // Update WebSocket session state if connected
        const state = get();
        if (state.wsManager) {
          state.wsManager.updateSessionState({ userId: user?.userId });
        }
      },
      setLocale: (locale) => {
        set({ locale });
        // Persist locale change to localStorage
        localStorage.setItem('pulseparty-locale', locale);
        // Update WebSocket session state if connected
        const state = get();
        if (state.wsManager) {
          state.wsManager.updateSessionState({ locale });
        }
      },
      setCurrentRoom: (currentRoom) => {
        set({ currentRoom });
        // Update WebSocket session state if connected
        const state = get();
        if (state.wsManager) {
          state.wsManager.updateSessionState({ roomId: currentRoom?.roomId });
        }
      },
      setParticipants: (participants) => set({ participants }),
      addMatchEvent: (event) =>
        set((state) => ({ matchEvents: [...state.matchEvents, event] })),
      updateScore: (currentScore) => set({ currentScore }),
      setActivePredictionWindow: (activePredictionWindow) =>
        set({ activePredictionWindow }),
      addUserPrediction: (prediction) =>
        set((state) => ({
          userPredictions: [...state.userPredictions, prediction],
        })),
      setLeaderboard: (leaderboard) => set({ leaderboard }),
      setWsConnected: (wsConnected) => set({ wsConnected }),
      setReconnecting: (reconnecting) => set({ reconnecting }),

      // WebSocket actions
      connectWebSocket: (url: string) => {
        const state = get();

        // Close existing connection if any
        if (state.wsManager) {
          state.wsManager.disconnect();
        }

        // Create new connection manager
        const manager = new WebSocketConnectionManager({
          url,
          userId: state.user?.userId,
          roomId: state.currentRoom?.roomId,
          locale: state.locale,
          maxReconnectAttempts: 5,

          onOpen: () => {
            console.log('WebSocket connection established');
            set({ wsConnected: true, reconnecting: false });
          },

          onClose: () => {
            console.log('WebSocket connection closed');
            set({ wsConnected: false });
          },

          onMessage: (data) => {
            try {
              const message = data;

              // Handle different message types
              switch (message.type) {
                case 'matchEvent':
                  get().addMatchEvent(message.payload);
                  break;
                case 'predictionWindow':
                  get().setActivePredictionWindow(message.payload);
                  break;
                case 'predictionClosed':
                  get().setActivePredictionWindow(null);
                  break;
                case 'leaderboardUpdate':
                  get().setLeaderboard(
                    message.payload.leaderboard || message.payload
                  );
                  break;
                case 'participantUpdate':
                  get().setParticipants(
                    message.payload.participants || message.payload
                  );
                  break;
                case 'scoreUpdate':
                  get().updateScore(message.payload.score || message.payload);
                  break;
                case 'roomState':
                  // Initial room state on connection
                  if (message.payload.room) {
                    get().setCurrentRoom(message.payload.room);
                  }
                  if (message.payload.participants) {
                    get().setParticipants(message.payload.participants);
                  }
                  if (message.payload.leaderboard) {
                    get().setLeaderboard(message.payload.leaderboard);
                  }
                  if (message.payload.score) {
                    get().updateScore(message.payload.score);
                  }
                  break;
                case 'roomCreated':
                  if (message.payload.room) {
                    get().setCurrentRoom(message.payload.room);
                  }
                  break;
                case 'roomJoined':
                  if (message.payload.room) {
                    get().setCurrentRoom(message.payload.room);
                  }
                  break;
                default:
                  console.warn('Unknown WebSocket message type:', message.type);
              }
            } catch (error) {
              console.error('Failed to handle WebSocket message:', error);
            }
          },

          onError: (error) => {
            console.error('WebSocket error:', error);
          },

          onReconnecting: (attempt) => {
            console.log(`Reconnecting... attempt ${attempt}/5`);
            set({ reconnecting: true });
          },

          onReconnectFailed: () => {
            console.error('Failed to reconnect after 5 attempts');
            set({ reconnecting: false, wsConnected: false });
          },
        });

        // Connect to WebSocket
        manager.connect();

        // Store manager reference
        set({ wsManager: manager });
      },

      disconnectWebSocket: () => {
        const state = get();
        if (state.wsManager) {
          state.wsManager.disconnect();
          set({ wsManager: null, wsConnected: false });
        }
      },

      sendMessage: (message: unknown) => {
        const state = get();
        if (state.wsManager && state.wsConnected) {
          state.wsManager.send(message);
        } else {
          console.warn('WebSocket not connected, cannot send message');
        }
      },

      // Room actions
      createRoom: async (theme: string, matchId: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const state = get();

          if (!state.wsConnected || !state.wsManager) {
            reject(new Error('WebSocket not connected'));
            return;
          }

          // Send createRoom message
          const message = {
            action: 'createRoom',
            payload: { theme, matchId },
          };

          state.sendMessage(message);

          // Store original handler
          const originalHandler = state.wsManager['config'].onMessage;

          // Set up a one-time listener for the response
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const responseHandler = (data: any) => {
            if (data.type === 'roomCreated') {
              clearTimeout(timeoutId);
              // Restore original handler
              if (state.wsManager) {
                state.wsManager['config'].onMessage = originalHandler;
              }
              get().setCurrentRoom(data.payload.room);
              resolve(data.payload.room.roomCode);
            } else if (
              data.type === 'error' &&
              data.payload.action === 'createRoom'
            ) {
              clearTimeout(timeoutId);
              // Restore original handler
              if (state.wsManager) {
                state.wsManager['config'].onMessage = originalHandler;
              }
              reject(new Error(data.payload.message));
            }
          };

          // Temporarily override message handler
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          state.wsManager['config'].onMessage = (data: any) => {
            responseHandler(data);
            // Also call original handler for other message processing
            originalHandler?.(data);
          };

          // Timeout after 5 seconds
          const timeoutId = window.setTimeout(() => {
            // Restore original handler
            if (state.wsManager) {
              state.wsManager['config'].onMessage = originalHandler;
            }
            reject(new Error('Room creation timeout'));
          }, 5000);
        });
      },

      joinRoom: async (roomCode: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          const state = get();

          if (!state.wsConnected || !state.wsManager) {
            reject(new Error('WebSocket not connected'));
            return;
          }

          // Send joinRoom message
          const message = {
            action: 'joinRoom',
            payload: { roomCode },
          };

          state.sendMessage(message);

          // Store original handler
          const originalHandler = state.wsManager['config'].onMessage;

          // Set up a one-time listener for the response
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const responseHandler = (data: any) => {
            if (data.type === 'roomJoined' || data.type === 'roomState') {
              clearTimeout(timeoutId);
              // Restore original handler
              if (state.wsManager) {
                state.wsManager['config'].onMessage = originalHandler;
              }
              if (data.payload.room) {
                get().setCurrentRoom(data.payload.room);
              }
              resolve();
            } else if (
              data.type === 'error' &&
              data.payload.action === 'joinRoom'
            ) {
              clearTimeout(timeoutId);
              // Restore original handler
              if (state.wsManager) {
                state.wsManager['config'].onMessage = originalHandler;
              }
              reject(new Error(data.payload.message));
            }
          };

          // Temporarily override message handler
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          state.wsManager['config'].onMessage = (data: any) => {
            responseHandler(data);
            // Also call original handler for other message processing
            originalHandler?.(data);
          };

          // Timeout after 5 seconds
          const timeoutId = window.setTimeout(() => {
            // Restore original handler
            if (state.wsManager) {
              state.wsManager['config'].onMessage = originalHandler;
            }
            reject(new Error('Room join timeout'));
          }, 5000);
        });
      },

      leaveRoom: () => {
        const state = get();

        if (state.wsConnected && state.currentRoom) {
          const message = {
            action: 'leaveRoom',
            payload: { roomId: state.currentRoom.roomId },
          };
          state.sendMessage(message);
        }

        // Reset room-related state
        set({
          currentRoom: null,
          participants: [],
          matchEvents: [],
          currentScore: { home: 0, away: 0 },
          activePredictionWindow: null,
          userPredictions: [],
          leaderboard: [],
        });
      },

      // Prediction actions
      submitPrediction: async (
        windowId: string,
        choice: string
      ): Promise<void> => {
        return new Promise((resolve, reject) => {
          const state = get();

          if (!state.wsConnected) {
            reject(new Error('WebSocket not connected'));
            return;
          }

          if (!state.activePredictionWindow) {
            reject(new Error('No active prediction window'));
            return;
          }

          // Check if window is expired
          const expiresAt = new Date(state.activePredictionWindow.expiresAt);
          if (expiresAt < new Date()) {
            reject(new Error('Prediction window has expired'));
            return;
          }

          // Send submitPrediction message
          const message = {
            action: 'submitPrediction',
            payload: { windowId, choice },
          };

          state.sendMessage(message);

          // Add to local predictions
          const prediction: Prediction = {
            windowId,
            choice,
            submittedAt: new Date().toISOString(),
          };
          get().addUserPrediction(prediction);

          resolve();
        });
      },

      // Reset actions
      resetMatchState: () => {
        set({
          matchEvents: [],
          currentScore: { home: 0, away: 0 },
          activePredictionWindow: null,
          userPredictions: [],
          leaderboard: [],
        });
      },
    }),
    {
      name: 'pulseparty-storage',
      partialize: (state) => ({
        // Only persist these fields to localStorage
        user: state.user,
        locale: state.locale,
        currentRoom: state.currentRoom,
      }),
    }
  )
);
