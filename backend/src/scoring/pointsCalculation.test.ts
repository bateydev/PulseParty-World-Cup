import {
  calculatePoints,
  applyStreakMultiplier,
  applyClutchBonus,
  Difficulty,
} from './pointsCalculation';

describe('Points Calculation', () => {
  describe('calculatePoints', () => {
    it('should return 10 points for easy difficulty', () => {
      expect(calculatePoints('easy')).toBe(10);
    });

    it('should return 25 points for medium difficulty', () => {
      expect(calculatePoints('medium')).toBe(25);
    });

    it('should return 50 points for hard difficulty', () => {
      expect(calculatePoints('hard')).toBe(50);
    });

    it('should throw error for invalid difficulty', () => {
      expect(() => calculatePoints('invalid' as Difficulty)).toThrow(
        'Invalid difficulty: invalid'
      );
    });
  });

  describe('applyStreakMultiplier', () => {
    it('should return base points with no streak (multiplier 1.0)', () => {
      expect(applyStreakMultiplier(10, 0)).toBe(10);
    });

    it('should apply 1.1× multiplier for streak of 1', () => {
      expect(applyStreakMultiplier(10, 1)).toBe(11);
    });

    it('should apply 1.3× multiplier for streak of 3', () => {
      expect(applyStreakMultiplier(10, 3)).toBe(13);
    });

    it('should apply 1.5× multiplier for streak of 5', () => {
      expect(applyStreakMultiplier(10, 5)).toBe(15);
    });

    it('should cap multiplier at 2.0× for streak of 10', () => {
      expect(applyStreakMultiplier(10, 10)).toBe(20);
    });

    it('should cap multiplier at 2.0× for streak of 15', () => {
      expect(applyStreakMultiplier(10, 15)).toBe(20);
    });

    it('should round result to nearest integer', () => {
      // 25 * 1.1 = 27.5, should round to 28
      expect(applyStreakMultiplier(25, 1)).toBe(28);
    });

    it('should work with larger base points', () => {
      // 50 * 1.5 = 75
      expect(applyStreakMultiplier(50, 5)).toBe(75);
    });
  });

  describe('applyClutchBonus', () => {
    it('should apply 1.5× bonus when submitted in final 10 seconds', () => {
      const expiresAt = '2024-01-15T10:30:00.000Z';
      const submittedAt = '2024-01-15T10:29:55.000Z'; // 5 seconds before expiry
      expect(applyClutchBonus(10, submittedAt, expiresAt)).toBe(15);
    });

    it('should apply 1.5× bonus when submitted exactly 10 seconds before expiry', () => {
      const expiresAt = '2024-01-15T10:30:00.000Z';
      const submittedAt = '2024-01-15T10:29:50.000Z'; // exactly 10 seconds before
      expect(applyClutchBonus(10, submittedAt, expiresAt)).toBe(15);
    });

    it('should not apply bonus when submitted 11 seconds before expiry', () => {
      const expiresAt = '2024-01-15T10:30:00.000Z';
      const submittedAt = '2024-01-15T10:29:49.000Z'; // 11 seconds before
      expect(applyClutchBonus(10, submittedAt, expiresAt)).toBe(10);
    });

    it('should not apply bonus when submitted 30 seconds before expiry', () => {
      const expiresAt = '2024-01-15T10:30:00.000Z';
      const submittedAt = '2024-01-15T10:29:30.000Z'; // 30 seconds before
      expect(applyClutchBonus(10, submittedAt, expiresAt)).toBe(10);
    });

    it('should not apply bonus when submitted after expiry', () => {
      const expiresAt = '2024-01-15T10:30:00.000Z';
      const submittedAt = '2024-01-15T10:30:05.000Z'; // 5 seconds after expiry
      expect(applyClutchBonus(10, submittedAt, expiresAt)).toBe(10);
    });

    it('should round result to nearest integer', () => {
      const expiresAt = '2024-01-15T10:30:00.000Z';
      const submittedAt = '2024-01-15T10:29:55.000Z';
      // 25 * 1.5 = 37.5, should round to 38
      expect(applyClutchBonus(25, submittedAt, expiresAt)).toBe(38);
    });

    it('should work with larger base points', () => {
      const expiresAt = '2024-01-15T10:30:00.000Z';
      const submittedAt = '2024-01-15T10:29:58.000Z'; // 2 seconds before
      // 50 * 1.5 = 75
      expect(applyClutchBonus(50, submittedAt, expiresAt)).toBe(75);
    });

    it('should handle millisecond precision', () => {
      const expiresAt = '2024-01-15T10:30:00.000Z';
      const submittedAt = '2024-01-15T10:29:50.500Z'; // 9.5 seconds before
      expect(applyClutchBonus(10, submittedAt, expiresAt)).toBe(15);
    });
  });

  describe('Combined scoring scenarios', () => {
    it('should calculate correct total with difficulty, streak, and clutch bonus', () => {
      // Hard difficulty: 50 points
      const basePoints = calculatePoints('hard');
      expect(basePoints).toBe(50);

      // Streak of 3: 1.3× multiplier -> 50 * 1.3 = 65
      const withStreak = applyStreakMultiplier(basePoints, 3);
      expect(withStreak).toBe(65);

      // Clutch bonus: 1.5× -> 65 * 1.5 = 97.5 -> 98
      const expiresAt = '2024-01-15T10:30:00.000Z';
      const submittedAt = '2024-01-15T10:29:55.000Z';
      const finalPoints = applyClutchBonus(withStreak, submittedAt, expiresAt);
      expect(finalPoints).toBe(98);
    });

    it('should calculate correct total without clutch bonus', () => {
      // Medium difficulty: 25 points
      const basePoints = calculatePoints('medium');
      expect(basePoints).toBe(25);

      // Streak of 5: 1.5× multiplier -> 25 * 1.5 = 37.5 -> 38
      const withStreak = applyStreakMultiplier(basePoints, 5);
      expect(withStreak).toBe(38);

      // No clutch bonus (submitted early)
      const expiresAt = '2024-01-15T10:30:00.000Z';
      const submittedAt = '2024-01-15T10:29:00.000Z';
      const finalPoints = applyClutchBonus(withStreak, submittedAt, expiresAt);
      expect(finalPoints).toBe(38);
    });

    it('should calculate correct total with max streak multiplier', () => {
      // Easy difficulty: 10 points
      const basePoints = calculatePoints('easy');
      expect(basePoints).toBe(10);

      // Streak of 20 (capped at 2.0×): 10 * 2.0 = 20
      const withStreak = applyStreakMultiplier(basePoints, 20);
      expect(withStreak).toBe(20);

      // Clutch bonus: 20 * 1.5 = 30
      const expiresAt = '2024-01-15T10:30:00.000Z';
      const submittedAt = '2024-01-15T10:29:52.000Z';
      const finalPoints = applyClutchBonus(withStreak, submittedAt, expiresAt);
      expect(finalPoints).toBe(30);
    });
  });
});
