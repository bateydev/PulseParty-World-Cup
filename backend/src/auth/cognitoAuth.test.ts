import {
  verifyJWT,
  createOrUpdateAuthenticatedUser,
  updateUserDisplayName,
  getUserById,
} from './cognitoAuth';
import { putItem, getItem, updateItem } from '../utils/dynamodb';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../utils/dynamodb');
jest.mock('jsonwebtoken');
jest.mock('jwks-rsa', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getSigningKey: jest.fn((_kid, callback) => {
      callback(null, {
        getPublicKey: () => 'mock-public-key',
      });
    }),
  })),
}));

const mockPutItem = putItem as jest.MockedFunction<typeof putItem>;
const mockGetItem = getItem as jest.MockedFunction<typeof getItem>;
const mockUpdateItem = updateItem as jest.MockedFunction<typeof updateItem>;
const mockJwtVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>;
const mockJwtDecode = jwt.decode as jest.MockedFunction<typeof jwt.decode>;

describe('Cognito Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = 'TestTable';
    process.env.USER_POOL_ID = 'us-east-1_TEST123';
    process.env.REGION = 'us-east-1';
  });

  describe('verifyJWT', () => {
    it('should verify valid JWT token', async () => {
      const mockPayload = {
        sub: 'cognito-user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };

      mockJwtDecode.mockReturnValue({
        header: { kid: 'test-key-id', alg: 'RS256' },
        payload: mockPayload,
        signature: 'test-signature',
      });

      mockJwtVerify.mockReturnValue(mockPayload as any);

      const result = await verifyJWT('valid-token');

      expect(result).toEqual(mockPayload);
      expect(mockJwtDecode).toHaveBeenCalledWith('valid-token', { complete: true });
      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', 'mock-public-key', {
        algorithms: ['RS256'],
      });
    });

    it('should reject expired JWT token', async () => {
      const mockPayload = {
        sub: 'cognito-user-123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
      };

      mockJwtDecode.mockReturnValue({
        header: { kid: 'test-key-id', alg: 'RS256' },
        payload: mockPayload,
        signature: 'test-signature',
      });

      mockJwtVerify.mockReturnValue(mockPayload as any);

      await expect(verifyJWT('expired-token')).rejects.toThrow('Token has expired');
    });

    it('should reject token with invalid format', async () => {
      mockJwtDecode.mockReturnValue(null);

      await expect(verifyJWT('invalid-token')).rejects.toThrow('Invalid token format');
    });

    it('should reject token without key ID', async () => {
      mockJwtDecode.mockReturnValue({
        header: { alg: 'RS256' },
        payload: {},
        signature: 'test-signature',
      });

      await expect(verifyJWT('token-without-kid')).rejects.toThrow('Token missing key ID');
    });
  });

  describe('createOrUpdateAuthenticatedUser', () => {
    const mockJwtPayload = {
      sub: 'cognito-user-123',
      email: 'test@example.com',
      'cognito:username': 'testuser',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    it('should create new authenticated user', async () => {
      mockGetItem.mockResolvedValue({ Item: undefined });
      mockPutItem.mockResolvedValue(undefined as any);

      const result = await createOrUpdateAuthenticatedUser(
        mockJwtPayload,
        'Test User',
        'en'
      );

      expect(result).toMatchObject({
        userId: 'auth-cognito-user-123',
        cognitoId: 'cognito-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        locale: 'en',
        isGuest: false,
      });

      expect(mockPutItem).toHaveBeenCalledWith({
        TableName: 'TestTable',
        Item: expect.objectContaining({
          PK: 'USER#auth-cognito-user-123',
          SK: 'METADATA',
          cognitoId: 'cognito-user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          isGuest: false,
          locale: 'en',
        }),
      });
    });

    it('should update existing authenticated user', async () => {
      const existingUser = {
        PK: 'USER#auth-cognito-user-123',
        SK: 'METADATA',
        cognitoId: 'cognito-user-123',
        email: 'test@example.com',
        displayName: 'Old Name',
        isGuest: false,
        locale: 'en',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockGetItem.mockResolvedValue({ Item: existingUser });
      mockUpdateItem.mockResolvedValue({});

      const result = await createOrUpdateAuthenticatedUser(
        mockJwtPayload,
        'New Name',
        'fr'
      );

      expect(result).toMatchObject({
        userId: 'auth-cognito-user-123',
        cognitoId: 'cognito-user-123',
        email: 'test@example.com',
        displayName: 'New Name',
        locale: 'fr',
        isGuest: false,
      });

      expect(mockUpdateItem).toHaveBeenCalled();
    });

    it('should use email prefix as default display name', async () => {
      mockGetItem.mockResolvedValue({ Item: undefined });
      mockPutItem.mockResolvedValue(undefined as any);

      const result = await createOrUpdateAuthenticatedUser(mockJwtPayload);

      expect(result.displayName).toBe('test');
    });
  });

  describe('updateUserDisplayName', () => {
    it('should update user display name', async () => {
      mockUpdateItem.mockResolvedValue({});

      await updateUserDisplayName('auth-cognito-user-123', 'Updated Name');

      expect(mockUpdateItem).toHaveBeenCalledWith({
        TableName: 'TestTable',
        Key: {
          PK: 'USER#auth-cognito-user-123',
          SK: 'METADATA',
        },
        UpdateExpression: 'SET displayName = :displayName, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':displayName': 'Updated Name',
          ':updatedAt': expect.any(String),
        },
      });
    });
  });

  describe('getUserById', () => {
    it('should return authenticated user by ID', async () => {
      const mockUser = {
        PK: 'USER#auth-cognito-user-123',
        SK: 'METADATA',
        cognitoId: 'cognito-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        isGuest: false,
        locale: 'en',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockGetItem.mockResolvedValue({ Item: mockUser });

      const result = await getUserById('auth-cognito-user-123');

      expect(result).toMatchObject({
        userId: 'auth-cognito-user-123',
        cognitoId: 'cognito-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        locale: 'en',
        isGuest: false,
      });
    });

    it('should return null for guest user', async () => {
      const mockGuestUser = {
        PK: 'USER#guest-123',
        SK: 'METADATA',
        displayName: 'Guest User',
        isGuest: true,
        locale: 'en',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockGetItem.mockResolvedValue({ Item: mockGuestUser });

      const result = await getUserById('guest-123');

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      mockGetItem.mockResolvedValue({ Item: undefined });

      const result = await getUserById('non-existent-user');

      expect(result).toBeNull();
    });
  });
});
