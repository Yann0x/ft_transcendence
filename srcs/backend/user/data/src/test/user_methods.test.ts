import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import * as userMethods from '../user_methods';
import { FastifyRequest, FastifyReply } from 'fastify';
import { User, UserPublic } from '../shared/with_front/types';
import customFetch from '../shared/utils/fetch';

// Mock the customFetch module
vi.mock('../shared/utils/fetch', () => ({
  default: vi.fn()
}));

// Mock Fastify reply object with common methods
const createMockReply = () => {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
  return reply;
};

// Helper function to create mock request with body
function mockBodyRequest<T>(body: T, headers: Record<string, string> = {}): FastifyRequest<{ Body: T }> {
  return {
    body,
    headers,
    log: {
      error: vi.fn()
    }
  } as unknown as FastifyRequest<{ Body: T }>;
}

// Helper function to create mock request with querystring
function mockQueryRequest<T>(query: T, headers: Record<string, string> = {}): FastifyRequest<{ Querystring: T }> {
  return {
    query,
    headers,
    log: {
      error: vi.fn()
    }
  } as unknown as FastifyRequest<{ Querystring: T }>;
}

describe('User Methods Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerUserHandler', () => {
    it('should register a new user and return JWT token', async () => {
      const newUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock database response
      vi.mocked(customFetch)
        .mockResolvedValueOnce('user-id-123') // Database returns user ID
        .mockResolvedValueOnce('jwt-token-abc'); // Auth service returns token

      const req = mockBodyRequest(newUser);
      const reply = createMockReply();

      const result = await userMethods.registerUserHandler(req, reply);

      expect(result).toEqual({
        success: true,
        message: 'User registered successfully',
        userId: 'user-id-123',
        access_token: 'jwt-token-abc'
      });

      expect(customFetch).toHaveBeenCalledTimes(2);
      expect(customFetch).toHaveBeenNthCalledWith(1, 'http://database:3000/database/user', 'POST', newUser);
      expect(customFetch).toHaveBeenNthCalledWith(2, 'http://authenticate:3000/get_jwt', 'POST', {
        id: 'user-id-123',
        name: 'Test User',
        email: 'test@example.com'
      });
    });

    it('should handle registration errors properly', async () => {
      const newUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const error = {
        statusCode: 400,
        error: 'Validation Error',
        message: 'Email already exists',
        service: 'database'
      };

      vi.mocked(customFetch).mockRejectedValueOnce(error);

      const req = mockBodyRequest(newUser);
      const reply = createMockReply();

      await userMethods.registerUserHandler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Validation Error',
        message: 'Email already exists',
        statusCode: 400
      }));
    });
  });

  describe('loginUserHandler', () => {
    it('should login user and return JWT token', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'user-id-123',
        name: 'Test User',
        email: 'test@example.com'
      };

      vi.mocked(customFetch)
        .mockResolvedValueOnce([mockUser]) // Get user by email
        .mockResolvedValueOnce('password123') // Get password hash
        .mockResolvedValueOnce('jwt-token-abc'); // Get JWT

      const req = mockBodyRequest(credentials);
      const reply = createMockReply();

      const result = await userMethods.loginUserHandler(req, reply);

      expect(result).toEqual({ access_token: 'jwt-token-abc' });
      expect(customFetch).toHaveBeenCalledTimes(3);
    });

    it('should return 401 if user not found', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      vi.mocked(customFetch).mockResolvedValueOnce([]); // No user found

      const req = mockBodyRequest(credentials);
      const reply = createMockReply();

      await userMethods.loginUserHandler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized',
        message: 'Invalid credentials',
        statusCode: 401
      }));
    });

    it('should return 401 if password is incorrect', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: 'user-id-123',
        name: 'Test User',
        email: 'test@example.com'
      };

      vi.mocked(customFetch)
        .mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce('password123'); // Stored hash doesn't match

      const req = mockBodyRequest(credentials);
      const reply = createMockReply();

      await userMethods.loginUserHandler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      }));
    });
  });

  describe('findUserHandler', () => {
    it('should return full User object when requesting own data', async () => {
      const query = { id: 'user-id-123' };
      const requestingUserId = 'user-id-123';

      const mockUser: User = {
        id: 'user-id-123',
        name: 'Test User',
        email: 'test@example.com',
        avatar: 'avatar-url',
        status: 'online'
      };

      vi.mocked(customFetch).mockResolvedValueOnce([mockUser]);

      const req = mockQueryRequest(query, { 'x-sender-id': requestingUserId });
      const reply = createMockReply();

      const result = await userMethods.findUserHandler(req, reply);

      expect(result).toHaveLength(1);
      const returnedUser = result[0] as User;

      // Should have full user data
      expect(returnedUser.id).toBe('user-id-123');
      expect(returnedUser.name).toBe('Test User');
      expect(returnedUser.email).toBe('test@example.com');
      expect(returnedUser.avatar).toBe('avatar-url');
      expect(returnedUser.status).toBe('online');

      // Should have populated fields (empty arrays for now)
      expect(returnedUser.chats).toEqual([]);
      expect(returnedUser.tournaments).toEqual([]);
      expect(returnedUser.matches).toEqual([]);
      expect(returnedUser.friends).toEqual([]);

      // Should have stats
      expect(returnedUser.stats).toEqual({
        user_id: 'user-id-123',
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        win_rate: 0
      });
    });

    it('should return only UserPublic when requesting other user data', async () => {
      const query = { id: 'user-id-456' };
      const requestingUserId = 'user-id-123'; // Different user

      const mockUser: User = {
        id: 'user-id-456',
        name: 'Other User',
        email: 'other@example.com',
        avatar: 'other-avatar',
        status: 'offline'
      };

      vi.mocked(customFetch).mockResolvedValueOnce([mockUser]);

      const req = mockQueryRequest(query, { 'x-sender-id': requestingUserId });
      const reply = createMockReply();

      const result = await userMethods.findUserHandler(req, reply);

      expect(result).toHaveLength(1);
      const returnedUser = result[0] as UserPublic;

      // Should have only public fields
      expect(returnedUser.id).toBe('user-id-456');
      expect(returnedUser.name).toBe('Other User');
      expect(returnedUser.avatar).toBe('other-avatar');
      expect(returnedUser.status).toBe('offline');

      // Should NOT have private fields
      expect(returnedUser).not.toHaveProperty('email');
      expect(returnedUser).not.toHaveProperty('password');
      expect(returnedUser).not.toHaveProperty('chats');
      expect(returnedUser).not.toHaveProperty('tournaments');
      expect(returnedUser).not.toHaveProperty('matches');
      expect(returnedUser).not.toHaveProperty('stats');
      expect(returnedUser).not.toHaveProperty('friends');
    });

    it('should return empty array when user not found', async () => {
      const query = { id: 'nonexistent-id' };
      const requestingUserId = 'user-id-123';

      vi.mocked(customFetch).mockResolvedValueOnce([]);

      const req = mockQueryRequest(query, { 'x-sender-id': requestingUserId });
      const reply = createMockReply();

      const result = await userMethods.findUserHandler(req, reply);

      expect(result).toEqual([]);
    });

    it('should return UserPublic when no x-sender-id header is provided', async () => {
      const query = { id: 'user-id-123' };

      const mockUser: User = {
        id: 'user-id-123',
        name: 'Test User',
        email: 'test@example.com',
        avatar: 'avatar-url',
        status: 'online'
      };

      vi.mocked(customFetch).mockResolvedValueOnce([mockUser]);

      const req = mockQueryRequest(query, {}); // No x-sender-id header
      const reply = createMockReply();

      const result = await userMethods.findUserHandler(req, reply);

      expect(result).toHaveLength(1);
      const returnedUser = result[0] as UserPublic;

      // Should only have public fields
      expect(returnedUser.id).toBe('user-id-123');
      expect(returnedUser.name).toBe('Test User');
      expect(returnedUser).not.toHaveProperty('email');
    });

    it('should handle database errors properly', async () => {
      const query = { id: 'user-id-123' };
      const requestingUserId = 'user-id-123';

      const error = {
        statusCode: 500,
        error: 'Database Error',
        message: 'Database connection failed',
        service: 'database'
      };

      vi.mocked(customFetch).mockRejectedValueOnce(error);

      const req = mockQueryRequest(query, { 'x-sender-id': requestingUserId });
      const reply = createMockReply();

      await userMethods.findUserHandler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Database Error',
        message: 'Database connection failed',
        statusCode: 500
      }));
    });
  });

  describe('updateUserHandler', () => {
    it('should update user successfully', async () => {
      const updateData = {
        id: 'user-id-123',
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      vi.mocked(customFetch).mockResolvedValueOnce(true);

      const req = mockBodyRequest(updateData);
      const reply = createMockReply();

      const result = await userMethods.updateUserHandler(req, reply);

      expect(result).toEqual({
        success: true,
        message: 'User updated successfully'
      });
      expect(customFetch).toHaveBeenCalledWith(
        'http://database:3000/database/user',
        'PUT',
        updateData
      );
    });

    it('should handle update errors properly', async () => {
      const updateData = {
        id: 'user-id-123',
        name: 'Updated Name'
      };

      const error = {
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
        service: 'database'
      };

      vi.mocked(customFetch).mockRejectedValueOnce(error);

      const req = mockBodyRequest(updateData);
      const reply = createMockReply();

      await userMethods.updateUserHandler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Not Found',
        message: 'User not found'
      }));
    });
  });

  describe('deleteUserHandler', () => {
    it('should delete user successfully', async () => {
      const deleteData = { id: 'user-id-123' };

      vi.mocked(customFetch).mockResolvedValueOnce(true);

      const req = mockBodyRequest(deleteData);
      const reply = createMockReply();

      const result = await userMethods.deleteUserHandler(req, reply);

      expect(result).toEqual({
        success: true,
        message: 'User deleted successfully'
      });
      expect(customFetch).toHaveBeenCalledWith(
        'http://database:3000/database/user',
        'DELETE',
        deleteData
      );
    });

    it('should handle delete errors properly', async () => {
      const deleteData = { id: 'user-id-123' };

      const error = {
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
        service: 'database'
      };

      vi.mocked(customFetch).mockRejectedValueOnce(error);

      const req = mockBodyRequest(deleteData);
      const reply = createMockReply();

      await userMethods.deleteUserHandler(req, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Not Found',
        message: 'User not found'
      }));
    });
  });
});
