/**
 * Cognito Authentication Service
 * Handles user signup, login, and session management
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  ISignUpResult,
} from 'amazon-cognito-identity-js';

const userPoolId = import.meta.env.VITE_USER_POOL_ID;
const clientId = import.meta.env.VITE_USER_POOL_CLIENT_ID;

if (!userPoolId || !clientId) {
  console.warn(
    'Cognito credentials not configured. Authentication will not work.'
  );
}

const userPool = new CognitoUserPool({
  UserPoolId: userPoolId || '',
  ClientId: clientId || '',
});

export interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
  isGuest: false;
  tokens: {
    idToken: string;
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Sign up a new user
 */
export function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<ISignUpResult> {
  return new Promise((resolve, reject) => {
    const attributeList = [
      new CognitoUserAttribute({
        Name: 'email',
        Value: email,
      }),
      new CognitoUserAttribute({
        Name: 'custom:displayName',
        Value: displayName,
      }),
    ];

    // Use displayName as username since Cognito is configured for email alias
    const username = displayName.replace(/\s+/g, '_').toLowerCase();

    userPool.signUp(username, password, attributeList, [], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      if (!result) {
        reject(new Error('Signup failed: No result'));
        return;
      }
      resolve(result);
    });
  });
}

/**
 * Confirm email with verification code
 */
export function confirmSignUp(
  email: string,
  code: string,
  username: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: username, // Use the username that was used during signup
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/**
 * Sign in with email and password
 */
export function signIn(email: string, password: string): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({
      Username: email, // Use email for login since it's an alias
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email, // Use email for login since it's an alias
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        const accessToken = result.getAccessToken().getJwtToken();
        const refreshToken = result.getRefreshToken().getToken();

        // Get user attributes
        cognitoUser.getUserAttributes((err, attributes) => {
          if (err) {
            reject(err);
            return;
          }

          const emailAttr = attributes?.find((attr) => attr.Name === 'email');
          const displayNameAttr = attributes?.find(
            (attr) => attr.Name === 'custom:displayName'
          );

          resolve({
            userId: result.getIdToken().payload.sub,
            email: emailAttr?.Value || email,
            displayName: displayNameAttr?.Value || email.split('@')[0],
            isGuest: false,
            tokens: {
              idToken,
              accessToken,
              refreshToken,
            },
          });
        });
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

/**
 * Sign out current user
 */
export function signOut(): Promise<void> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    resolve();
  });
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): Promise<AuthUser | null> {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: any) => {
      if (err) {
        reject(err);
        return;
      }

      if (!session.isValid()) {
        resolve(null);
        return;
      }

      cognitoUser.getUserAttributes((err, attributes) => {
        if (err) {
          reject(err);
          return;
        }

        const emailAttr = attributes?.find((attr) => attr.Name === 'email');
        const displayNameAttr = attributes?.find(
          (attr) => attr.Name === 'custom:displayName'
        );

        resolve({
          userId: session.getIdToken().payload.sub,
          email: emailAttr?.Value || '',
          displayName: displayNameAttr?.Value || '',
          isGuest: false,
          tokens: {
            idToken: session.getIdToken().getJwtToken(),
            accessToken: session.getAccessToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
          },
        });
      });
    });
  });
}

/**
 * Resend verification code
 */
export function resendConfirmationCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
