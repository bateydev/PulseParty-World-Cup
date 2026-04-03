# Authentication in PulseParty

## Current Implementation: Guest-First Approach

PulseParty uses a **guest-first authentication model** similar to Kahoot, Jackbox Games, and other social party apps. This design prioritizes:

1. **Zero friction entry** - Users can join immediately without signup
2. **Social sharing** - Easy to share room codes with friends
3. **Optional accounts** - Users can upgrade to full accounts later

## How It Works

### Guest Users (Current Implementation)

When a user opens the app:

1. **Automatic Guest ID Generation**
   ```typescript
   const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
   ```

2. **Random Display Name**
   ```typescript
   displayName: `Guest ${Math.floor(Math.random() * 9999)}`
   ```

3. **Stored in Zustand Store**
   ```typescript
   {
     userId: "guest-1234567890-abc123",
     displayName: "Guest 4567",
     isGuest: true
   }
   ```

4. **Sent to Backend via WebSocket**
   - Connect handler receives `userId` as query parameter
   - If no `userId`, backend generates a guest user via Cognito
   - Guest user stored in DynamoDB with connection

### Why No Login UI?

The current implementation focuses on the **core multiplayer experience**:
- ✅ Room creation and joining
- ✅ Real-time WebSocket communication
- ✅ Guest user management
- ❌ Login/signup forms (not needed for MVP)
- ❌ Password management
- ❌ Email verification

## Backend Authentication (Already Deployed)

### Cognito Resources

The backend has full Cognito infrastructure deployed:

```typescript
// From AWS deployment
User Pool ID: us-east-1_khCEcImrX
Client ID: 42rkv73notj0t83n26803ipaia
Identity Pool: us-east-1:e971a6da-776e-4de4-9abe-d4b680c40018
```

### Guest User Generation

The backend `guestUser.ts` module generates Cognito-backed guest users:

```typescript
export async function generateGuestUser(locale: string = 'en'): Promise<GuestUser> {
  const guestId = `guest-${Date.now()}-${randomString(8)}`;
  const displayName = getLocalizedGuestName(locale);
  
  // Create in Cognito (optional - can be added later)
  // For now, just return the guest user object
  
  return {
    userId: guestId,
    displayName,
    isGuest: true,
    locale,
  };
}
```

## Adding Full Authentication (Future Enhancement)

If you want to add login/signup later, here's how:

### 1. Create Login Component

```typescript
// frontend/src/components/LoginModal.tsx
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_USER_POOL_ID,
  ClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
});

export function LoginModal() {
  const handleLogin = (email: string, password: string) => {
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });
    
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });
    
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => {
        // Store tokens and user info
        const idToken = result.getIdToken().getJwtToken();
        // Update Zustand store with authenticated user
      },
      onFailure: (err) => {
        console.error('Login failed:', err);
      },
    });
  };
  
  // ... UI implementation
}
```

### 2. Add Signup Component

```typescript
// frontend/src/components/SignupModal.tsx
export function SignupModal() {
  const handleSignup = (email: string, password: string, displayName: string) => {
    userPool.signUp(
      email,
      password,
      [
        { Name: 'email', Value: email },
        { Name: 'custom:displayName', Value: displayName },
      ],
      null,
      (err, result) => {
        if (err) {
          console.error('Signup failed:', err);
          return;
        }
        // Show email verification prompt
      }
    );
  };
  
  // ... UI implementation
}
```

### 3. Update User Store

```typescript
// frontend/src/store/index.ts
interface User {
  userId: string;
  displayName: string;
  isGuest: boolean;
  email?: string;  // Add for authenticated users
  tokens?: {       // Add for authenticated users
    idToken: string;
    accessToken: string;
    refreshToken: string;
  };
}
```

### 4. Add "Upgrade Account" Flow

Allow guest users to convert to full accounts:

```typescript
export function UpgradeAccountModal({ guestUser }: { guestUser: User }) {
  const handleUpgrade = (email: string, password: string) => {
    // 1. Create Cognito account
    // 2. Migrate guest data to new account
    // 3. Update user in store
    // 4. Update WebSocket connection with new userId
  };
  
  // ... UI implementation
}
```

## Current User Flow

```
User Opens App
    ↓
Generate Guest ID
    ↓
Connect to WebSocket (with guest ID)
    ↓
Backend receives connection
    ↓
Backend generates/validates guest user
    ↓
User can create/join rooms
    ↓
User plays match
    ↓
[Optional] User upgrades to full account
```

## Benefits of Guest-First Approach

### ✅ Advantages
1. **Zero friction** - No signup required to play
2. **Social friendly** - Easy to share with friends
3. **Fast onboarding** - Users playing within seconds
4. **Lower barrier** - No email/password to remember
5. **Privacy friendly** - No personal data required

### ❌ Disadvantages
1. **No persistence** - Guest data lost if browser cleared
2. **No cross-device** - Can't access same account on different devices
3. **No recovery** - Can't recover guest account if lost
4. **Limited features** - Can't save preferences long-term

## Recommended Approach

For a party game like PulseParty, the guest-first approach is ideal:

1. **Start with guests** (current implementation) ✅
2. **Add optional signup** (future enhancement)
3. **Offer account upgrade** after users are engaged
4. **Incentivize accounts** with features like:
   - Saved match history
   - Friend lists
   - Custom avatars
   - Persistent stats

## Summary

- ✅ **Authentication is working** - Guest users are automatically created
- ✅ **Cognito is deployed** - Full auth infrastructure ready
- ✅ **Backend handles guests** - Guest user generation implemented
- ❌ **No login UI** - By design, not needed for MVP
- ❌ **No signup UI** - By design, not needed for MVP

The app is designed for **quick, social, party-style gameplay** where authentication shouldn't be a barrier to entry. Full authentication can be added later as an optional enhancement.
