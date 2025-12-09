import * as db from '../database_methods'
import { expect, afterAll, it, describe } from 'vitest';
import { UserRegister, UserQuery, UserUpdate } from '../shared/types/user';
import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';

db.initializeDatabase("test_database.db");

afterAll(() => {
    fs.unlinkSync("test_database.db");
});

// Mock Fastify reply object
const mockReply = {} as FastifyReply;

// Helper functions to create mock requests
function mockGetRequest(params: Partial<UserQuery>): FastifyRequest<{ Params: UserQuery }> {
    return { params } as FastifyRequest<{ Params: UserQuery }>;
}

function mockBodyRequest<T>(body: T): FastifyRequest<{ Body: T }> {
    return { body } as FastifyRequest<{ Body: T }>;
}

describe('Database Methods Tests', () => {

    const testUser: UserRegister = {
        id : "test_user_id",
        name: "Test User",
        email: "test@gmail.com",
        password: "hashed_password",
        avatar: "avatar_url"
    };

    it('should create a new user', () => {
        const req = mockBodyRequest(testUser);
        const result = db.createUser(req, mockReply);
        expect(result).toBe(true);
    });

    it('should retrieve the created user', () => {
        const req = mockGetRequest({email: testUser.email});
        const users = db.getUser(req, mockReply);
        expect(users.length).toBe(1);
        expect(users[0]).toBeDefined();
        if (users[0] === undefined) return;
        expect(users[0].email).toBe(testUser.email);
    });

    it('should update the user information', () => {
        const getReq = mockGetRequest({email: testUser.email});
        const users = db.getUser(getReq, mockReply);
        expect(users[0]).toBeDefined();
        if (users[0] === undefined) return;
        
        const userToUpdate: UserUpdate = {
            id: users[0].id,
            name: "Updated User",
            email: "test_new@gmail.com",
            password: "new_hashed_password",
            avatar: "new_avatar_url"
        };
        const updateReq = mockBodyRequest(userToUpdate);
        const result = db.updateUser(updateReq, mockReply);
        expect(result).toBe(true);

        const updatedReq = mockGetRequest({id: userToUpdate.id});
        const updatedUser = db.getUser(updatedReq, mockReply);
        expect(updatedUser[0]).toBeDefined();
        if (updatedUser[0] === undefined) return;
        expect(updatedUser[0].name).toBe("Updated User");
        expect(updatedUser[0].email).toBe("test_new@gmail.com");
    });
    
    it('should get user password hash', () => {
        const getReq = mockGetRequest({email: "test_new@gmail.com"});
        const users = db.getUser(getReq, mockReply);
        expect(users[0]).toBeDefined();
        if (users[0] === undefined) return;
        
        const hashReq = mockGetRequest({id: users[0].id});
        const password_hash = db.getUserPasswordHash(hashReq, mockReply);
        expect(password_hash).toBe("new_hashed_password");
    });
    
    it('should delete the user', () => {
        const getReq = mockGetRequest({email: "test_new@gmail.com"});
        const users = db.getUser(getReq, mockReply);
        if (users[0] === undefined) return;
        
        const deleteReq = mockBodyRequest({id: users[0].id});
        const result = db.deleteUser(deleteReq, mockReply);
        expect(result).toBe(true);
        
        const checkReq = mockGetRequest({id: users[0].id});
        const deletedUser = db.getUser(checkReq, mockReply);
        expect(deletedUser.length).toBe(0);
    });
});