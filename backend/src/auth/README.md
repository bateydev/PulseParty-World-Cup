# Authentication Module

This module handles user authentication and management for the PulseParty system.

## Guest User Generation

The system supports guest users who can access all core features without authentication. Guest users are automatically created when a user connects without providing a userId.

### Features

- **Automatic ID Generation**: Unique guest user IDs using timestamp and random bytes
- **Friendly Display Names**: Auto-generated memorable names (e.g., "SwiftTiger123", "BraveLion456")
- **Session TTL**: Guest user sessions expire after 24 hours
- **Locale Support**: Guest users can be created with a specific locale (EN, FR, DE, SW)
- **DynamoDB Storage**: Guest users are stored with TTL for automatic cleanup

### Usage

```typescript
import { generateGuestUser } from './auth/guestUser';

// Generate guest user with default locale (en)
const guestUser = await generateGuestUser();

// Generate guest user with specific locale
const guestUserFr = await generateGuestUser('fr');

console.log(guestUser);
// {
//   userId: 'guest-1234567890-abcd1234',
//   displayName: 'SwiftTiger123',
//   isGuest: true,
//   locale: 'en',
//   createdAt: '2024-01-15T10:00:00.000Z',
//   ttl: 1234567890
// }
```

### Guest User Entity Structure

Guest users are stored in DynamoDB with the following structure:

```
PK: USER#{userId}
SK: METADATA
Attributes:
  - displayName: string (e.g., "SwiftTiger123")
  - isGuest: boolean (always true)
  - locale: string (e.g., "en", "fr", "de", "sw")
  - createdAt: string (ISO 8601 timestamp)
  - ttl: number (Unix timestamp for automatic deletion after 24 hours)
```

### Display Name Generation

Display names are generated using a combination of:
- **Adjectives**: Swift, Brave, Clever, Mighty, Quick, Bold, Fierce, Agile, Sharp, Bright, Cool, Epic, Wild, Keen, Wise
- **Nouns**: Tiger, Eagle, Lion, Falcon, Wolf, Hawk, Bear, Fox, Panther, Cheetah, Dragon, Phoenix, Shark, Viper, Raven
- **Numbers**: Random 1-3 digit number (0-999)

Format: `{Adjective}{Noun}{Number}` (e.g., "SwiftTiger123")

### Requirements Validation

This implementation validates the following requirements:

- **Requirement 7.1**: Guest users can access all core features without authentication
- **Requirement 7.2**: System generates temporary user identifier and display name for guest users

### Testing

The module includes comprehensive unit tests covering:
- Unique ID generation
- Display name format and uniqueness
- TTL calculation (24 hours)
- Locale support
- DynamoDB storage structure
- Error handling

Run tests:
```bash
npm test -- backend/src/auth/guestUser.test.ts
```

## Future Enhancements

- **User Migration**: Convert guest users to authenticated users
- **Social Sign-In**: Add support for Google, Facebook, Apple sign-in via Cognito
- **Multi-Factor Authentication**: Enable MFA for enhanced security
- **User Profile Management**: Extended user profiles with preferences and settings
- **Session Extension**: Extend guest user sessions on activity


## Authenticated Users with AWS Cognito

The system supports authenticated users via AWS Cognito for persistent accounts that survive session expiration.

### Features

- **JWT Token Verification**: Validates JWT tokens from Cognito using JWKS
- **Automatic User Creation**: Creates user entity on first sign-in
- **Cognito ID Linking**: Links Cognito user ID to DynamoDB user entity
- **Persistent Data**: User data persists across sessions
- **Custom Display Names**: Authenticated users can set custom display names
- **Locale Preferences**: User locale preferences are stored and retrieved

### Usage

```typescript
import {
  verifyJWT,
  createOrUpdateAuthenticatedUser,
  updateUserDisplayName,
  getUserById,
} from './auth/cognitoAuth';

// Verify JWT token from Cognito
const jwtPayload = await verifyJWT(accessToken);

// Create or update authenticated user
const authUser = await createOrUpdateAuthenticatedUser(
  jwtPayload,
  'Custom Display Name',
  'fr'
);

console.log(authUser);
// {
//   userId: 'auth-cognito-user-123',
//   cognitoId: 'cognito-user-123',
//   email: 'user@example.com',
//   displayName: 'Custom Display Name',
//   isGuest: false,
//   locale: 'fr',
//   createdAt: '2024-01-15T10:00:00Z'
// }

// Update display name
await updateUserDisplayName('auth-cognito-user-123', 'New Display Name');

// Get user by ID
const user = await getUserById('auth-cognito-user-123');
```

### Authenticated User Entity Structure

Authenticated users are stored in DynamoDB with the following structure:

```
PK: USER#{userId}
SK: METADATA
Attributes:
  - cognitoId: string (Cognito user ID from JWT sub claim)
  - email: string
  - displayName: string
  - isGuest: boolean (always false)
  - locale: string (e.g., "en", "fr", "de", "sw")
  - createdAt: string (ISO 8601 timestamp)
  - updatedAt: string (ISO 8601 timestamp)
```

### JWT Verification Process

1. Decode JWT token header to extract key ID (kid)
2. Fetch public key from Cognito JWKS endpoint
3. Verify token signature using RS256 algorithm
4. Validate token expiration
5. Return decoded payload with user information

The JWKS endpoint is cached for 10 minutes to reduce latency.

### AWS Cognito Configuration

The infrastructure includes:

**User Pool:**
- Email/username sign-in
- Email verification
- Password policy (min 8 chars, uppercase, lowercase, digits)
- Custom attributes: displayName, locale
- Account recovery via email

**User Pool Client:**
- User password and SRP authentication flows
- 1-hour access/ID token validity
- 30-day refresh token validity
- No client secret (public web client)
- Token revocation enabled

**Identity Pool:**
- Supports authenticated and unauthenticated identities
- IAM roles for both identity types
- Allows guest users (unauthenticated)

### Requirements Validation

This implementation validates the following requirements:

- **Requirement 7.3**: Integration with AWS Cognito for sign-in
- **Requirement 7.4**: Authenticated users persist match history and recaps across sessions
- **Requirement 7.5**: Authenticated users can set custom display names

### Error Handling

**JWT Verification Errors:**
- Invalid token format
- Missing key ID
- Token expired
- Signature verification failed

**User Management Errors:**
- DynamoDB write failures
- Missing required fields
- User not found

All errors are logged with context for debugging.

### Testing

The module includes comprehensive unit tests covering:
- JWT verification with valid/invalid/expired tokens
- User creation and updates
- Display name updates
- User retrieval by ID
- Guest vs authenticated user handling

Run tests:
```bash
npm test -- backend/src/auth/cognitoAuth.test.ts
```

### Environment Variables

Required environment variables:
- `TABLE_NAME`: DynamoDB table name
- `USER_POOL_ID`: Cognito User Pool ID
- `USER_POOL_CLIENT_ID`: Cognito User Pool Client ID
- `REGION`: AWS region (e.g., 'us-east-1')
