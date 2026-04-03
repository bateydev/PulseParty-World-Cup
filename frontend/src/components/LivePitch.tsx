import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { formatScore, formatPercentage } from '../utils/formatters';

interface BallPosition {
  x: number; // 0-100 (percentage from left)
  y: number; // 0-100 (percentage from top)
  timestamp: number;
}

interface Player {
  id: number;
  team: 'home' | 'away';
  x: number;
  y: number;
  number: number;
}

export function LivePitch() {
  const { i18n } = useTranslation();
  const { matchEvents, currentScore } = useAppStore();
  const locale = i18n.language;
  const [ballPosition, setBallPosition] = useState<BallPosition>({
    x: 50,
    y: 50,
    timestamp: Date.now(),
  });
  const [possession, setPossession] = useState<'home' | 'away' | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  // Initialize players in formation
  useEffect(() => {
    const initialPlayers: Player[] = [
      // Home team (blue) - 4-3-3 formation on left side
      { id: 1, team: 'home', x: 10, y: 50, number: 1 }, // GK
      { id: 2, team: 'home', x: 20, y: 20, number: 2 }, // Defender
      { id: 3, team: 'home', x: 20, y: 40, number: 3 }, // Defender
      { id: 4, team: 'home', x: 20, y: 60, number: 4 }, // Defender
      { id: 5, team: 'home', x: 20, y: 80, number: 5 }, // Defender
      { id: 6, team: 'home', x: 35, y: 30, number: 6 }, // Midfielder
      { id: 7, team: 'home', x: 35, y: 50, number: 8 }, // Midfielder
      { id: 8, team: 'home', x: 35, y: 70, number: 10 }, // Midfielder
      { id: 9, team: 'home', x: 45, y: 25, number: 7 }, // Forward
      { id: 10, team: 'home', x: 45, y: 50, number: 9 }, // Forward
      { id: 11, team: 'home', x: 45, y: 75, number: 11 }, // Forward

      // Away team (red) - 4-3-3 formation on right side
      { id: 12, team: 'away', x: 90, y: 50, number: 1 }, // GK
      { id: 13, team: 'away', x: 80, y: 20, number: 2 }, // Defender
      { id: 14, team: 'away', x: 80, y: 40, number: 5 }, // Defender
      { id: 15, team: 'away', x: 80, y: 60, number: 4 }, // Defender
      { id: 16, team: 'away', x: 80, y: 80, number: 3 }, // Defender
      { id: 17, team: 'away', x: 65, y: 30, number: 6 }, // Midfielder
      { id: 18, team: 'away', x: 65, y: 50, number: 8 }, // Midfielder
      { id: 19, team: 'away', x: 65, y: 70, number: 10 }, // Midfielder
      { id: 20, team: 'away', x: 55, y: 25, number: 7 }, // Forward
      { id: 21, team: 'away', x: 55, y: 50, number: 9 }, // Forward
      { id: 22, team: 'away', x: 55, y: 75, number: 11 }, // Forward
    ];
    setPlayers(initialPlayers);
  }, []);

  // Simulate ball movement based on events
  useEffect(() => {
    if (matchEvents.length === 0) return;

    const latestEvent = matchEvents[matchEvents.length - 1];

    // Update ball position based on event type
    let newX = ballPosition.x;
    let newY = ballPosition.y;
    let newPossession = possession;

    switch (latestEvent.eventType) {
      case 'goal':
        // Ball goes to goal
        newX = latestEvent.teamId === 'team-home' ? 90 : 10;
        newY = 50;
        break;
      case 'corner':
        // Ball goes to corner
        newX = Math.random() > 0.5 ? 90 : 10;
        newY = Math.random() > 0.5 ? 10 : 90;
        break;
      case 'shot':
        // Ball near goal
        newX = latestEvent.teamId === 'team-home' ? 75 : 25;
        newY = 40 + Math.random() * 20;
        break;
      case 'possession':
        // Update possession
        newPossession = latestEvent.teamId === 'team-home' ? 'home' : 'away';
        newX = latestEvent.teamId === 'team-home' ? 60 : 40;
        newY = 50;
        break;
      default:
        // Random movement in the middle third
        newX = 35 + Math.random() * 30;
        newY = 30 + Math.random() * 40;
    }

    setBallPosition({ x: newX, y: newY, timestamp: Date.now() });
    setPossession(newPossession);

    // Move players slightly towards ball
    setPlayers((prev) =>
      prev.map((player) => {
        const distanceToBall = Math.sqrt(
          Math.pow(player.x - newX, 2) + Math.pow(player.y - newY, 2)
        );
        if (distanceToBall < 20) {
          // Players near ball move slightly
          return {
            ...player,
            x: player.x + (newX - player.x) * 0.1,
            y: player.y + (newY - player.y) * 0.1,
          };
        }
        return player;
      })
    );
  }, [matchEvents]);

  // Auto-animate ball and players movement
  useEffect(() => {
    const interval = setInterval(() => {
      // Slight random ball movement
      setBallPosition((prev) => ({
        x: Math.max(5, Math.min(95, prev.x + (Math.random() - 0.5) * 3)),
        y: Math.max(5, Math.min(95, prev.y + (Math.random() - 0.5) * 3)),
        timestamp: Date.now(),
      }));

      // Players move slightly
      setPlayers((prev) =>
        prev.map((player) => ({
          ...player,
          x: Math.max(5, Math.min(95, player.x + (Math.random() - 0.5) * 2)),
          y: Math.max(5, Math.min(95, player.y + (Math.random() - 0.5) * 2)),
        }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="live-pitch w-full">
      {/* Score Display */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
            HOME
          </div>
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            {currentScore.home}
          </div>
        </div>
        <div className="text-3xl font-bold text-gray-400">-</div>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
            AWAY
          </div>
          <div className="text-4xl font-bold text-red-600 dark:text-red-400">
            {currentScore.away}
          </div>
        </div>
      </div>

      {/* Pitch Visualization */}
      <div className="relative w-full aspect-[16/10] bg-gradient-to-b from-green-600 to-green-700 rounded-2xl shadow-2xl overflow-hidden border-4 border-white dark:border-gray-700">
        {/* Pitch Lines */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Outer boundary */}
          <rect
            x="2"
            y="2"
            width="96"
            height="96"
            fill="none"
            stroke="white"
            strokeWidth="0.3"
            opacity="0.8"
          />

          {/* Center line */}
          <line
            x1="50"
            y1="2"
            x2="50"
            y2="98"
            stroke="white"
            strokeWidth="0.3"
            opacity="0.8"
          />

          {/* Center circle */}
          <circle
            cx="50"
            cy="50"
            r="10"
            fill="none"
            stroke="white"
            strokeWidth="0.3"
            opacity="0.8"
          />
          <circle cx="50" cy="50" r="0.5" fill="white" opacity="0.8" />

          {/* Left penalty area */}
          <rect
            x="2"
            y="30"
            width="15"
            height="40"
            fill="none"
            stroke="white"
            strokeWidth="0.3"
            opacity="0.8"
          />
          <rect
            x="2"
            y="40"
            width="6"
            height="20"
            fill="none"
            stroke="white"
            strokeWidth="0.3"
            opacity="0.8"
          />

          {/* Right penalty area */}
          <rect
            x="83"
            y="30"
            width="15"
            height="40"
            fill="none"
            stroke="white"
            strokeWidth="0.3"
            opacity="0.8"
          />
          <rect
            x="92"
            y="40"
            width="6"
            height="20"
            fill="none"
            stroke="white"
            strokeWidth="0.3"
            opacity="0.8"
          />

          {/* Goals */}
          <rect x="0" y="45" width="2" height="10" fill="white" opacity="0.3" />
          <rect
            x="98"
            y="45"
            width="2"
            height="10"
            fill="white"
            opacity="0.3"
          />
        </svg>

        {/* Grass Pattern */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={`h-[10%] ${i % 2 === 0 ? 'bg-green-800' : 'bg-transparent'}`}
            />
          ))}
        </div>

        {/* Players */}
        {players.map((player) => (
          <div
            key={player.id}
            className="absolute transition-all duration-1000 ease-out"
            style={{
              left: `${player.x}%`,
              top: `${player.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative">
              {/* Player dot */}
              <div
                className={`w-6 h-6 rounded-full border-2 border-white shadow-lg ${
                  player.team === 'home' ? 'bg-blue-500' : 'bg-red-500'
                }`}
              >
                {/* Jersey number */}
                <div className="absolute inset-0 flex items-center justify-center text-white text-[8px] font-bold">
                  {player.number}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Ball */}
        <div
          className="absolute w-4 h-4 transition-all duration-1000 ease-out z-20"
          style={{
            left: `${ballPosition.x}%`,
            top: `${ballPosition.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative w-full h-full">
            {/* Ball shadow */}
            <div className="absolute inset-0 bg-black/30 rounded-full blur-sm transform translate-y-1"></div>
            {/* Ball */}
            <div className="absolute inset-0 bg-white rounded-full shadow-lg animate-pulse">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white to-gray-300"></div>
            </div>
          </div>
        </div>

        {/* Possession Indicator */}
        {possession && (
          <div
            className={`absolute top-4 ${possession === 'home' ? 'left-4' : 'right-4'} px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg animate-pulse ${
              possession === 'home' ? 'bg-blue-500' : 'bg-red-500'
            }`}
          >
            {possession === 'home' ? '🏠 HOME' : '✈️ AWAY'}
          </div>
        )}

        {/* Live Indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          LIVE
        </div>
      </div>

      {/* Match Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Shots
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {formatScore(8, 6, locale)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Possession
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {formatPercentage(52, locale, 0)} -{' '}
            {formatPercentage(48, locale, 0)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Corners
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {formatScore(4, 3, locale)}
          </div>
        </div>
      </div>
    </div>
  );
}
