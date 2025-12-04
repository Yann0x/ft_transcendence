import * as db from '../database_methods'
import { expect, afterAll, it, describe } from 'vitest';
import { UserRegister, UserQuery, UserUpdate } from '../shared/types/user';
import fs from 'fs';

db.initializeDatabase("/data/test_database.db");

afterAll(() => {
    fs.unlinkSync("/data/test_database.db");
});


describe('Database Methods Tests', () => {

    const testUser: UserRegister = {
        name: "Test User",
        email: "test@gmail.com",
        password: "hashed_password",
        avatar: "avatar_url"
    };

    it('should create a new user', () => {
        const result = db.createUser(testUser);
        expect(result).toBe(true);
    });

    it('should retrieve the created user', () => {
        const query: UserQuery = {email: testUser.email};
        const users = db.getUser(query);
        expect(users.length).toBe(1);
        expect(users[0]).toBeDefined();
        if (users[0] === undefined) return;
        expect(users[0].email).toBe(testUser.email);
    });
    it('should update the user information', () => {
        const users = db.getUser(testUser);
        expect(users[0]).toBeDefined();
        if (users[0] === undefined) return;
        const userToUpdate: UserUpdate = {
            id: users[0].id,
            name: "Updated User",
            email: "test_new@gmail.com",
            passwordHash: "new_hashed_password",
            avatar: "new_avatar_url"
        };
        const result = db.updateUser(userToUpdate);
        expect(result).toBe(true);

        const updatedUser = db.getUser({id: userToUpdate.id});
        expect(users[0]).toBeDefined();
        if (updatedUser[0] === undefined) return;
        expect(updatedUser[0].name).toBe("Updated User");
        expect(updatedUser[0].email).toBe("test_new@gmail.com");
    });
    
    it('should get user password hash', () => {
        const users = db.getUser({email: "test_new@gmail.com"});
        expect(users[0]).toBeDefined();
        if (users[0] === undefined) return;
        const query: UserQuery = {id: users[0].id};
        const password_hash = db.getUserPasswordHash(query);
        expect(password_hash).toBe("new_hashed_password");
    }
    );
    
    it('should delete the user', () => {
        const users = db.getUser({email: "test_new@gmail.com"});
        if (users[0] === undefined) return;
        const query: UserQuery = {id: users[0].id};
        const result = db.deleteUser(query);
        expect(result).toBe(true);
        const deletedUser = db.getUser(query);
        expect(deletedUser.length).toBe(0);
    }
    );
});