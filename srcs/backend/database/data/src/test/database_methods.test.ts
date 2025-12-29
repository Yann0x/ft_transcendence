import * as db from '../database_methods'
import { expect, afterAll, it, describe, beforeAll } from 'vitest';
import { User, Channel, Message } from '../shared/with_front/types';
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

        it('should update channel name', () => {
            const updateData = {
                id: Number(createdChannelId),
                name: "Updated Test Channel"
            };
            const req = mockBodyRequest(updateData);
            const result = db.putChannelName(req, mockReply);
            expect(typeof result).toBe('string');
            expect(result).not.toBe('No Change made');

            // Verify the channel name was updated
            const getReq = mockQueryRequest({ id: createdChannelId });
            const channel = db.getChannel(getReq, mockReply);
            expect(channel).not.toBe(null);
            if (channel === null) return;
            expect(channel.name).toBe("Updated Test Channel");
        });

        it('should return "No Change made" when updating non-existent channel', () => {
            const updateData = {
                id: 99999,
                name: "Non Existent Channel"
            };
            const req = mockBodyRequest(updateData);
            const result = db.putChannelName(req, mockReply);
            expect(result).toBe('No Change made');
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

        it('should update message content', () => {
            const updateData = {
                id: Number(createdMessageId),
                content: "Updated message content!",
                read_at: null
            };
            const req = mockBodyRequest(updateData);
            const result = db.putMessage(req, mockReply);
            expect(result).not.toBe(false);
            expect(typeof result).toBe('string');

            // Verify the message content was updated
            const getReq = mockQueryRequest({
                channel_id: Number(createdChannelId),
                id: 999999
            });
            const messages = db.getMessage(getReq, mockReply);
            const updatedMessage = messages.find(msg => msg.id === Number(createdMessageId));
            expect(updatedMessage).toBeDefined();
            if (!updatedMessage) return;
            expect(updatedMessage.content).toBe("Updated message content!");
        });

        it('should update message read_at timestamp', () => {
            const readTimestamp = new Date().toISOString();
            const updateData = {
                id: Number(createdMessageId),
                content: "Updated message content!",
                read_at: readTimestamp
            };
            const req = mockBodyRequest(updateData);
            const result = db.putMessage(req, mockReply);
            expect(result).not.toBe(false);
            expect(typeof result).toBe('string');

            // Verify the read_at was updated
            const getReq = mockQueryRequest({
                channel_id: Number(createdChannelId),
                id: 999999
            });
            const messages = db.getMessage(getReq, mockReply);
            const updatedMessage = messages.find(msg => msg.id === Number(createdMessageId));
            expect(updatedMessage).toBeDefined();
            if (!updatedMessage) return;
            expect(updatedMessage.read_at).toBe(readTimestamp);
        });

        it('should return false when updating non-existent message', () => {
            const updateData = {
                id: 99999,
                content: "Non existent message",
                read_at: null
            };
            const req = mockBodyRequest(updateData);
            const result = db.putMessage(req, mockReply);
            expect(result).toBe(false);
        });

        it('should handle updating read_at from null to timestamp', () => {
            // Create a new message with null read_at
            const messageData = {
                channel_id: Number(createdChannelId),
                sender_id: createdUserId,
                content: "Unread message",
                sent_at: new Date().toISOString()
            };
            const createReq = mockBodyRequest(messageData);
            const newMessageId = db.postMessage(createReq, mockReply);
            expect(typeof newMessageId).toBe('string');
            if (typeof newMessageId !== 'string') return;

            // Update read_at to mark as read
            const readTimestamp = new Date().toISOString();
            const updateData = {
                id: Number(newMessageId),
                content: "Unread message",
                read_at: readTimestamp
            };
            const updateReq = mockBodyRequest(updateData);
            const result = db.putMessage(updateReq, mockReply);
            expect(result).not.toBe(false);

            // Verify the update
            const getReq = mockQueryRequest({
                channel_id: Number(createdChannelId),
                id: 999999
            });
            const messages = db.getMessage(getReq, mockReply);
            const readMessage = messages.find(msg => msg.id === Number(newMessageId));
            expect(readMessage).toBeDefined();
            if (!readMessage) return;
            expect(readMessage.read_at).toBe(readTimestamp);
        });
    });

    describe('Friendship Endpoints', () => {

        let user1Id: string;
        let user2Id: string;
        let user3Id: string;

        beforeAll(() => {
            // Create test users for friendship tests
            const user1 = { name: "Friend User 1", email: "friend1@test.com", password: "pass1", avatar: "avatar1" };
            const user2 = { name: "Friend User 2", email: "friend2@test.com", password: "pass2", avatar: "avatar2" };
            const user3 = { name: "Friend User 3", email: "friend3@test.com", password: "pass3", avatar: "avatar3" };

            user1Id = db.createUser(mockBodyRequest(user1), mockReply) as string;
            user2Id = db.createUser(mockBodyRequest(user2), mockReply) as string;
            user3Id = db.createUser(mockBodyRequest(user3), mockReply) as string;

            expect(user1Id).not.toBe(null);
            expect(user2Id).not.toBe(null);
            expect(user3Id).not.toBe(null);
        });

        it('should create a pending friendship request', () => {
            const req = mockBodyRequest({ user_id: user1Id, friend_id: user2Id });
            const result = db.putUserFriend(req, mockReply);
            expect(result).toBe(true);
        });

        it('should not allow duplicate friendship requests', () => {
            const req = mockBodyRequest({ user_id: user1Id, friend_id: user2Id });
            const result = db.putUserFriend(req, mockReply);
            expect(result).toBe(false); // Already exists
        });

        it('should not allow user to send request to themselves', () => {
            const req = mockBodyRequest({ user_id: user1Id, friend_id: user1Id });
            const result = db.putUserFriend(req, mockReply);
            expect(result).toBe(false); // CHECK constraint should prevent this
        });

        it('should retrieve pending friendship with correct metadata', () => {
            const req = mockQueryRequest({ user_id: user1Id });
            const friends = db.getUserFriends(req, mockReply);

            expect(Array.isArray(friends)).toBe(true);
            expect(friends.length).toBeGreaterThan(0);

            const friendship = friends.find((f: any) => f.id === user2Id);
            expect(friendship).toBeDefined();
            expect(friendship.status).toBe('pending');
            expect(friendship.initiated_by).toBe(user1Id);
            expect(friendship.since).toBeDefined();
        });

        it('should retrieve pending friendship from REQUESTr perspective', () => {
            const req = mockQueryRequest({ user_id: user2Id });
            const friends = db.getUserFriends(req, mockReply);

            expect(Array.isArray(friends)).toBe(true);
            expect(friends.length).toBeGreaterThan(0);

            const friendship = friends.find((f: any) => f.id === user1Id);
            expect(friendship).toBeDefined();
            expect(friendship.status).toBe('pending');
            expect(friendship.initiated_by).toBe(user1Id); // User1 initiated
        });

        it('should accept a pending friendship request', () => {
            // User2 accepts User1's request
            const req = mockBodyRequest({ user_id: user2Id, friend_id: user1Id });
            const result = db.putUserFriend(req, mockReply);
            expect(result).toBe(true);
        });

        it('should verify friendship is now accepted', () => {
            const req1 = mockQueryRequest({ user_id: user1Id });
            const friends1 = db.getUserFriends(req1, mockReply);

            const friendship1 = friends1.find((f: any) => f.id === user2Id);
            expect(friendship1).toBeDefined();
            expect(friendship1.status).toBe('accepted');

            const req2 = mockQueryRequest({ user_id: user2Id });
            const friends2 = db.getUserFriends(req2, mockReply);

            const friendship2 = friends2.find((f: any) => f.id === user1Id);
            expect(friendship2).toBeDefined();
            expect(friendship2.status).toBe('accepted');
        });

        it('should not allow accepting an already accepted friendship', () => {
            const req = mockBodyRequest({ user_id: user1Id, friend_id: user2Id });
            const result = db.putUserFriend(req, mockReply);
            expect(result).toBe(false); // Already accepted
        });

        it('should handle user1 < user2 constraint correctly (reverse order)', () => {
            // Create friendship with user3 > user1 (numerically)
            const req = mockBodyRequest({ user_id: user3Id, friend_id: user1Id });
            const result = db.putUserFriend(req, mockReply);
            expect(result).toBe(true);

            // Verify it's stored correctly
            const getReq = mockQueryRequest({ user_id: user3Id });
            const friends = db.getUserFriends(getReq, mockReply);

            const friendship = friends.find((f: any) => f.id === user1Id);
            expect(friendship).toBeDefined();
            expect(friendship.status).toBe('pending');
        });

        it('should return empty array when user has no friends', () => {
            // Create a new user with no friends
            const lonelyUser = { name: "Lonely User", email: "lonely@test.com", password: "pass", avatar: "avatar" };
            const lonelyUserId = db.createUser(mockBodyRequest(lonelyUser), mockReply) as string;

            const req = mockQueryRequest({ user_id: lonelyUserId });
            const friends = db.getUserFriends(req, mockReply);

            expect(Array.isArray(friends)).toBe(true);
            expect(friends.length).toBe(0);
        });

        it('should delete a pending friendship (sender cancels)', () => {
            // User3 cancels their request to User1
            const req = mockBodyRequest({ user_id: user3Id, friend_id: user1Id });
            const result = db.deleteUserFriend(req, mockReply);
            expect(result).toBe(true);

            // Verify it's deleted
            const getReq = mockQueryRequest({ user_id: user3Id });
            const friends = db.getUserFriends(getReq, mockReply);

            const friendship = friends.find((f: any) => f.id === user1Id);
            expect(friendship).toBeUndefined();
        });

        it('should delete an accepted friendship (unfriend)', () => {
            // User1 unfriends User2
            const req = mockBodyRequest({ user_id: user1Id, friend_id: user2Id });
            const result = db.deleteUserFriend(req, mockReply);
            expect(result).toBe(true);

            // Verify both users no longer see the friendship
            const getReq1 = mockQueryRequest({ user_id: user1Id });
            const friends1 = db.getUserFriends(getReq1, mockReply);
            expect(friends1.find((f: any) => f.id === user2Id)).toBeUndefined();

            const getReq2 = mockQueryRequest({ user_id: user2Id });
            const friends2 = db.getUserFriends(getReq2, mockReply);
            expect(friends2.find((f: any) => f.id === user1Id)).toBeUndefined();
        });

        it('should return false when deleting non-existent friendship', () => {
            const req = mockBodyRequest({ user_id: user1Id, friend_id: user2Id });
            const result = db.deleteUserFriend(req, mockReply);
            expect(result).toBe(false); // Already deleted
        });

        it('should handle complete friendship lifecycle', () => {
            // 1. User1 sends request to User2
            let req = mockBodyRequest({ user_id: user1Id, friend_id: user2Id });
            let result = db.putUserFriend(req, mockReply);
            expect(result).toBe(true);

            // 2. Verify pending status
            let getReq = mockQueryRequest({ user_id: user1Id });
            let friends = db.getUserFriends(getReq, mockReply);
            let friendship = friends.find((f: any) => f.id === user2Id);
            expect(friendship?.status).toBe('pending');
            expect(friendship?.initiated_by).toBe(user1Id);

            // 3. User2 accepts
            req = mockBodyRequest({ user_id: user2Id, friend_id: user1Id });
            result = db.putUserFriend(req, mockReply);
            expect(result).toBe(true);

            // 4. Verify accepted status
            getReq = mockQueryRequest({ user_id: user1Id });
            friends = db.getUserFriends(getReq, mockReply);
            friendship = friends.find((f: any) => f.id === user2Id);
            expect(friendship?.status).toBe('accepted');

            // 5. User1 unfriends User2
            req = mockBodyRequest({ user_id: user1Id, friend_id: user2Id });
            result = db.deleteUserFriend(req, mockReply);
            expect(result).toBe(true);

            // 6. Verify deletion
            getReq = mockQueryRequest({ user_id: user1Id });
            friends = db.getUserFriends(getReq, mockReply);
            friendship = friends.find((f: any) => f.id === user2Id);
            expect(friendship).toBeUndefined();
        });

        it('should handle multiple friendships for same user', () => {
            // User1 sends requests to both User2 and User3
            const req1 = mockBodyRequest({ user_id: user1Id, friend_id: user2Id });
            const result1 = db.putUserFriend(req1, mockReply);
            expect(result1).toBe(true);

            const req2 = mockBodyRequest({ user_id: user1Id, friend_id: user3Id });
            const result2 = db.putUserFriend(req2, mockReply);
            expect(result2).toBe(true);

            // Verify User1 has 2 friendships
            const getReq = mockQueryRequest({ user_id: user1Id });
            const friends = db.getUserFriends(getReq, mockReply);
            expect(friends.length).toBe(2);

            // Both should be pending
            expect(friends.every((f: any) => f.status === 'pending')).toBe(true);
        });

        it('should CASCADE delete friendships when user is deleted', () => {
            // Create two test users
            const tempUser1 = { name: "Temp User 1", email: "temp1@test.com", password: "pass", avatar: "avatar" };
            const tempUser2 = { name: "Temp User 2", email: "temp2@test.com", password: "pass", avatar: "avatar" };

            const tempId1 = db.createUser(mockBodyRequest(tempUser1), mockReply) as string;
            const tempId2 = db.createUser(mockBodyRequest(tempUser2), mockReply) as string;

            // Create friendship
            const friendReq = mockBodyRequest({ user_id: tempId1, friend_id: tempId2 });
            db.putUserFriend(friendReq, mockReply);

            // Verify friendship exists
            const getReq = mockQueryRequest({ user_id: tempId1 });
            let friends = db.getUserFriends(getReq, mockReply);
            expect(friends.length).toBe(1);

            // Delete one user
            const deleteReq = mockBodyRequest({ id: tempId1 });
            const deleteResult = db.deleteUser(deleteReq, mockReply);
            expect(deleteResult).toBe(true);

            // Verify friendship is also deleted (CASCADE)
            const getReq2 = mockQueryRequest({ user_id: tempId2 });
            friends = db.getUserFriends(getReq2, mockReply);
            expect(friends.find((f: any) => f.id === tempId1)).toBeUndefined();
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
