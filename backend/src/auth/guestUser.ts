import { putItem } from '../utils/dynamodb';
import { randomBytes } from 'crypto';

const getTableName = () => process.env.TABLE_NAME || '';

// Guest user session TTL: 24 hours
const GUEST_SESSION_TTL_HOURS = 24;

interface GuestUser {
  userId: string;
  displayName: string;
  isGuest: boolean;
  locale: string;
  createdAt: string;
  ttl: number;
}

interface UserEntity {
  PK: string; // USER#{userId}
  SK: string; // METADATA
  displayName: string;
  isGuest: boolean;
  locale: string;
  createdAt: string;
  ttl: number;
}

/**
 * Generate a guest user with temporary ID and display name
 * Requirements: 7.1, 7.2
 *
 * @param locale - Optional locale for the guest user (defaults to 'en')
 * @returns GuestUser object with userId, displayName, and metadata
 */
export async function generateGuestUser(
  locale: string = 'en'
): Promise<GuestUser> {
  // Generate unique guest user ID using timestamp and random bytes
  const timestamp = Date.now();
  const randomSuffix = randomBytes(4).toString('hex');
  const userId = `guest-${timestamp}-${randomSuffix}`;

  // Generate friendly display name
  const displayName = generateGuestDisplayName();

  // Calculate TTL: 24 hours from now (in Unix timestamp seconds)
  const ttlSeconds =
    Math.floor(Date.now() / 1000) + GUEST_SESSION_TTL_HOURS * 60 * 60;

  const guestUser: GuestUser = {
    userId,
    displayName,
    isGuest: true,
    locale,
    createdAt: new Date().toISOString(),
    ttl: ttlSeconds,
  };

  // Store guest user in DynamoDB with session TTL
  const userEntity: UserEntity = {
    PK: `USER#${userId}`,
    SK: 'METADATA',
    displayName: guestUser.displayName,
    isGuest: true,
    locale: guestUser.locale,
    createdAt: guestUser.createdAt,
    ttl: guestUser.ttl,
  };

  await putItem({
    TableName: getTableName(),
    Item: userEntity,
  });

  console.log('Guest user created:', {
    userId: guestUser.userId,
    displayName: guestUser.displayName,
    ttl: guestUser.ttl,
  });

  return guestUser;
}

/**
 * Generate a friendly display name for guest users
 * Uses a combination of adjectives and nouns to create memorable names
 */
function generateGuestDisplayName(): string {
  const adjectives = [
    'Swift',
    'Brave',
    'Clever',
    'Mighty',
    'Quick',
    'Bold',
    'Fierce',
    'Agile',
    'Sharp',
    'Bright',
    'Cool',
    'Epic',
    'Wild',
    'Keen',
    'Wise',
  ];

  const nouns = [
    'Tiger',
    'Eagle',
    'Lion',
    'Falcon',
    'Wolf',
    'Hawk',
    'Bear',
    'Fox',
    'Panther',
    'Cheetah',
    'Dragon',
    'Phoenix',
    'Shark',
    'Viper',
    'Raven',
  ];

  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);

  return `${randomAdjective}${randomNoun}${randomNumber}`;
}
