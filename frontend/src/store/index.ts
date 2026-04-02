import { create } from 'zustand';

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
  metadata: Record<string, any>;
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
}

export const useAppStore = create<AppState>((set) => ({
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

  // Actions
  setUser: (user) => set({ user }),
  setLocale: (locale) => set({ locale }),
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
}));
