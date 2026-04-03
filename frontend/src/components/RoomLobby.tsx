import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';

/**
 * RoomLobby Component
 *
 * Provides interface for:
 * - Creating rooms with theme selection (Country/Club/Private)
 * - Joining rooms via room code
 * - Discovering public rooms with match and theme filters
 *
 * Requirements: 1.2, 1.4, 1.7
 */

interface PublicRoom {
  roomId: string;
  roomCode: string;
  matchId: string;
  theme: 'Country' | 'Club' | 'Private';
  participantCount: number;
}

export function RoomLobby() {
  const { t } = useTranslation();
  const { createRoom, joinRoom, wsConnected } = useAppStore();

  // State for room creation
  const [selectedTheme, setSelectedTheme] = useState<'Country' | 'Club' | 'Private'>('Country');
  const [matchId, setMatchId] = useState('match-demo-001');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // State for room joining
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // State for room discovery
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [matchFilter, setMatchFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState<'all' | 'Country' | 'Club'>('all');

  // Mock public rooms for demo (in production, this would come from API)
  useEffect(() => {
    // Simulate fetching public rooms
    const mockRooms: PublicRoom[] = [
      {
        roomId: 'room-1',
        roomCode: 'ABC123',
        matchId: 'match-demo-001',
        theme: 'Country',
        participantCount: 5,
      },
      {
        roomId: 'room-2',
        roomCode: 'XYZ789',
        matchId: 'match-demo-001',
        theme: 'Club',
        participantCount: 3,
      },
      {
        roomId: 'room-3',
        roomCode: 'DEF456',
        matchId: 'match-demo-002',
        theme: 'Country',
        participantCount: 8,
      },
    ];
    setPublicRooms(mockRooms);
  }, []);

  // Filter public rooms based on selected filters
  const filteredRooms = publicRooms.filter((room) => {
    const matchesMatchFilter = matchFilter === 'all' || room.matchId === matchFilter;
    const matchesThemeFilter = themeFilter === 'all' || room.theme === themeFilter;
    return matchesMatchFilter && matchesThemeFilter;
  });

  // Handle room creation
  const handleCreateRoom = async () => {
    if (!wsConnected) {
      setCreateError('WebSocket not connected. Please wait...');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const code = await createRoom(selectedTheme, matchId);
      console.log('Room created with code:', code);
      // Navigation to room view would happen here
    } catch (error) {
      console.error('Failed to create room:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle room joining
  const handleJoinRoom = async (code: string) => {
    if (!wsConnected) {
      setJoinError('WebSocket not connected. Please wait...');
      return;
    }

    if (!code.trim()) {
      setJoinError('Please enter a room code');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      await joinRoom(code.trim().toUpperCase());
      console.log('Joined room:', code);
      // Navigation to room view would happen here
    } catch (error) {
      console.error('Failed to join room:', error);
      setJoinError(error instanceof Error ? error.message : t('room.not_found'));
    } finally {
      setIsJoining(false);
    }
  };

  // Handle joining from public room list
  const handleJoinPublicRoom = async (code: string) => {
    await handleJoinRoom(code);
  };

  return (
    <div className="room-lobby max-w-4xl mx-auto p-4 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">{t('app.name')}</h1>
        <p className="text-gray-600">{t('app.tagline')}</p>
      </div>

      {/* Connection Status */}
      {!wsConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-800">{t('common.loading')}</p>
        </div>
      )}

      {/* Create Room Section */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">{t('room.create')}</h2>

        {/* Theme Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{t('room.theme')}</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedTheme('Country')}
              className={`py-3 px-4 rounded-lg border-2 transition-colors ${
                selectedTheme === 'Country'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              aria-pressed={selectedTheme === 'Country'}
            >
              {t('room.theme_country')}
            </button>
            <button
              onClick={() => setSelectedTheme('Club')}
              className={`py-3 px-4 rounded-lg border-2 transition-colors ${
                selectedTheme === 'Club'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              aria-pressed={selectedTheme === 'Club'}
            >
              {t('room.theme_club')}
            </button>
            <button
              onClick={() => setSelectedTheme('Private')}
              className={`py-3 px-4 rounded-lg border-2 transition-colors ${
                selectedTheme === 'Private'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              aria-pressed={selectedTheme === 'Private'}
            >
              {t('room.theme_private')}
            </button>
          </div>
        </div>

        {/* Match Selection (simplified for demo) */}
        <div className="mb-4">
          <label htmlFor="match-select" className="block text-sm font-medium mb-2">
            Match
          </label>
          <select
            id="match-select"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="match-demo-001">Demo Match 1: Team A vs Team B</option>
            <option value="match-demo-002">Demo Match 2: Team C vs Team D</option>
          </select>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateRoom}
          disabled={isCreating || !wsConnected}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? t('common.loading') : t('room.create')}
        </button>

        {/* Create Error */}
        {createError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {createError}
          </div>
        )}
      </section>

      {/* Join Room Section */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">{t('room.join')}</h2>

        <div className="flex gap-3">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder={t('room.code_placeholder')}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={10}
            aria-label={t('room.code')}
          />
          <button
            onClick={() => handleJoinRoom(roomCode)}
            disabled={isJoining || !wsConnected || !roomCode.trim()}
            className="py-2 px-6 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isJoining ? t('common.loading') : t('room.join')}
          </button>
        </div>

        {/* Join Error */}
        {joinError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {joinError}
          </div>
        )}
      </section>

      {/* Discover Public Rooms Section */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">{t('room.discover')}</h2>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="match-filter" className="block text-sm font-medium mb-2">
              Match Filter
            </label>
            <select
              id="match-filter"
              value={matchFilter}
              onChange={(e) => setMatchFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Matches</option>
              <option value="match-demo-001">Demo Match 1</option>
              <option value="match-demo-002">Demo Match 2</option>
            </select>
          </div>

          <div>
            <label htmlFor="theme-filter" className="block text-sm font-medium mb-2">
              Theme Filter
            </label>
            <select
              id="theme-filter"
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value as 'all' | 'Country' | 'Club')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Themes</option>
              <option value="Country">{t('room.theme_country')}</option>
              <option value="Club">{t('room.theme_club')}</option>
            </select>
          </div>
        </div>

        {/* Public Rooms List */}
        <div className="space-y-3">
          {filteredRooms.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No public rooms available</p>
          ) : (
            filteredRooms.map((room) => (
              <div
                key={room.roomId}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-lg">{room.roomCode}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {room.theme}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {room.participantCount} {t('room.participants')}
                  </p>
                </div>
                <button
                  onClick={() => handleJoinPublicRoom(room.roomCode)}
                  disabled={isJoining || !wsConnected}
                  className="py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {t('room.join')}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
