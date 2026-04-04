import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { PWAStatusIndicator } from './components/PWAStatus';
import { LowBandwidthIndicator } from './components/LowBandwidthIndicator';
import { SettingsPanel } from './components/SettingsPanel';
import { LanguageSelector } from './components/LanguageSelector';
import { Toast } from './components/Toast';
import { AuthModal } from './components/AuthModal';
import { SimulatorPanel } from './components/SimulatorPanel';
import { useAppStore } from './store';
import { useDarkMode } from './hooks/useDarkMode';
import { config } from './config/environment';

// Lazy load heavy components for better performance
const RoomLobby = lazy(() =>
  import('./components/RoomLobby').then((m) => ({ default: m.RoomLobby }))
);
const MatchTimeline = lazy(() =>
  import('./components/MatchTimeline').then((m) => ({
    default: m.MatchTimeline,
  }))
);
const LivePitch = lazy(() =>
  import('./components/LivePitch').then((m) => ({ default: m.LivePitch }))
);
const PredictionWidget = lazy(() =>
  import('./components/PredictionWidget').then((m) => ({
    default: m.PredictionWidget,
  }))
);
const MobilePredictionSheet = lazy(() =>
  import('./components/MobilePredictionSheet').then((m) => ({
    default: m.MobilePredictionSheet,
  }))
);
const Leaderboard = lazy(() =>
  import('./components/Leaderboard').then((m) => ({ default: m.Leaderboard }))
);

type View = 'lobby' | 'match' | 'leaderboard' | 'recap';

// Loading component for Suspense fallback
function LoadingSpinner({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div
        className={`animate-spin rounded-full h-12 w-12 border-4 ${
          isDark
            ? 'border-gray-700 border-t-blue-500'
            : 'border-gray-200 border-t-blue-600'
        }`}
      ></div>
    </div>
  );
}

function App() {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [currentMatchInfo, setCurrentMatchInfo] = useState<{
    match: string;
    code: string;
    theme: string;
    matchId: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, setUser, connectWebSocket, wsConnected, reconnecting } =
    useAppStore();
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  // Initialize guest user
  useEffect(() => {
    if (!user) {
      // Generate a guest user
      const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setUser({
        userId: guestId,
        displayName: `Guest ${Math.floor(Math.random() * 9999)}`,
        isGuest: true,
      });
    }
  }, []); // Empty dependency array - only run once on mount

  // Connect to WebSocket when user is ready
  useEffect(() => {
    if (user && !wsConnected && !reconnecting) {
      console.log('Connecting to AWS WebSocket:', config.websocketUrl);
      connectWebSocket(config.websocketUrl);
    }
  }, [user, wsConnected, reconnecting, connectWebSocket]); // Connect when user is set

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
          : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
      }`}
    >
      <PWAStatusIndicator />
      <LowBandwidthIndicator />
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDark={isDark}
        onToggleDarkMode={toggleDarkMode}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isDark={isDark}
      />

      {/* Modern iOS-style Header with Glass Effect */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-xl border-b ${
          isDark
            ? 'bg-gray-900/80 border-gray-700/50'
            : 'bg-white/80 border-gray-200/50'
        } shadow-lg`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                <span className="text-2xl">⚽</span>
              </div>
              <div>
                <h1
                  className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  PulseParty
                </h1>
                <p
                  className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Live Match Party
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              <LanguageSelector />

              {/* Account Button */}
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className={`p-2.5 rounded-xl transition-all transform hover:scale-110 active:scale-95 ${
                  isDark
                    ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-200/50 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="Account"
                title={user?.isGuest ? 'Create Account' : 'Account'}
              >
                {user?.isGuest ? '👤' : '✓'}
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`p-2.5 rounded-xl transition-all transform hover:scale-110 active:scale-95 ${
                  isDark
                    ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-200/50 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="Settings"
              >
                ⚙️
              </button>

              {/* User Profile Picture */}
              {user && (
                <div className="relative group">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg cursor-pointer transform hover:scale-110 transition-all ${
                      user.isGuest
                        ? 'bg-gradient-to-br from-gray-400 to-gray-600 text-white'
                        : 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                    }`}
                  >
                    {user.displayName.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute right-0 top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div
                      className={`px-3 py-2 rounded-lg shadow-xl text-sm whitespace-nowrap ${
                        isDark
                          ? 'bg-gray-800 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                    >
                      {user.displayName}
                      {user.isGuest && (
                        <span className="text-xs opacity-75"> (Guest)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Navigation - iOS Style */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t ${
          isDark
            ? 'bg-gray-900/95 border-gray-700/50'
            : 'bg-white/95 border-gray-200/50'
        } shadow-2xl safe-area-inset-bottom`}
      >
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

      {/* Main Content with padding for fixed header and nav */}
      <main className="max-w-7xl mx-auto px-4 pt-20 pb-24">
        {/* Connection Status Banner */}
        {wsConnected ? (
          <div
            className={`mb-4 rounded-2xl p-4 backdrop-blur-sm border ${
              isDark
                ? 'bg-green-500/10 border-green-500/20 text-green-300'
                : 'bg-green-500/10 border-green-500/20 text-green-700'
            }`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold mb-1">Connected to AWS Backend</p>
                <p className="text-sm opacity-90">
                  WebSocket connection established. Ready to create or join
                  rooms!
                </p>
              </div>
            </div>
          </div>
        ) : reconnecting ? (
          <div
            className={`mb-4 rounded-2xl p-4 backdrop-blur-sm border ${
              isDark
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700'
            }`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🔄</span>
              <div>
                <p className="font-semibold mb-1">Reconnecting...</p>
                <p className="text-sm opacity-90">
                  Attempting to reconnect to AWS backend...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`mb-4 rounded-2xl p-4 backdrop-blur-sm border ${
              isDark
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-700'
            }`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🔌</span>
              <div>
                <p className="font-semibold mb-1">
                  Connecting to AWS Backend...
                </p>
                <p className="text-sm opacity-90">
                  Establishing WebSocket connection...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View Content */}
        <div className="animate-fadeIn">
          <Suspense fallback={<LoadingSpinner isDark={isDark} />}>
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
                  <div
                    className={`rounded-2xl p-4 backdrop-blur-sm border ${
                      currentMatchInfo.theme === 'Country'
                        ? 'bg-green-500/10 border-green-500/30'
                        : currentMatchInfo.theme === 'Club'
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-purple-500/10 border-purple-500/30'
                    }`}
                  >
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
                          Code:{' '}
                          <span className="font-mono font-bold">
                            {currentMatchInfo.code}
                          </span>
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
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        Top Players
                      </h3>
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

            {currentView === 'recap' && (
              <div
                className={`rounded-2xl p-8 text-center ${
                  isDark ? 'bg-gray-800' : 'bg-white'
                }`}
              >
                <div className="text-6xl mb-4">📊</div>
                <h2
                  className={`text-2xl font-bold mb-4 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Match Recaps Coming Soon
                </h2>
                <p
                  className={`text-lg mb-6 ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  Your personalized match stats and highlights will appear here
                  after you complete a match.
                </p>
                <div
                  className={`p-4 rounded-xl ${
                    isDark
                      ? 'bg-blue-500/10 border border-blue-500/20'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <p
                    className={`text-sm ${
                      isDark ? 'text-blue-300' : 'text-blue-700'
                    }`}
                  >
                    💡 Join or create a room to start earning points and unlock
                    your recap!
                  </p>
                </div>
              </div>
            )}
          </Suspense>
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

      {/* Simulator Panel - Dev Tools */}
      <SimulatorPanel matchApiUrl={config.matchApiUrl} />
    </div>
  );
}

export default App;
