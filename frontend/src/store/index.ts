import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  ws: WebSocket | null;

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
      ws: null,

      // Basic setters
      setUser: (user) => set({ user }),
      setLocale: (locale) => {
        set({ locale });
        // Persist locale change to localStorage
        localStorage.setItem('pulseparty-locale', locale);
      },
      setCurrentRoom: (currentRoom) => set({ currentRoom }),
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
        if (state.ws) {
          state.ws.close();
        }

        const ws = new WebSocket(url);

        ws.onopen = () => {
          set({ wsConnected: true, reconnecting: false, ws });
        };

        ws.onclose = () => {
          set({ wsConnected: false, ws: null });
        };

        ws.onerror = () => {
          set({ wsConnected: false });
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Handle different message types
            switch (message.type) {
              case 'matchEvent':
                get().addMatchEvent(message.payload);
                break;
              case 'predictionWindow':
                get().setActivePredictionWindow(message.payload);
                break;
              case 'leaderboardUpdate':
                get().setLeaderboard(message.payload);
                break;
              case 'participantUpdate':
                get().setParticipants(message.payload);
                break;
              case 'scoreUpdate':
                get().updateScore(message.payload);
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
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        set({ ws });
      },

      disconnectWebSocket: () => {
        const state = get();
        if (state.ws) {
          state.ws.close();
          set({ ws: null, wsConnected: false });
        }
      },

      sendMessage: (message: unknown) => {
        const state = get();
        if (state.ws && state.wsConnected) {
          state.ws.send(JSON.stringify(message));
        } else {
          console.warn('WebSocket not connected, cannot send message');
        }
      },

      // Room actions
      createRoom: async (theme: string, matchId: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const state = get();
          
          if (!state.wsConnected) {
            reject(new Error('WebSocket not connected'));
            return;
          }

          // Send createRoom message
          const message = {
            action: 'createRoom',
            payload: { theme, matchId },
          };

          state.sendMessage(message);

          // Listen for room creation response
          const originalOnMessage = state.ws?.onmessage;
          if (state.ws) {
            state.ws.onmessage = (event) => {
              try {
                const response = JSON.parse(event.data);
                if (response.type === 'roomCreated') {
                  get().setCurrentRoom(response.payload.room);
                  resolve(response.payload.room.roomCode);
                  // Restore original handler
                  if (state.ws && originalOnMessage) {
                    state.ws.onmessage = originalOnMessage;
                  }
                } else if (response.type === 'error') {
                  reject(new Error(response.payload.message));
                  if (state.ws && originalOnMessage) {
                    state.ws.onmessage = originalOnMessage;
                  }
                } else if (originalOnMessage) {
                  // Pass through other messages
                  originalOnMessage(event);
                }
              } catch (error) {
                reject(error);
              }
            };
          }

          // Timeout after 5 seconds
          setTimeout(() => {
            reject(new Error('Room creation timeout'));
          }, 5000);
        });
      },

      joinRoom: async (roomCode: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          const state = get();
          
          if (!state.wsConnected) {
            reject(new Error('WebSocket not connected'));
            return;
          }

          // Send joinRoom message
          const message = {
            action: 'joinRoom',
            payload: { roomCode },
          };

          state.sendMessage(message);

          // Listen for join response
          const originalOnMessage = state.ws?.onmessage;
          if (state.ws) {
            state.ws.onmessage = (event) => {
              try {
                const response = JSON.parse(event.data);
                if (response.type === 'roomJoined' || response.type === 'roomState') {
                  if (response.payload.room) {
                    get().setCurrentRoom(response.payload.room);
                  }
                  resolve();
                  // Restore original handler
                  if (state.ws && originalOnMessage) {
                    state.ws.onmessage = originalOnMessage;
                  }
                } else if (response.type === 'error') {
                  reject(new Error(response.payload.message));
                  if (state.ws && originalOnMessage) {
                    state.ws.onmessage = originalOnMessage;
                  }
                } else if (originalOnMessage) {
                  // Pass through other messages
                  originalOnMessage(event);
                }
              } catch (error) {
                reject(error);
              }
            };
          }

          // Timeout after 5 seconds
          setTimeout(() => {
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
      submitPrediction: async (windowId: string, choice: string): Promise<void> => {
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
