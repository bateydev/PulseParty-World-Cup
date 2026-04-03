import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PWAStatusIndicator } from './components/PWAStatus';
import { LanguageSelector } from './components/LanguageSelector';
import { RoomLobby } from './components/RoomLobby';
import { MatchTimeline } from './components/MatchTimeline';
import { LivePitch } from './components/LivePitch';
import { PredictionWidget } from './components/PredictionWidget';
import { MobilePredictionSheet } from './components/MobilePredictionSheet';
import { Leaderboard } from './components/Leaderboard';
import { WrappedRecapView } from './components/WrappedRecapView';
import { Toast } from './components/Toast';
import { useAppStore } from './store';
import { loadDemoData } from './demo-data';
import { useDarkMode } from './hooks/useDarkMode';

type View = 'lobby' | 'match' | 'leaderboard' | 'recap';

function App() {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [currentMatchInfo, setCurrentMatchInfo] = useState<{ match: string; code: string; theme: string; matchId: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { user, setUser } = useAppStore();
  const store = useAppStore();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  // Demo: Set a guest user and load demo data
  useEffect(() => {
    if (!user) {
      setUser({
        userId: 'demo-user-123',
        displayName: 'Demo Fan',
        isGuest: true,
      });
    }

    // Load demo data once
    loadDemoData(store);
  }, []);

  // Sample recap data for demo
  const sampleRecap = {
    userId: 'demo-user-123',
    roomId: 'room-123',
    matchId: 'match-456',
    totalPoints: 285,
    finalRank: 2,
    accuracy: 78.5,
    longestStreak: 7,
    clutchMoments: 4,
    shareableUrl: 'https://pulseparty.example.com/recap/demo-user-123',
    createdAt: new Date().toISOString(),
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      <PWAStatusIndicator />
      
      {/* Modern iOS-style Header with Glass Effect */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b ${
        isDark 
          ? 'bg-gray-900/80 border-gray-700/50' 
          : 'bg-white/80 border-gray-200/50'
      } shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                <span className="text-2xl">⚽</span>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  PulseParty
                </h1>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Live Match Party
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              <LanguageSelector />
              
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2.5 rounded-xl transition-all transform hover:scale-110 active:scale-95 ${
                  isDark
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    : 'bg-gray-800/10 text-gray-700 hover:bg-gray-800/20'
                }`}
                aria-label="Toggle dark mode"
              >
                {isDark ? '☀️' : '🌙'}
              </button>

              {/* User Profile Picture */}
              {user && (
                <div className="relative group">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg cursor-pointer transform hover:scale-110 transition-all ${
                    user.isGuest
                      ? 'bg-gradient-to-br from-gray-400 to-gray-600 text-white'
                      : 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                  }`}>
                    {user.displayName.substring(0, 2).toUpperCase()}
                  </div>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute right-0 top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className={`px-3 py-2 rounded-lg shadow-xl text-sm whitespace-nowrap ${
                      isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                    }`}>
                      {user.displayName}
                      {user.isGuest && <span className="text-xs opacity-75"> (Guest)</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Navigation - iOS Style */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t ${
        isDark 
          ? 'bg-gray-900/95 border-gray-700/50' 
          : 'bg-white/95 border-gray-200/50'
      } shadow-2xl safe-area-inset-bottom`}>
        <div className="max-w-7xl mx-auto px-2 py-2">
          <div className="grid grid-cols-4 gap-1">
            {/* Lobby Tab */}
            <button
              onClick={() => setCurrentView('lobby')}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all transform active:scale-95 ${
                currentView === 'lobby'
                  ? isDark
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-blue-500/10 text-blue-600'
                  : isDark
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-2xl mb-1">🏠</span>
              <span className="text-xs font-semibold">Lobby</span>
            </button>

            {/* Match Tab */}
            <button
              onClick={() => setCurrentView('match')}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all transform active:scale-95 ${
                currentView === 'match'
                  ? isDark
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-green-500/10 text-green-600'
                  : isDark
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-2xl mb-1">⚽</span>
              <span className="text-xs font-semibold">Live</span>
              {currentView === 'match' && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </button>

            {/* Leaderboard Tab */}
            <button
              onClick={() => setCurrentView('leaderboard')}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all transform active:scale-95 ${
                currentView === 'leaderboard'
                  ? isDark
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-yellow-500/10 text-yellow-600'
                  : isDark
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-2xl mb-1">🏆</span>
              <span className="text-xs font-semibold">Ranks</span>
            </button>

            {/* Recap Tab */}
            <button
              onClick={() => setCurrentView('recap')}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all transform active:scale-95 ${
                currentView === 'recap'
                  ? isDark
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-purple-500/10 text-purple-600'
                  : isDark
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-2xl mb-1">📊</span>
              <span className="text-xs font-semibold">Stats</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content with padding for fixed nav */}
      <main className="max-w-7xl mx-auto px-4 pt-4 pb-24">
        {/* Demo Banner */}
        <div className={`mb-4 rounded-2xl p-4 backdrop-blur-sm border ${
          isDark
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-700'
        }`}>
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🎮</span>
            <div>
              <p className="font-semibold mb-1">Demo Mode Active</p>
              <p className="text-sm opacity-90">
                All features loaded with sample data. Tap around to explore!
              </p>
            </div>
          </div>
        </div>

        {/* View Content */}
        <div className="animate-fadeIn">
          {currentView === 'lobby' && (
            <RoomLobby 
              onJoinRoom={(matchInfo) => {
                if (matchInfo) {
                  setCurrentMatchInfo(matchInfo);
                }
                setCurrentView('match');
              }} 
            />
          )}
          
          {currentView === 'match' && (
            <div className="space-y-4">
              {/* Match Info Header */}
              {currentMatchInfo && (
                <div className={`rounded-2xl p-4 backdrop-blur-sm border ${
                  currentMatchInfo.theme === 'Country'
                    ? 'bg-green-500/10 border-green-500/30'
                    : currentMatchInfo.theme === 'Club'
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-purple-500/10 border-purple-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                          🔴 LIVE
                        </span>
                        <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-full">
                          {currentMatchInfo.theme}
                        </span>
                      </div>
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                        {currentMatchInfo.match}
                      </h2>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Code: <span className="font-mono font-bold">{currentMatchInfo.code}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentMatchInfo.code);
                        setToastMessage('Room code copied!');
                      }}
                      className="ml-2 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      📋
                    </button>
                  </div>
                </div>
              )}

              {/* Desktop Layout: Side by side */}
              <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4">
                {/* Left: Pitch + Timeline */}
                <div className="lg:col-span-8 space-y-4">
                  <LivePitch />
                  <MatchTimeline />
                </div>
                
                {/* Right: Prediction + Leaderboard Preview */}
                <div className="lg:col-span-4 space-y-4">
                  <PredictionWidget />
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Top Players</h3>
                    <button
                      onClick={() => setCurrentView('leaderboard')}
                      className="w-full py-2 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:scale-105 active:scale-95 transition-all"
                    >
                      View Full Leaderboard 🏆
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Layout: Stacked with collapsible prediction */}
              <div className="lg:hidden space-y-4">
                {/* Pitch takes full width */}
                <LivePitch />
                
                {/* Collapsible Prediction Widget - Bottom Sheet Style */}
                <MobilePredictionSheet />
                
                {/* Timeline below */}
                <MatchTimeline />
              </div>
            </div>
          )}

          {currentView === 'leaderboard' && <Leaderboard />}
          
          {currentView === 'recap' && <WrappedRecapView recap={sampleRecap} />}
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

export default App;
