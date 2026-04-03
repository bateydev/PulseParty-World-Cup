# Internationalization (i18n) Configuration

This directory contains translation files for PulseParty Rooms, supporting multiple languages for a global audience.

## Supported Languages

- **English (EN)** - Default language
- **French (FR)** - Français
- **German (DE)** - Deutsch
- **Swahili (SW)** - Kiswahili

## Structure

```
locales/
├── en/
│   └── translation.json
├── fr/
│   └── translation.json
├── de/
│   └── translation.json
└── sw/
    └── translation.json
```

Each language has its own directory containing a `translation.json` file with all translated strings.

## Translation Keys

Translation keys are organized by feature area:

### App
- `app.name` - Application name
- `app.tagline` - Application tagline

### Common
- `common.welcome` - Welcome message
- `common.loading` - Loading indicator
- `common.error` - Generic error message
- `common.offline` - Offline status message
- `common.demo_mode` - Demo mode indicator

### Room Management
- `room.create` - Create room button
- `room.join` - Join room button
- `room.code` - Room code label
- `room.theme` - Room theme label
- `room.theme_country` - Country theme option
- `room.theme_club` - Club theme option
- `room.theme_private` - Private theme option
- `room.not_found` - Room not found error

### Match Events
- `events.goal` - Goal event
- `events.assist` - Assist event
- `events.yellow_card` - Yellow card event
- `events.red_card` - Red card event
- `events.substitution` - Substitution event
- `events.corner` - Corner event
- `events.shot` - Shot event
- `events.possession` - Possession update
- `events.*_description` - Event descriptions with interpolation

### Predictions
- `prediction.title` - Prediction widget title
- `prediction.submit` - Submit button
- `prediction.submitted` - Submission confirmation
- `prediction.time_up` - Time expired message
- `prediction.correct` - Correct prediction feedback
- `prediction.incorrect` - Incorrect prediction feedback
- `prediction.countdown` - Countdown timer

### Leaderboard
- `leaderboard.title` - Leaderboard title
- `leaderboard.rank` - Rank column
- `leaderboard.player` - Player column
- `leaderboard.points` - Points column
- `leaderboard.streak` - Streak column

### Recap
- `recap.title` - Recap title
- `recap.wrapped_title` - Personal recap title
- `recap.room_title` - Room recap title
- `recap.total_points` - Total points label
- `recap.final_rank` - Final rank label
- `recap.accuracy` - Accuracy label
- `recap.longest_streak` - Longest streak label
- `recap.clutch_moments` - Clutch moments label

### Authentication
- `auth.guest` - Guest mode button
- `auth.sign_in` - Sign in button
- `auth.sign_out` - Sign out button
- `auth.display_name` - Display name label

### Settings
- `settings.title` - Settings title
- `settings.language` - Language selector
- `settings.low_bandwidth` - Low bandwidth mode toggle

## Usage in Components

### Basic Translation

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <h1>{t('common.welcome')}</h1>;
}
```

### Translation with Interpolation

```tsx
import { useTranslation } from 'react-i18next';

function EventCard({ player, team }) {
  const { t } = useTranslation();
  
  return (
    <p>{t('events.goal_description', { player, team })}</p>
  );
}
```

### Changing Language

```tsx
import { useTranslation } from 'react-i18next';

function LanguageSelector() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <select onChange={(e) => changeLanguage(e.target.value)}>
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="de">Deutsch</option>
      <option value="sw">Kiswahili</option>
    </select>
  );
}
```

## Language Detection

The i18n configuration automatically detects the user's preferred language using:

1. **localStorage** - Previously selected language (key: `pulseparty_language`)
2. **Browser navigator** - Browser language preference
3. **HTML tag** - HTML lang attribute

The detected language is automatically cached in localStorage for persistence across sessions.

## Fallback Behavior

If a translation key is missing in the selected language, the system falls back to English (EN).

## Adding New Translations

To add a new translation key:

1. Add the key to `en/translation.json` first (source of truth)
2. Add the same key to all other language files (`fr`, `de`, `sw`)
3. Use descriptive key names following the existing structure
4. For interpolated strings, use `{{variableName}}` syntax

Example:
```json
{
  "events": {
    "new_event": "New event occurred",
    "new_event_description": "{{player}} did something for {{team}}"
  }
}
```

## Testing

Run i18n tests to verify all translations:

```bash
npm test -- i18n.test.ts
```

The test suite verifies:
- All supported languages are loaded
- Translation keys exist in all languages
- Interpolation works correctly
- Language switching functions properly
- Fallback behavior works as expected

## Requirements

This i18n configuration satisfies:
- **Requirement 8.1**: Support for EN, FR, DE, SW languages
- **Requirement 8.2**: Browser language preference detection
- **Requirement 8.3**: Dynamic language switching
- **Requirement 8.4**: Language preference persistence
- **Requirement 8.5**: Match event and prediction translations
- **Requirement 8.7**: Recap localization

## Locale-Specific Formatting

For locale-specific number and date formatting, use the browser's built-in `Intl` API:

```tsx
// Format numbers
const formatter = new Intl.NumberFormat(i18n.language);
formatter.format(1234.56); // "1,234.56" (en), "1 234,56" (fr)

// Format dates
const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
dateFormatter.format(new Date()); // "January 15, 2024" (en), "15 janvier 2024" (fr)
```

This satisfies **Requirement 8.6** for locale-specific formatting.
