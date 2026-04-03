# PulseParty Rooms - Demo Guide

## 🚀 Quick Start

```bash
cd frontend
npm run dev
```

Then open your browser to `http://localhost:5173`

## 📱 What You'll See

The app now has **4 main views** accessible via the navigation tabs:

### 1. 🏠 Room Lobby
- **Theme Selection**: Choose between Country, Club, or Private rooms
- **Room Code Input**: Enter a code to join an existing room
- **Public Room Discovery**: Browse available public rooms
- **Create Room Button**: Start your own watch party

### 2. ⚽ Match View
Shows a live match experience with:
- **Match Timeline** (left side): 
  - Real-time event cards (goals, cards, corners, etc.)
  - Auto-scrolls to latest events
  - Localized descriptions
  - Sample events already loaded!

- **Prediction Widget** (right side):
  - Active prediction window with countdown timer
  - Multiple choice options
  - Submit button
  - Try submitting a prediction!

### 3. 🏆 Leaderboard
- **Live Rankings**: See all players ranked by points
- **Your Position**: Highlighted in yellow (you're "Demo Fan" at rank #2!)
- **Streak Indicators**: Fire emojis for hot streaks 🔥
- **Medals**: Top 3 get 🥇🥈🥉

### 4. 📊 Recap (NEW!)
Your personalized match summary with:
- **Animated Stats Cards**:
  - Total Points: 285
  - Final Rank: 🥈 (2nd place!)
  - Accuracy: 78.5%
  - Longest Streak: 7 🔥
  - Clutch Moments: 4 ⚡

- **Performance Message**: Based on your achievements
- **Share Buttons**: Twitter, Facebook, Copy Link
- **Beautiful Animations**: Stats reveal one by one

## 🌍 Language Switching

Click the language selector in the top-right to test:
- 🇬🇧 English (EN)
- 🇫🇷 French (FR)
- 🇩🇪 German (DE)
- 🇹🇿 Swahili (SW)

All components update instantly!

## 🎨 Features to Test

### Room Lobby
- Click theme buttons (Country/Club/Private)
- Type in the room code input
- See the public rooms list

### Match Timeline
- Scroll through the 5 pre-loaded events
- Notice the different event types with icons
- Check the timestamps

### Prediction Widget
- Watch the countdown timer (45 seconds)
- Click on different prediction options
- Try submitting a prediction

### Leaderboard
- Find yourself (Demo Fan) highlighted in yellow
- See the "You" badge
- Notice the streak fire emojis
- Check the medal emojis for top 3

### Wrapped Recap
- Watch the stats animate in sequence
- Try the share buttons
- See the performance message at the top

## 🔧 Demo Data

The app loads sample data automatically:
- ✅ 5 match events (goals, cards, corners, substitution)
- ✅ 1 active prediction window (45s countdown)
- ✅ 5 players on leaderboard
- ✅ Current score: 1-1
- ✅ Your user: "Demo Fan" (Guest)

## 🎯 Next Steps

To connect to real backend:
1. Deploy AWS infrastructure (see `/infrastructure`)
2. Update WebSocket URL in store
3. Remove demo data loading
4. Connect to real match feed

## 📝 Notes

- This is a **frontend-only demo** - no backend connection
- All data is mocked for demonstration
- WebSocket features are simulated
- Perfect for testing UI/UX and translations!

## 🐛 Troubleshooting

If you see a blank screen:
1. Make sure you're in the `frontend` directory
2. Run `npm install` first
3. Check the browser console for errors
4. Try `npm run dev` again

If components don't show data:
- Check browser console - demo data should log "✅ Demo data loaded successfully!"
- Refresh the page
- Clear browser cache

## 🎉 Enjoy Testing!

Navigate between the tabs to see all the components in action. The app is fully responsive and works great on mobile too!
