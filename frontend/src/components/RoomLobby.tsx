import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';

interface Match {
  id: string;
  name: string;
  league: string;
}

interface MatchesByTheme {
  Country: Match[];
  Club: Match[];
  Private: Match[];
}

interface RoomLobbyProps {
  onJoinRoom: (matchInfo?: {
    match: string;
    code: string;
    theme: string;
    matchId: string;
  }) => void;
}

export function RoomLobby({ onJoinRoom }: RoomLobbyProps) {
  const { t } = useTranslation();
  const { createRoom, joinRoom, wsConnected } = useAppStore();
  const [selectedTheme, setSelectedTheme] = useState<
    'Country' | 'Club' | 'Private' | null
  >(null);
  const [selectedMatch, setSelectedMatch] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    emoji: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [matches, setMatches] = useState<MatchesByTheme>({
    Country: [],
    Club: [],
    Private: [],
  });
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  // Fetch matches from Match API
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setIsLoadingMatches(true);
        setMatchesError(null);

        // Get Match API URL from environment variable
        const matchApiUrl =
          import.meta.env.VITE_MATCH_API_URL ||
          'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/matches';

        console.log('Fetching matches from:', matchApiUrl);

        const response = await fetch(matchApiUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch matches: ${response.statusText}`);
        }

        const data = await response.json();

        // Transform API response to match component format
        const transformedMatches: MatchesByTheme = {
          Country: data.Country?.map((match: any) => ({
            id: match.matchId,
            name: `${match.homeTeam} vs ${match.awayTeam}`,
            league: match.league,
            status: match.status,
            startTime: match.startTime,
          })) || [],
          Club: data.Club?.map((match: any) => ({
            id: match.matchId,
            name: `${match.homeTeam} vs ${match.awayTeam}`,
            league: match.league,
            status: match.status,
            startTime: match.startTime,
          })) || [],
          Private: data.Private?.map((match: any) => ({
            id: match.matchId,
            name: `${match.homeTeam} vs ${match.awayTeam}`,
            league: match.league,
            status: match.status,
            startTime: match.startTime,
          })) || [],
        };

        setMatches(transformedMatches);
        console.log('Matches loaded:', transformedMatches);
      } catch (error) {
        console.error('Error fetching matches:', error);
        setMatchesError(
          error instanceof Error ? error.message : 'Failed to load matches'
        );

        // Fallback to demo matches if API fails
        setMatches({
          Country: [
            {
              id: 'match-demo-1',
              name: 'Demo Match 1',
              league: 'Demo League',
            },
          ],
          Club: [
            {
              id: 'match-demo-2',
              name: 'Demo Match 2',
              league: 'Demo League',
            },
          ],
          Private: [],
        });
      } finally {
        setIsLoadingMatches(false);
      }
    };

    fetchMatches();
  }, []);

  const themes = [
    {
      value: 'Country',
      icon: '🌍',
      color: 'from-green-500 to-emerald-600',
      label: t('room.theme_country'),
    },
    {
      value: 'Club',
      icon: '⚽',
      color: 'from-blue-500 to-cyan-600',
      label: t('room.theme_club'),
    },
    {
      value: 'Private',
      icon: '🔒',
      color: 'from-purple-500 to-pink-600',
      label: t('room.theme_private'),
    },
  ];

  // Get filtered matches based on selected theme
  const getFilteredMatches = () => {
    if (!selectedTheme) return [];
    return matches[selectedTheme];
  };

  // Button handlers with real WebSocket integration
  const handleCreateRoom = async () => {
    if (!selectedMatch || !wsConnected || isCreating) return;

    setIsCreating(true);

    try {
      console.log('Creating room with:', {
        theme: selectedTheme,
        matchId: selectedMatch.id,
        matchName: selectedMatch.name,
      });

      // Call the store's createRoom method which sends WebSocket message
      const roomCode = await createRoom(selectedTheme!, selectedMatch.id);

      setModalContent({
        emoji: '🎮',
        title: 'Room Created!',
        message: `Your ${selectedTheme} room code is:\n\n${roomCode}\n\nShare this code with friends to join!`,
      });
      setShowModal(true);

      // Navigate to match after 3 seconds (more time to see code)
      setTimeout(() => {
        setShowModal(false);
        onJoinRoom({
          match: selectedMatch.name,
          code: roomCode,
          theme: selectedTheme!,
          matchId: selectedMatch.id,
        });
        setIsCreating(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to create room:', error);
      setModalContent({
        emoji: '❌',
        title: 'Error',
        message: `Failed to create room: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setShowModal(true);
      setTimeout(() => {
        setShowModal(false);
        setIsCreating(false);
      }, 2000);
    }
  };

  const handleJoinRoom = async () => {
    if (!wsConnected || isJoining || roomCode.length < 3) return;

    setIsJoining(true);

    try {
      console.log('Joining room with code:', roomCode);

      setModalContent({
        emoji: '🚪',
        title: 'Joining Room',
        message: `Connecting to room ${roomCode}...`,
      });
      setShowModal(true);

      // Call the store's joinRoom method which sends WebSocket message
      await joinRoom(roomCode);

      // Navigate to match after successful join
      setTimeout(() => {
        setShowModal(false);
        onJoinRoom({
          match: 'Live Match',
          code: roomCode,
          theme: 'Club',
          matchId: 'match-unknown',
        });
        setIsJoining(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to join room:', error);
      setModalContent({
        emoji: '❌',
        title: 'Error',
        message: `Failed to join room: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setShowModal(true);
      setTimeout(() => {
        setShowModal(false);
        setIsJoining(false);
      }, 2000);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Connection Status Warning */}
      {!wsConnected && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Connecting to server...
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Please wait while we establish a connection to the backend.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200 dark:bg-gray-800 rounded-2xl">
        {['create', 'join'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`py-3 px-4 rounded-xl font-semibold transition-all transform active:scale-95 ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {tab === 'create' && '➕ Create'}
            {tab === 'join' && '🚪 Join'}
          </button>
        ))}
      </div>

      {/* Create Room */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          {/* Step 1: Theme Selection */}
          {!selectedTheme && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                Step 1: Choose Room Theme
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select a theme to see available matches
              </p>

              <div className="grid grid-cols-1 gap-3">
                {themes.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => setSelectedTheme(theme.value as any)}
                    className="relative overflow-hidden rounded-2xl p-6 transition-all transform hover:scale-102 active:scale-98"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${theme.color} opacity-90`}
                    ></div>
                    <div className="relative flex items-center justify-between text-white">
                      <div className="flex items-center space-x-4">
                        <span className="text-4xl">{theme.icon}</span>
                        <div className="text-left">
                          <p className="font-bold text-lg">{theme.label}</p>
                          <p className="text-sm opacity-90">
                            {theme.value === 'Private'
                              ? 'Invite only'
                              : 'Public room'}
                          </p>
                        </div>
                      </div>
                      <span className="text-2xl">→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Match Selection */}
          {selectedTheme && !selectedMatch && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 animate-slideDown">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Step 2: Select Match
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedTheme} matches available
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTheme(null)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ← Change Theme
                </button>
              </div>

              {/* Loading State */}
              {isLoadingMatches && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Loading matches...
                  </p>
                </div>
              )}

              {/* Error State */}
              {matchesError && !isLoadingMatches && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Failed to load matches
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {matchesError}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        Showing demo matches as fallback.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Match List */}
              {!isLoadingMatches && (
                <div className="space-y-3">
                  {getFilteredMatches().length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        No matches available
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Check back later for live matches
                      </p>
                    </div>
                  ) : (
                    getFilteredMatches().map((match) => (
                      <button
                        key={match.id}
                        onClick={() => setSelectedMatch(match)}
                        className="w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent hover:border-blue-500 transition-all transform hover:scale-102 active:scale-98"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 dark:text-white">
                              {match.name}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {match.league}
                            </p>
                          </div>
                          <span className="text-2xl">⚽</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm and Create */}
          {selectedTheme && selectedMatch && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-200 dark:border-gray-700 animate-slideDown">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                Ready to Create Room
              </h3>

              {/* Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">
                    {themes.find((t) => t.value === selectedTheme)?.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Theme
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {selectedTheme}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Match
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {selectedMatch.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      ID: {selectedMatch.id}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedMatch(null);
                  }}
                  className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl hover:scale-105 active:scale-95 transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={!wsConnected || isCreating}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? '⏳ Creating...' : '🎮 Create Room'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Join Room */}
      {activeTab === 'join' && (
        <div className="space-y-4">
          {/* Info Card */}
          <div className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">
                    Get a room code from a friend
                  </span>{' '}
                  who created a room, or create your own room to get a code to
                  share!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Enter Room Code
            </h3>

            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="w-full px-6 py-4 text-center text-2xl font-bold tracking-widest bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
              maxLength={6}
            />

            <button
              onClick={handleJoinRoom}
              className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={roomCode.length < 3 || !wsConnected || isJoining}
            >
              <span className="text-lg">
                {isJoining ? '⏳ Joining...' : '🚪 Join Room'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Modern Modal/Popup */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl max-w-sm w-full transform animate-scaleIn border-2 border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">
                {modalContent.emoji}
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                {modalContent.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line">
                {modalContent.message}
              </p>

              {/* Loading Spinner */}
              <div className="flex justify-center">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
