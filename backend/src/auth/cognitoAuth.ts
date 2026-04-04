import { putItem, getItem, updateItem } from '../utils/dynamodb';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const getTableName = () => process.env.TABLE_NAME || '';
const getUserPoolId = () => process.env.USER_POOL_ID || '';
const getRegion = () =>
  process.env.REGION || process.env.AWS_REGION || 'us-east-1';

// JWKS client for JWT verification
const jwksClientInstance = jwksClient({
  jwksUri: `https://cognito-idp.${getRegion()}.amazonaws.com/${getUserPoolId()}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
});

interface AuthenticatedUser {
  userId: string;
  cognitoId: string;
  email: string;
  displayName: string;
  locale: string;
  isGuest: false;
  createdAt: string;
}

interface UserEntity {
  PK: string; // USER#{userId}
  SK: string; // METADATA
  cognitoId: string;
  email: string;
  displayName: string;
  isGuest: boolean;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

interface JWTPayload {
  sub: string; // Cognito user ID
  email?: string;
  'cognito:username'?: string;
  'custom:displayName'?: string;
  'custom:locale'?: string;
  exp: number;
  iat: number;
}

/**
 * Get signing key for JWT verification
 * Requirements: 7.3
 */
function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    jwksClientInstance.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
      } else {
        const signingKey = key?.getPublicKey();
        if (signingKey) {
          resolve(signingKey);
        } else {
          reject(new Error('Unable to get signing key'));
        }
      }
    });
  });
}

/**
 * Verify and decode JWT token from Cognito
 * Requirements: 7.3
 *
 * @param token - JWT access token or ID token from Cognito
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    // Decode token header to get key ID
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || typeof decodedHeader === 'string') {
      throw new Error('Invalid token format');
    }

    const kid = decodedHeader.header.kid;
    if (!kid) {
      throw new Error('Token missing key ID');
    }

    // Get signing key from JWKS
    const signingKey = await getSigningKey(kid);

    // Verify and decode token
    const payload = jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
    }) as JWTPayload;

    // Validate token hasn't expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error('Token has expired');
    }

    console.log('JWT verified successfully:', {
      sub: payload.sub,
      email: payload.email,
    });

    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    throw new Error(
      `JWT verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create or update authenticated user in DynamoDB
 * Links Cognito ID to user entity
 * Requirements: 7.3, 7.4
 *
 * @param jwtPayload - Decoded JWT payload from Cognito
 * @param displayName - Optional custom display name
 * @param locale - Optional locale preference
 * @returns AuthenticatedUser object
 */
export async function createOrUpdateAuthenticatedUser(
  jwtPayload: JWTPayload,
  displayName?: string,
  locale: string = 'en'
): Promise<AuthenticatedUser> {
  const cognitoId = jwtPayload.sub;
  const email = jwtPayload.email || '';

  // Check if user already exists by Cognito ID
  const existingUser = await getUserByCognitoId(cognitoId);

  if (existingUser) {
    // Update existing user
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (displayName) {
      updates.displayName = displayName;
    }
    if (locale) {
      updates.locale = locale;
    }

    await updateItem({
      TableName: getTableName(),
      Key: {
        PK: existingUser.PK,
        SK: existingUser.SK,
      },
      UpdateExpression:
        'SET ' +
        Object.keys(updates)
          .map((key, i) => `#${key} = :val${i}`)
          .join(', '),
      ExpressionAttributeNames: Object.keys(updates).reduce(
        (acc, key) => {
          acc[`#${key}`] = key;
          return acc;
        },
        {} as Record<string, string>
      ),
      ExpressionAttributeValues: Object.keys(updates).reduce(
        (acc, key, i) => {
          acc[`:val${i}`] = updates[key];
          return acc;
        },
        {} as Record<string, any>
      ),
    });

    console.log('Updated authenticated user:', {
      userId: existingUser.PK.replace('USER#', ''),
      cognitoId,
    });

    return {
      userId: existingUser.PK.replace('USER#', ''),
      cognitoId,
      email: existingUser.email,
      displayName: displayName || existingUser.displayName,
      locale: locale || existingUser.locale,
      isGuest: false,
      createdAt: existingUser.createdAt,
    };
  }

  // Create new authenticated user
  const userId = `auth-${cognitoId}`;
  const defaultDisplayName =
    displayName ||
    jwtPayload['custom:displayName'] ||
    email.split('@')[0] ||
    'User';

  const userEntity: UserEntity = {
    PK: `USER#${userId}`,
    SK: 'METADATA',
    cognitoId,
    email,
    displayName: defaultDisplayName,
    isGuest: false,
    locale: locale || jwtPayload['custom:locale'] || 'en',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await putItem({
    TableName: getTableName(),
    Item: userEntity,
  });

  console.log('Created authenticated user:', {
    userId,
    cognitoId,
    email,
  });

  return {
    userId,
    cognitoId,
    email,
    displayName: defaultDisplayName,
    locale: userEntity.locale,
    isGuest: false,
    createdAt: userEntity.createdAt,
  };
}

/**
 * Get user by Cognito ID
 * Requirements: 7.4
 *
 * @param cognitoId - Cognito user ID (sub claim from JWT)
 * @returns User entity or null if not found
 */
async function getUserByCognitoId(
  cognitoId: string
): Promise<UserEntity | null> {
  // Note: This requires a GSI on cognitoId for efficient lookup
  // For now, we'll use a simple approach with the userId pattern
  const userId = `auth-${cognitoId}`;

  try {
    const result = await getItem({
      TableName: getTableName(),
      Key: {
        PK: `USER#${userId}`,
        SK: 'METADATA',
      },
    });

    if (result && result.Item) {
      return result.Item as UserEntity;
    }

    return null;
  } catch (error) {
    console.error('Error getting user by Cognito ID:', error);
    return null;
  }
}

/**
 * Update user display name
 * Requirements: 7.5
 *
 * @param userId - User ID
 * @param displayName - New display name
 */
export async function updateUserDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  await updateItem({
    TableName: getTableName(),
    Key: {
      PK: `USER#${userId}`,
      SK: 'METADATA',
    },
    UpdateExpression: 'SET displayName = :displayName, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':displayName': displayName,
      ':updatedAt': new Date().toISOString(),
    },
  });

  console.log('Updated user display name:', { userId, displayName });
}

/**
 * Get user by user ID
 * Requirements: 7.4
 *
 * @param userId - User ID
 * @returns User entity or null if not found
 */
export async function getUserById(
  userId: string
): Promise<AuthenticatedUser | null> {
  try {
    const result = await getItem({
      TableName: getTableName(),
      Key: {
        PK: `USER#${userId}`,
        SK: 'METADATA',
      },
    });

    if (result && result.Item) {
      const item = result.Item as UserEntity;
      if (!item.isGuest) {
        return {
          userId: userId,
          cognitoId: item.cognitoId,
          email: item.email,
          displayName: item.displayName,
          locale: item.locale,
          isGuest: false,
          createdAt: item.createdAt,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}
