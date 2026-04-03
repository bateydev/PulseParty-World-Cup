/**
 * Demo data for testing components without backend connection
 */

export const demoMatchEvents = [
  {
    eventId: 'evt-1',
    matchId: 'match-123',
    eventType: 'goal',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    teamId: 'team-home',
    playerId: 'player-10',
    metadata: {
      player: 'Müller',
      team: 'Bayern Munich',
      minute: 23,
    },
  },
  {
    eventId: 'evt-2',
    matchId: 'match-123',
    eventType: 'yellow_card',
    timestamp: new Date(Date.now() - 1500000).toISOString(),
    teamId: 'team-away',
    playerId: 'player-5',
    metadata: {
      player: 'Silva',
      team: 'Borussia Dortmund',
      minute: 28,
    },
  },
  {
    eventId: 'evt-3',
    matchId: 'match-123',
    eventType: 'corner',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    teamId: 'team-away',
    metadata: {
      team: 'Borussia Dortmund',
      minute: 35,
    },
  },
  {
    eventId: 'evt-4',
    matchId: 'match-123',
    eventType: 'goal',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    teamId: 'team-away',
    playerId: 'player-9',
    metadata: {
      player: 'Haaland',
      team: 'Borussia Dortmund',
      minute: 42,
    },
  },
  {
    eventId: 'evt-5',
    matchId: 'match-123',
    eventType: 'substitution',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    teamId: 'team-home',
    metadata: {
      playerOut: 'Kimmich',
      playerIn: 'Goretzka',
      team: 'Bayern Munich',
      minute: 58,
    },
  },
];

export const demoPredictionWindow = {
  windowId: 'window-123',
  roomId: 'room-123',
  matchId: 'match-123',
  predictionType: 'next_goal_scorer',
  options: ['Müller', 'Haaland', 'Sané', 'Reus', 'No Goal'],
  expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
  createdAt: new Date().toISOString(),
};

export const demoLeaderboard = [
  {
    userId: 'user-1',
    displayName: 'Football Guru',
    totalPoints: 320,
    streak: 5,
    rank: 1,
  },
  {
    userId: 'demo-user-123',
    displayName: 'Demo Fan',
    totalPoints: 285,
    streak: 3,
    rank: 2,
  },
  {
    userId: 'user-3',
    displayName: 'Soccer Pro',
    totalPoints: 250,
    streak: 0,
    rank: 3,
  },
  {
    userId: 'user-4',
    displayName: 'Match Watcher',
    totalPoints: 210,
    streak: 2,
    rank: 4,
  },
  {
    userId: 'user-5',
    displayName: 'Fan123',
    totalPoints: 180,
    streak: 1,
    rank: 5,
  },
];

export const demoRooms = [
  {
    roomId: 'room-1',
    roomCode: 'BAY-MUN',
    matchId: 'match-123',
    theme: 'Club' as const,
    participants: ['user-1', 'user-2', 'user-3'],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    ttl: Math.floor(Date.now() / 1000) + 604800,
  },
  {
    roomId: 'room-2',
    roomCode: 'GER-FRA',
    matchId: 'match-456',
    theme: 'Country' as const,
    participants: ['user-4', 'user-5'],
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    ttl: Math.floor(Date.now() / 1000) + 604800,
  },
];

export function loadDemoData(store: any) {
  // Load match events
  demoMatchEvents.forEach((event) => store.addMatchEvent(event));

  // Load prediction window
  store.setActivePredictionWindow(demoPredictionWindow);

  // Load leaderboard
  store.setLeaderboard(demoLeaderboard);

  // Set current score
  store.updateScore({ home: 1, away: 1 });

  console.log('✅ Demo data loaded successfully!');

  // Simulate new prediction windows appearing every 2 minutes
  let predictionCount = 1;
  setInterval(() => {
    predictionCount++;

    const predictionTypes = [
      {
        type: 'next_goal_scorer',
        options: ['Müller', 'Haaland', 'Sané', 'Reus', 'No Goal'],
      },
      { type: 'next_card', options: ['Yellow Card', 'Red Card', 'No Card'] },
      { type: 'next_corner', options: ['Home Team', 'Away Team', 'No Corner'] },
      { type: 'half_time_score', options: ['Home Win', 'Draw', 'Away Win'] },
    ];

    const randomPrediction =
      predictionTypes[Math.floor(Math.random() * predictionTypes.length)];

    const newPredictionWindow = {
      windowId: `window-${predictionCount}`,
      roomId: 'room-123',
      matchId: 'match-123',
      predictionType: randomPrediction.type,
      options: randomPrediction.options,
      expiresAt: new Date(Date.now() + 60000).toISOString(), // 1 minute to predict
      createdAt: new Date().toISOString(),
    };

    console.log('🎯 New prediction window:', randomPrediction.type);
    store.setActivePredictionWindow(newPredictionWindow);
  }, 120000); // Every 2 minutes
}
