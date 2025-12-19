import * as db from '../database_methods'
import { expect, afterAll, it, describe, beforeAll } from 'vitest';
import { User, Channel, Message } from '../shared/typeBox';
import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';

db.initializeDatabase("test_database.db");

afterAll(() => {
    fs.unlinkSync("test_database.db");
});

// Mock Fastify reply object
const mockReply = {} as FastifyReply;

// Helper functions to create mock requests
function mockParamsRequest<T>(params: T): FastifyRequest<{ Params: T }> {
    return { params } as FastifyRequest<{ Params: T }>;
}

function mockQueryRequest<T>(query: T): FastifyRequest<{ Querystring: T }> {
    return { query } as FastifyRequest<{ Querystring: T }>;
}

function mockBodyRequest<T>(body: T): FastifyRequest<{ Body: T }> {
    return { body } as FastifyRequest<{ Body: T }>;
}

describe('Database Methods Tests', () => {

    let createdUserId: string;
    let createdChannelId: string;
    let createdMessageId: string;

    const testUser = {
        name: "Test User",
        email: "test@gmail.com",
        password: "hashed_password",
        avatar: "avatar_url"
    };

    describe('User Endpoints', () => {

        it('should create a new user', () => {
            const req = mockBodyRequest(testUser);
            const result = db.createUser(req, mockReply);
            expect(typeof result).toBe('string');
            expect(result).not.toBe(null);
            if (result === null) return;
            expect(result.length).toBeGreaterThan(0);
            createdUserId = result;
        });

        it('should retrieve the created user by email', () => {
            const req = mockQueryRequest({ email: testUser.email });
            const users = db.getUser(req, mockReply);
            expect(users.length).toBe(1);
            expect(users[0]).toBeDefined();
            if (users[0] === undefined) return;
            expect(users[0].email).toBe(testUser.email);
            expect(users[0].name).toBe(testUser.name);
        });

        it('should retrieve the user by id', () => {
            const req = mockQueryRequest({ id: createdUserId });
            const users = db.getUser(req, mockReply);
            expect(users.length).toBe(1);
            expect(users[0]).toBeDefined();
            if (users[0] === undefined) return;
            expect(String(users[0].id)).toBe(createdUserId);
        });

        it('should retrieve the user by name', () => {
            const req = mockQueryRequest({ name: testUser.name });
            const users = db.getUser(req, mockReply);
            expect(users.length).toBe(1);
            expect(users[0]).toBeDefined();
            if (users[0] === undefined) return;
            expect(users[0].name).toBe(testUser.name);
        });

        it('should get user password hash', () => {
            const req = mockQueryRequest({ id: createdUserId });
            const password_hash = db.getUserPasswordHash(req, mockReply);
            expect(password_hash).toBe(testUser.password);
        });

        it('should update the user information', () => {
            const userToUpdate = {
                id: createdUserId,
                name: "Updated User",
                email: "test_updated@gmail.com",
                password: "new_hashed_password",
                avatar: "new_avatar_url"
            };
            const updateReq = mockBodyRequest(userToUpdate);
            const result = db.updateUser(updateReq, mockReply);
            expect(result).toBe(true);

            const updatedReq = mockQueryRequest({ id: createdUserId });
            const updatedUsers = db.getUser(updatedReq, mockReply);
            expect(updatedUsers[0]).toBeDefined();
            if (updatedUsers[0] === undefined) return;
            expect(updatedUsers[0].name).toBe("Updated User");
            expect(updatedUsers[0].email).toBe("test_updated@gmail.com");
        });

        it('should return "no changes made" when updating non-existent user', () => {
            const userToUpdate = {
                id: "99999",
                name: "Non Existent User",
                email: "nonexistent@gmail.com",
                password: "password",
                avatar: "avatar"
            };
            const updateReq = mockBodyRequest(userToUpdate);
            const result = db.updateUser(updateReq, mockReply);
            expect(result).toBe("no changes made");
        });
    });

    describe('Channel Endpoints', () => {

        it('should create a new channel', () => {
            const channelData = {
                name: "Test Channel",
                type: "public",
                created_by: createdUserId,
                created_at: new Date().toISOString()
            };
            const req = mockBodyRequest(channelData);
            const result = db.postChannel(req, mockReply);
            expect(typeof result).toBe('string');
            expect(result).not.toBe('No Change made');
            if (typeof result !== 'string' || result === 'No Change made') return;
            createdChannelId = result;
        });

        it('should retrieve the created channel', () => {
            const req = mockQueryRequest({ id: createdChannelId });
            const channel = db.getChannel(req, mockReply);
            expect(channel).not.toBe(null);
            if (channel === null) return;
            expect(channel.id).toBe(Number(createdChannelId));
            expect(channel.name).toBe("Test Channel");
            expect(channel.type).toBe("public");
            expect(channel.created_by).toBe(createdUserId);
            expect(channel.members).toBeDefined();
            expect(Array.isArray(channel.members)).toBe(true);
            expect(channel.moderators).toBeDefined();
            expect(Array.isArray(channel.moderators)).toBe(true);
            expect(channel.messages).toBeDefined();
            expect(Array.isArray(channel.messages)).toBe(true);
        });

        it('should return null for non-existent channel', () => {
            const req = mockQueryRequest({ id: "99999" });
            const channel = db.getChannel(req, mockReply);
            expect(channel).toBe(null);
        });

        it('should create a private channel', () => {
            const channelData = {
                name: "Private Test Channel",
                type: "private",
                created_by: createdUserId,
                created_at: new Date().toISOString()
            };
            const req = mockBodyRequest(channelData);
            const result = db.postChannel(req, mockReply);
            expect(typeof result).toBe('string');
            expect(result).not.toBe('No Change made');
        });
    });

    describe('Message Endpoints', () => {

        it('should create a new message', () => {
            const messageData = {
                channel_id: Number(createdChannelId),
                sender_id: createdUserId,
                content: "Hello, this is a test message!",
                sent_at: new Date().toISOString()
            };
            const req = mockBodyRequest(messageData);
            const result = db.postMessage(req, mockReply);
            expect(result).not.toBe(false);
            expect(typeof result).toBe('string');
            if (typeof result !== 'string') return;
            createdMessageId = result;
        });

        it('should create multiple messages', () => {
            const messages = [
                "Second message",
                "Third message",
                "Fourth message"
            ];

            for (const content of messages) {
                const messageData = {
                    channel_id: Number(createdChannelId),
                    sender_id: createdUserId,
                    content: content,
                    sent_at: new Date().toISOString()
                };
                const req = mockBodyRequest(messageData);
                const result = db.postMessage(req, mockReply);
                expect(result).not.toBe(false);
                expect(typeof result).toBe('string');
            }
        });

        it('should retrieve messages from a channel', () => {
            const req = mockQueryRequest({
                channel_id: Number(createdChannelId),
                id: 999999 // High ID to get all messages
            });
            const messages = db.getMessage(req, mockReply);
            expect(Array.isArray(messages)).toBe(true);
            expect(messages.length).toBeGreaterThan(0);
            expect(messages.length).toBeLessThanOrEqual(100);

            // Messages should be ordered by sent_at DESC
            if (messages.length > 1) {
                const firstMessage = messages[0];
                const secondMessage = messages[1];
                expect(firstMessage).toBeDefined();
                expect(secondMessage).toBeDefined();
            }
        });

        it('should retrieve messages with pagination', () => {
            const firstReq = mockQueryRequest({
                channel_id: Number(createdChannelId),
                id: 999999
            });
            const firstBatch = db.getMessage(firstReq, mockReply);
            expect(firstBatch.length).toBeGreaterThan(0);

            if (firstBatch.length > 0 && firstBatch[firstBatch.length - 1]) {
                const oldestMessageId = firstBatch[firstBatch.length - 1].id;

                const secondReq = mockQueryRequest({
                    channel_id: Number(createdChannelId),
                    id: oldestMessageId
                });
                const secondBatch = db.getMessage(secondReq, mockReply);

                // Second batch should not include messages with id >= oldestMessageId
                secondBatch.forEach(msg => {
                    expect(msg.id).toBeLessThan(oldestMessageId);
                });
            }
        });

        it('should return empty array for channel with no messages', () => {
            const req = mockQueryRequest({
                channel_id: 99999,
                id: 999999
            });
            const messages = db.getMessage(req, mockReply);
            expect(Array.isArray(messages)).toBe(true);
            expect(messages.length).toBe(0);
        });
    });

    describe('User Deletion', () => {

        it('should delete a user without foreign key constraints', () => {
            // Create a new user just for deletion test
            const newUser = {
                name: "User To Delete",
                email: "delete@gmail.com",
                password: "password",
                avatar: "avatar"
            };
            const createReq = mockBodyRequest(newUser);
            const newUserId = db.createUser(createReq, mockReply);
            expect(newUserId).not.toBe(null);

            // Now delete this user
            const deleteReq = mockBodyRequest({ id: newUserId });
            const result = db.deleteUser(deleteReq, mockReply);
            expect(result).toBe(true);

            // Verify deletion
            const checkReq = mockQueryRequest({ id: newUserId });
            const deletedUser = db.getUser(checkReq, mockReply);
            expect(deletedUser.length).toBe(0);
        });

        it('should return false when deleting non-existent user', () => {
            const deleteReq = mockBodyRequest({ id: "99999" });
            const result = db.deleteUser(deleteReq, mockReply);
            expect(result).toBe(false);
        });
    });
});
