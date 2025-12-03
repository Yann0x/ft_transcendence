import * as db from '../database_methods'
import { expect, test, afterAll } from 'vitest';
import { Register } from '../shared/types/user';
import fs from 'fs';

db.initDatabase("/data/test_database.db");


let mockUser: Register  = {
  username: 'mockuser',
  email: 'mock@user.fr',
  password_hash: 'hashed_password_123'
}

test('Register', () => {
  const result = db.insert('users', mockUser)
  expect(result.changes).toBe(1)
})

test('Register duplicate', () => {
  try {
    db.insert('users', mockUser)
  } catch (error) {
    expect((error as Error).message).toContain('UNIQUE constraint failed: users.email')
    return
  }
})

test('test email exist', () => {
  expect(db.emailExists(mockUser.email)).toBe(true)
})

test('test email dont exist', () => {
  expect(db.emailExists('nonexisting@nowhere.fr')).toBe(false)
})

test('getUser by email', () => {
  const user = db.getUser(undefined, mockUser.email, undefined)
  expect(user).toBeDefined()
  expect(user.email).toBe(mockUser.email)
})

test('getUser by id', () => {
  const insertedUser = db.getUser(undefined, mockUser.email, undefined)
  const user = db.getUser(insertedUser.id, undefined, undefined)
  expect(user).toBeDefined()
  expect(user.id).toBe(insertedUser.id)
})

test('getUser by username', () => {   
  const user = db.getUser(undefined, undefined, mockUser.username)  
  expect(user).toBeDefined()
  expect(user.username).toBe(mockUser.username)
})

test('getUser non existing', () => {
  const user = db.getUser(undefined, 'sisi', undefined)
  expect(user).toBeUndefined()
})

test('getUser no param', () => {
  const user = db.getUser(undefined, undefined, undefined)
  expect(user).toBeUndefined()
})

afterAll(() => {
  // Clean up test database file if needed
  db.close();
  if (fs.existsSync('/data/test_database.db')) {
    fs.unlinkSync('/data/test_database.db');
  }   
});