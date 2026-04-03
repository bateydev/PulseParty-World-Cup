/**
 * Example component demonstrating WebSocket reconnection with session state restoration
 * Requirements: 7.6, 7.7
 */

import { useWebSocket } from './useWebSocket';
import { useAppStore } from '../store';

export function WebSocketExample() {
  const { sendMessage } = useWebSocket(
    import.meta.env.VITE_WEBSOCKET_URL || 'wss://example.com/ws'
  );

  const {
    user,
    currentRoom,
    wsConnected,
    reconnecting,
    matchEvents,
    activePredictionWindow,
    leaderboard,
  } = useAppStore();

  const handleCreateRoom = () => {
    sendMessage({
      action: 'createRoom',
      payload: {
        theme: 'Country',
        matchId: 'match-123',
      },
    });
  };

  const handleJoinRoom = () => {
    sendMessage({
      action: 'joinRoom',
      payload: {
        roomCode: 'ABC123',
      },
    });
  };

  const handleSubmitPrediction = () => {
    if (activePredictionWindow) {
      sendMessage({
        action: 'submitPrediction',
        payload: {
          windowId: activePredictionWindow.windowId,
          choice: 'Option A',
        },
      });
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">WebSocket Connection Example</h1>

      {/* Connection Status */}
      <div className="mb-4 p-4 border rounded">
        <h2 className="font-semibold mb-2">Connection Status</h2>
        <div className="space-y-1">
          <p>
            Status:{' '}
            <span className={wsConnected ? 'text-green-600' : 'text-red-600'}>
              {wsConnected ? 'Connected' : 'Disconnected'}
            </span>
          </p>
          {reconnecting && <p className="text-yellow-600">Reconnecting...</p>}
          <p>User: {user?.displayName || 'Not logged in'}</p>
          <p>Room: {currentRoom?.roomCode || 'Not in room'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 p-4 border rounded">
        <h2 className="font-semibold mb-2">Actions</h2>
        <div className="space-x-2">
          <button
            onClick={handleCreateRoom}
            disabled={!wsConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Create Room
          </button>
          <button
            onClick={handleJoinRoom}
            disabled={!wsConnected}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
          >
            Join Room
          </button>
          <button
            onClick={handleSubmitPrediction}
            disabled={!wsConnected || !activePredictionWindow}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:bg-gray-300"
          >
            Submit Prediction
          </button>
        </div>
      </div>

      {/* Match Events */}
      <div className="mb-4 p-4 border rounded">
        <h2 className="font-semibold mb-2">
          Match Events ({matchEvents.length})
        </h2>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {matchEvents.slice(-5).map((event, index) => (
            <div key={index} className="text-sm">
              <span className="font-mono text-gray-500">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>{' '}
              - {event.eventType}
            </div>
          ))}
        </div>
      </div>

      {/* Active Prediction Window */}
      {activePredictionWindow && (
        <div className="mb-4 p-4 border rounded bg-yellow-50">
          <h2 className="font-semibold mb-2">Active Prediction</h2>
          <p className="text-sm">
            Type: {activePredictionWindow.predictionType}
          </p>
          <p className="text-sm">
            Expires:{' '}
            {new Date(activePredictionWindow.expiresAt).toLocaleTimeString()}
          </p>
          <div className="mt-2 space-x-2">
            {activePredictionWindow.options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  sendMessage({
                    action: 'submitPrediction',
                    payload: {
                      windowId: activePredictionWindow.windowId,
                      choice: option,
                    },
                  });
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="mb-4 p-4 border rounded">
        <h2 className="font-semibold mb-2">Leaderboard</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left">Rank</th>
              <th className="text-left">Player</th>
              <th className="text-right">Points</th>
              <th className="text-right">Streak</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((score) => (
              <tr
                key={score.userId}
                className={score.userId === user?.userId ? 'bg-blue-100' : ''}
              >
                <td>{score.rank}</td>
                <td>{score.displayName}</td>
                <td className="text-right">{score.totalPoints}</td>
                <td className="text-right">{score.streak}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reconnection Info */}
      <div className="p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Reconnection Info</h2>
        <p className="text-sm text-gray-600">
          If the connection is lost, the system will automatically attempt to
          reconnect with exponential backoff:
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside mt-2">
          <li>Attempt 1: 1 second delay</li>
          <li>Attempt 2: 2 seconds delay</li>
          <li>Attempt 3: 4 seconds delay</li>
          <li>Attempt 4: 8 seconds delay</li>
          <li>Attempt 5: 16 seconds delay</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Your session state (user ID, room ID, locale) will be automatically
          restored on reconnection.
        </p>
      </div>
    </div>
  );
}
