import { useState } from 'react';

interface SimulatorPanelProps {
  matchApiUrl: string;
}

export function SimulatorPanel({ matchApiUrl }: SimulatorPanelProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const startSimulator = async () => {
    setIsSimulating(true);
    setMessage('Starting simulator...');

    try {
      // Call the Match API refresh endpoint which will trigger the simulator
      const response = await fetch(
        matchApiUrl.replace('/matches', '/matches/refresh'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to start simulator: ${response.statusText}`);
      }

      const data = await response.json();
      setMessage(
        `✅ Simulator started! Cached ${data.cached || 0} simulated matches.`
      );

      // Refresh the page after 2 seconds to show new matches
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error starting simulator:', error);
      setMessage(
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-full shadow-lg transition-all transform hover:scale-110"
          title="Open Simulator Panel"
        >
          🎮 Dev Tools
        </button>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-80 border-2 border-purple-500 animate-slideUp">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>🎮</span>
              <span>Simulator Panel</span>
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Generate simulated match data without using API quota. Perfect for
            testing!
          </p>

          {/* Start Button */}
          <button
            onClick={startSimulator}
            disabled={isSimulating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            {isSimulating ? '⏳ Starting...' : '🚀 Start Simulator'}
          </button>

          {/* Message */}
          {message && (
            <div
              className={`text-sm p-3 rounded-lg ${
                message.startsWith('✅')
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  : message.startsWith('❌')
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                    : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
              }`}
            >
              {message}
            </div>
          )}

          {/* Info */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 This will generate 3-5 simulated matches with realistic data.
              The page will refresh automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
