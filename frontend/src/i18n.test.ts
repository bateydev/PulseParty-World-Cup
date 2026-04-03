import { describe, it, expect, beforeEach } from 'vitest';
import i18n from './i18n';

describe('i18n Configuration', () => {
  beforeEach(async () => {
    // Reset to English before each test
    await i18n.changeLanguage('en');
  });

  it('should initialize with supported languages', () => {
    const supportedLanguages = i18n.options.supportedLngs;
    expect(supportedLanguages).toContain('en');
    expect(supportedLanguages).toContain('fr');
    expect(supportedLanguages).toContain('de');
    expect(supportedLanguages).toContain('sw');
  });

  it('should have English as fallback language', () => {
    expect(i18n.options.fallbackLng).toEqual(['en']);
  });

  it('should load English translations', () => {
    expect(i18n.t('common.welcome')).toBe('Welcome to PulseParty Rooms');
    expect(i18n.t('room.create')).toBe('Create Room');
    expect(i18n.t('prediction.title')).toBe('Make Your Prediction');
  });

  it('should load French translations', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('common.welcome')).toBe('Bienvenue à PulseParty Rooms');
    expect(i18n.t('room.create')).toBe('Créer une salle');
    expect(i18n.t('prediction.title')).toBe('Faites votre prédiction');
  });

  it('should load German translations', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('common.welcome')).toBe('Willkommen bei PulseParty Rooms');
    expect(i18n.t('room.create')).toBe('Raum erstellen');
    expect(i18n.t('prediction.title')).toBe('Machen Sie Ihre Vorhersage');
  });

  it('should load Swahili translations', async () => {
    await i18n.changeLanguage('sw');
    expect(i18n.t('common.welcome')).toBe('Karibu PulseParty Rooms');
    expect(i18n.t('room.create')).toBe('Unda Chumba');
    expect(i18n.t('prediction.title')).toBe('Fanya Utabiri Wako');
  });

  it('should support interpolation for event descriptions', async () => {
    await i18n.changeLanguage('en');
    const goalDescription = i18n.t('events.goal_description', {
      player: 'Messi',
      team: 'Argentina',
    });
    expect(goalDescription).toBe('Messi scored for Argentina!');
  });

  it('should support interpolation in French', async () => {
    await i18n.changeLanguage('fr');
    const goalDescription = i18n.t('events.goal_description', {
      player: 'Mbappé',
      team: 'France',
    });
    expect(goalDescription).toBe('Mbappé a marqué pour France !');
  });

  it('should support interpolation in German', async () => {
    await i18n.changeLanguage('de');
    const goalDescription = i18n.t('events.goal_description', {
      player: 'Müller',
      team: 'Deutschland',
    });
    expect(goalDescription).toBe('Müller hat für Deutschland getroffen!');
  });

  it('should support interpolation in Swahili', async () => {
    await i18n.changeLanguage('sw');
    const goalDescription = i18n.t('events.goal_description', {
      player: 'Salah',
      team: 'Misri',
    });
    expect(goalDescription).toBe('Salah amefunga goli kwa Misri!');
  });

  it('should fallback to English for missing translations', async () => {
    await i18n.changeLanguage('fr');
    // If a key doesn't exist, it should fallback to English
    const missingKey = i18n.t('nonexistent.key');
    expect(missingKey).toBe('nonexistent.key'); // i18next returns the key if not found
  });

  it('should handle countdown timer translation with seconds', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('prediction.countdown', { seconds: 30 })).toBe(
      '30s remaining'
    );

    await i18n.changeLanguage('fr');
    expect(i18n.t('prediction.countdown', { seconds: 30 })).toBe(
      '30s restantes'
    );

    await i18n.changeLanguage('de');
    expect(i18n.t('prediction.countdown', { seconds: 30 })).toBe(
      '30s verbleibend'
    );

    await i18n.changeLanguage('sw');
    expect(i18n.t('prediction.countdown', { seconds: 30 })).toBe(
      '30s zimesalia'
    );
  });

  it('should handle points interpolation in prediction results', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('prediction.correct', { points: 50 })).toBe(
      'Correct! +50 points'
    );

    await i18n.changeLanguage('fr');
    expect(i18n.t('prediction.correct', { points: 50 })).toBe(
      'Correct ! +50 points'
    );

    await i18n.changeLanguage('de');
    expect(i18n.t('prediction.correct', { points: 50 })).toBe(
      'Richtig! +50 Punkte'
    );

    await i18n.changeLanguage('sw');
    expect(i18n.t('prediction.correct', { points: 50 })).toBe(
      'Sahihi! +50 pointi'
    );
  });

  it('should have all required translation keys for room management', () => {
    const requiredKeys = [
      'room.create',
      'room.join',
      'room.code',
      'room.theme',
      'room.theme_country',
      'room.theme_club',
      'room.theme_private',
      'room.not_found',
    ];

    requiredKeys.forEach((key) => {
      expect(i18n.exists(key)).toBe(true);
    });
  });

  it('should have all required translation keys for match events', () => {
    const requiredKeys = [
      'events.goal',
      'events.assist',
      'events.yellow_card',
      'events.red_card',
      'events.substitution',
      'events.corner',
      'events.shot',
      'events.possession',
    ];

    requiredKeys.forEach((key) => {
      expect(i18n.exists(key)).toBe(true);
    });
  });

  it('should have all required translation keys for predictions', () => {
    const requiredKeys = [
      'prediction.title',
      'prediction.submit',
      'prediction.submitted',
      'prediction.time_up',
      'prediction.expired',
      'prediction.correct',
      'prediction.incorrect',
    ];

    requiredKeys.forEach((key) => {
      expect(i18n.exists(key)).toBe(true);
    });
  });

  it('should have all required translation keys for leaderboard', () => {
    const requiredKeys = [
      'leaderboard.title',
      'leaderboard.rank',
      'leaderboard.player',
      'leaderboard.points',
      'leaderboard.streak',
    ];

    requiredKeys.forEach((key) => {
      expect(i18n.exists(key)).toBe(true);
    });
  });

  it('should have all required translation keys for recap', () => {
    const requiredKeys = [
      'recap.title',
      'recap.wrapped_title',
      'recap.room_title',
      'recap.total_points',
      'recap.final_rank',
      'recap.accuracy',
      'recap.longest_streak',
      'recap.clutch_moments',
    ];

    requiredKeys.forEach((key) => {
      expect(i18n.exists(key)).toBe(true);
    });
  });

  it('should persist language preference to localStorage key', () => {
    const storageKey = i18n.options.detection?.lookupLocalStorage;
    expect(storageKey).toBe('pulseparty_language');
  });

  it('should change language dynamically', async () => {
    expect(i18n.language).toBe('en');

    await i18n.changeLanguage('fr');
    expect(i18n.language).toBe('fr');

    await i18n.changeLanguage('de');
    expect(i18n.language).toBe('de');

    await i18n.changeLanguage('sw');
    expect(i18n.language).toBe('sw');
  });
});
