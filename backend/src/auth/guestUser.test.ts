import { generateGuestUser } from './guestUser';
import * as dynamodb from '../utils/dynamodb';

// Mock the dynamodb module
jest.mock('../utils/dynamodb');
const mockPutItem = dynamodb.putItem as jest.MockedFunction<typeof dynamodb.putItem>;

describe('Guest User Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('generateGuestUser', () => {
    it('should generate a guest user with unique ID and display name', async () => {
      mockPutItem.mockResolvedValue();

      const guestUser = await generateGuestUser();

      expect(guestUser.userId).toMatch(/^guest-\d+-[a-f0-9]{8}$/);
      expect(guestUser.displayName).toBeTruthy();
      expect(guestUser.isGuest).toBe(true);
      expect(guestUser.locale).toBe('en');
      expect(guestUser.createdAt).toBeTruthy();
      expect(guestUser.ttl).toBeGreaterThan(Date.now() / 1000);
    });

    it('should generate unique user IDs for multiple calls', async () => {
      mockPutItem.mockResolvedValue();

      const user1 = await generateGuestUser();
      const user2 = await generateGuestUser();
      const user3 = await generateGuestUser();

      expect(user1.userId).not.toBe(user2.userId);
      expect(user2.userId).not.toBe(user3.userId);
      expect(user1.userId).not.toBe(user3.userId);
    });

    it('should set TTL to 24 hours from creation', async () => {
      mockPutItem.mockResolvedValue();

      const beforeTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
      const guestUser = await generateGuestUser();
      const afterTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

      // TTL should be approximately 24 hours from now (within 1 second tolerance)
      expect(guestUser.ttl).toBeGreaterThanOrEqual(beforeTime - 1);
      expect(guestUser.ttl).toBeLessThanOrEqual(afterTime + 1);
    });

    it('should use provided locale', async () => {
      mockPutItem.mockResolvedValue();

      const guestUserFr = await generateGuestUser('fr');
      const guestUserDe = await generateGuestUser('de');
      const guestUserSw = await generateGuestUser('sw');

      expect(guestUserFr.locale).toBe('fr');
      expect(guestUserDe.locale).toBe('de');
      expect(guestUserSw.locale).toBe('sw');
    });

    it('should default to "en" locale when not provided', async () => {
      mockPutItem.mockResolvedValue();

      const guestUser = await generateGuestUser();

      expect(guestUser.locale).toBe('en');
    });

    it('should store guest user in DynamoDB with correct structure', async () => {
      mockPutItem.mockResolvedValue();

      const guestUser = await generateGuestUser('fr');

      expect(mockPutItem).toHaveBeenCalledTimes(1);
      expect(mockPutItem).toHaveBeenCalledWith({
        TableName: 'test-table',
        Item: {
          PK: `USER#${guestUser.userId}`,
          SK: 'METADATA',
          displayName: guestUser.displayName,
          isGuest: true,
          locale: 'fr',
          createdAt: guestUser.createdAt,
          ttl: guestUser.ttl,
        },
      });
    });

    it('should generate display names in expected format', async () => {
      mockPutItem.mockResolvedValue();

      const guestUser = await generateGuestUser();

      // Display name should match pattern: AdjectiveNounNumber
      // e.g., "SwiftTiger123", "BraveEagle456"
      expect(guestUser.displayName).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{1,3}$/);
    });

    it('should generate different display names for multiple users', async () => {
      mockPutItem.mockResolvedValue();

      const displayNames = new Set<string>();
      
      // Generate 20 guest users and collect display names
      for (let i = 0; i < 20; i++) {
        const user = await generateGuestUser();
        displayNames.add(user.displayName);
      }

      // With random generation, we should have high uniqueness
      // (not guaranteed 100% unique due to randomness, but should be high)
      expect(displayNames.size).toBeGreaterThan(15);
    });

    it('should handle DynamoDB errors gracefully', async () => {
      mockPutItem.mockRejectedValue(new Error('DynamoDB error'));

      await expect(generateGuestUser()).rejects.toThrow('DynamoDB error');
    });

    it('should create ISO 8601 timestamp for createdAt', async () => {
      mockPutItem.mockResolvedValue();

      const guestUser = await generateGuestUser();

      // Verify ISO 8601 format
      expect(guestUser.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify it's a valid date
      const date = new Date(guestUser.createdAt);
      expect(date.getTime()).not.toBeNaN();
    });

    it('should set isGuest flag to true', async () => {
      mockPutItem.mockResolvedValue();

      const guestUser = await generateGuestUser();

      expect(guestUser.isGuest).toBe(true);
    });
  });
});
