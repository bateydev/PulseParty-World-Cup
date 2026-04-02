// Shared type definitions for backend

export interface MatchEvent {
  eventId: string;
  matchId: string;
  eventType:
    | 'goal'
    | 'assist'
    | 'yellow_card'
    | 'red_card'
    | 'substitution'
    | 'corner'
    | 'shot'
    | 'possession';
  timestamp: string; // ISO 8601
  teamId: string;
  playerId?: string;
  metadata: Record<string, any>;
}

export interface Room {
  roomId: string;
  roomCode: string;
  matchId: string;
  theme: 'Country' | 'Club' | 'Private';
  participants: string[]; // connection IDs
  createdAt: string;
  ttl: number; // Unix timestamp for DynamoDB TTL
}

export interface PredictionWindow {
  windowId: string;
  roomId: string;
  matchId: string;
  predictionType:
    | 'next_goal_scorer'
    | 'next_card'
    | 'next_corner'
    | 'match_outcome';
  options: string[];
  expiresAt: string; // ISO 8601
  createdAt: string;
}

export interface UserScore {
  userId: string;
  roomId: string;
  totalPoints: number;
  streak: number;
  clutchMoments: number;
  correctPredictions: number;
  totalPredictions: number;
  rank: number;
}

export interface WrappedRecap {
  userId: string;
  roomId: string;
  matchId: string;
  totalPoints: number;
  finalRank: number;
  accuracy: number; // percentage
  longestStreak: number;
  clutchMoments: number;
  shareableUrl: string;
}

export interface RoomRecap {
  roomId: string;
  matchId: string;
  totalParticipants: number;
  topPerformers: UserScore[];
  mostPredictedEvent: string;
  engagementMetrics: Record<string, number>;
}
