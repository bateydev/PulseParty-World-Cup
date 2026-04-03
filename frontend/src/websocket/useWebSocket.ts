import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { WebSocketConnectionManager } from './connectionManager';

/**
 * Custom hook for WebSocket connection management
 * Integrates WebSocketConnectionManager with Zustand store
 * Requirements: 7.6, 7.7, 9.1, 9.2
 */
export function useWebSocket(wsUrl: string) {
  const managerRef = useRef<WebSocketConnectionManager | null>(null);

  const {
    user,
    currentRoom,
    locale,
    setWsConnected,
    setReconnecting,
    setCurrentRoom,
    setParticipants,
    addMatchEvent,
    updateScore,
    setActivePredictionWindow,
    setLeaderboard,
  } = useAppStore();

  useEffect(() => {
    // Don't connect if no WebSocket URL
    if (!wsUrl) {
      console.warn('No WebSocket URL provided');
      return;
    }

    // Create connection manager
    const manager = new WebSocketConnectionManager({
      url: wsUrl,
      userId: user?.userId,
      roomId: currentRoom?.roomId,
      locale,
      maxReconnectAttempts: 5,

      onOpen: () => {
        console.log('WebSocket connection established');
        setWsConnected(true);
        setReconnecting(false);
      },

      onClose: () => {
        console.log('WebSocket connection closed');
        setWsConnected(false);
      },

      onMessage: (data) => {
        handleWebSocketMessage(data);
      },

      onError: (error) => {
        console.error('WebSocket error:', error);
      },

      onReconnecting: (attempt) => {
        console.log(`Reconnecting... attempt ${attempt}/5`);
        setReconnecting(true);
      },

      onReconnectFailed: () => {
        console.error('Failed to reconnect after 5 attempts');
        setReconnecting(false);
        setWsConnected(false);
      },
    });

    // Store manager reference
    managerRef.current = manager;

    // Connect to WebSocket
    manager.connect();

    // Cleanup on unmount
    return () => {
      manager.disconnect();
      managerRef.current = null;
    };
  }, [wsUrl]); // Only reconnect if URL changes

  // Update session state when user, room, or locale changes
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateSessionState({
        userId: user?.userId,
        roomId: currentRoom?.roomId,
        locale,
      });
    }
  }, [user?.userId, currentRoom?.roomId, locale]);

  /**
   * Handle incoming WebSocket messages and update store
   */
  function handleWebSocketMessage(data: any) {
    const { type, payload } = data;

    switch (type) {
      case 'roomState':
        // Initial room state on connection
        if (payload.room) {
          setCurrentRoom({
            roomId: payload.room.roomId,
            roomCode: payload.room.roomCode,
            matchId: payload.room.matchId,
            theme: payload.room.theme,
          });
        }

        if (payload.participants) {
          setParticipants(
            payload.participants.map((p: any) => ({
              userId: p.userId,
              displayName: p.displayName || p.userId,
              isGuest: true,
            }))
          );
        }

        if (payload.leaderboard) {
          setLeaderboard(payload.leaderboard);
        }

        if (payload.currentScore) {
          updateScore(payload.currentScore);
        }
        break;

      case 'matchEvent':
        // New match event
        if (payload) {
          addMatchEvent(payload);
        }
        break;

      case 'predictionWindow':
        // New prediction window
        if (payload) {
          setActivePredictionWindow(payload);
        }
        break;

      case 'predictionClosed':
        // Prediction window closed
        setActivePredictionWindow(null);
        break;

      case 'leaderboardUpdate':
        // Leaderboard updated
        if (payload.leaderboard) {
          setLeaderboard(payload.leaderboard);
        }
        break;

      case 'participantUpdate':
        // Participant joined or left
        if (payload.participants) {
          setParticipants(
            payload.participants.map((p: any) => ({
              userId: p.userId,
              displayName: p.displayName || p.userId,
              isGuest: true,
            }))
          );
        }
        break;

      case 'scoreUpdate':
        // Match score updated
        if (payload.score) {
          updateScore(payload.score);
        }
        break;

      default:
        console.warn('Unknown WebSocket message type:', type);
    }
  }

  /**
   * Send message through WebSocket
   */
  function sendMessage(message: any) {
    if (managerRef.current) {
      managerRef.current.send(message);
    } else {
      console.warn('WebSocket manager not initialized');
    }
  }

  return {
    sendMessage,
    isConnected: managerRef.current?.isConnected() ?? false,
  };
}
