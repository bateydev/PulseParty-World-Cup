import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';

interface RoomLobbyProps {
  onJoinRoom: (matchInfo?: { match: string; code: string; theme: string }) => void;
}

export function RoomLobby({ onJoinRoom }: RoomLobbyProps) {
  const { t } = useTranslation();
  const [selectedTheme, setSelectedTheme] = useState<'Country' | 'Club' | 'Private'>('Country');
  const [roomCode, setRoomCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'discover'>('create');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', emoji: '' });

  const themes = [
    { value: 'Country', icon: '🌍', color: 'from-green-500 to-emerald-600', label: t('room.theme_country') },
    { value: 'Club', icon: '⚽', color: 'from-blue-500 to-cyan-600', label: t('room.theme_club') },
    { value: 'Private', icon: '🔒', color: 'from-purple-500 to-pink-600', label: t('room.theme_private') },
  ];

  const mockRooms = [
    { code: 'BAY-MUN', match: 'Bayern Munich vs Borussia Dortmund', players: 12, theme: 'Club', homeTeam: 'Bayern Munich', awayTeam: 'Borussia Dortmund' },
    { code: 'GER-FRA', match: 'Germany vs France', players: 8, theme: 'Country', homeTeam: 'Germany', awayTeam: 'France' },
    { code: 'LIVE-01', match: 'Real Madrid vs Barcelona', players: 15, theme: 'Club', homeTeam: 'Real Madrid', awayTeam: 'Barcelona' },
  ];

  // Generate a random room code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    return `${chars[Math.floor(Math.random() * chars.length)]}${chars[Math.floor(Math.random() * chars.length)]}${chars[Math.floor(Math.random() * chars.length)]}-${nums[Math.floor(Math.random() * nums.length)]}${nums[Math.floor(Math.random() * nums.length)]}${nums[Math.floor(Math.random() * nums.length)]}`;
  };

  // Button handlers with feedback
  const handleCreateRoom = () => {
    const generatedCode = generateRoomCode();
    console.log('Creating room with theme:', selectedTheme, 'Code:', generatedCode);
    
    setModalContent({
      emoji: '🎮',
      title: 'Room Created!',
      message: `Your ${selectedTheme} room code is:\n\n${generatedCode}\n\nShare this code with friends to join!`
    });
    setShowModal(true);
    
    // Navigate to match after 3 seconds (more time to see code)
    setTimeout(() => {
      setShowModal(false);
      onJoinRoom({ match: 'Live Match', code: generatedCode, theme: selectedTheme });
    }, 3000);
  };

  const handleJoinRoom = () => {
    console.log('Joining room with code:', roomCode);
    setModalContent({
      emoji: '🚪',
      title: 'Joining Room',
      message: `Connecting to room ${roomCode}...`
    });
    setShowModal(true);
    
    // Navigate to match after 1.5 seconds
    setTimeout(() => {
      setShowModal(false);
      onJoinRoom({ match: 'Live Match', code: roomCode, theme: 'Club' });
    }, 1500);
  };

  const handleJoinDiscoveredRoom = (room: any) => {
    console.log('Joining discovered room:', room);
    setModalContent({
      emoji: '⚽',
      title: room.match,
      message: `Joining ${room.players} fans watching live...\n\n${room.homeTeam} vs ${room.awayTeam}`
    });
    setShowModal(true);
    
    // Navigate to match after 2 seconds
    setTimeout(() => {
      setShowModal(false);
      onJoinRoom({ match: room.match, code: room.code, theme: room.theme });
    }, 2000);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Tab Selector */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-gray-200 dark:bg-gray-800 rounded-2xl">
        {['create', 'join', 'discover'].map((tab) => (
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
            {tab === 'discover' && '🔍 Discover'}
          </button>
        ))}
      </div>

      {/* Create Room */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Choose Room Theme
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => setSelectedTheme(theme.value as any)}
                  className={`relative overflow-hidden rounded-2xl p-6 transition-all transform active:scale-98 ${
                    selectedTheme === theme.value
                      ? 'ring-4 ring-blue-500 dark:ring-blue-400 scale-105'
                      : 'hover:scale-102'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${theme.color} opacity-90`}></div>
                  <div className="relative flex items-center justify-between text-white">
                    <div className="flex items-center space-x-4">
                      <span className="text-4xl">{theme.icon}</span>
                      <div className="text-left">
                        <p className="font-bold text-lg">{theme.label}</p>
                        <p className="text-sm opacity-90">
                          {theme.value === 'Private' ? 'Invite only' : 'Public room'}
                        </p>
                      </div>
                    </div>
                    {selectedTheme === theme.value && (
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <span className="text-green-500">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button 
              onClick={handleCreateRoom}
              className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform hover:scale-105 active:scale-95 transition-all"
            >
              <span className="text-lg">🎮 Create Room</span>
            </button>
          </div>
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
                  <span className="font-semibold">Get a room code from a friend</span> who created a room, or create your own room to get a code to share!
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
              placeholder="ABC-123"
              className="w-full px-6 py-4 text-center text-2xl font-bold tracking-widest bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
              maxLength={7}
            />

            <button 
              onClick={handleJoinRoom}
              className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={roomCode.length < 3}
            >
              <span className="text-lg">🚪 Join Room</span>
            </button>
          </div>
        </div>
      )}

      {/* Discover Rooms */}
      {activeTab === 'discover' && (
        <div className="space-y-3">
          {mockRooms.map((room, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700 transform hover:scale-102 active:scale-98 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                      🔴 LIVE
                    </span>
                    <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-full">
                      {room.theme}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                    {room.match}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    👥 {room.players} watching • Code: {room.code}
                  </p>
                </div>
                <button 
                  onClick={() => handleJoinDiscoveredRoom(room)}
                  className="ml-4 bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-110 active:scale-95 transition-all"
                >
                  Join
                </button>
              </div>
            </div>
          ))}
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
              <div className="text-6xl mb-4 animate-bounce">{modalContent.emoji}</div>
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
