import * as db from '../database_methods'
import { expect, test, afterAll } from 'vitest';
import { UserRegister } from '../shared/types/user';
import fs from 'fs';

db.initDatabase("/data/test_database.db");


let mockUser: UserRegister  = {
  username: 'mockuser',
  email: 'mock@user.fr',
  password_hash: 'hashed_password_123'
}

test('UserRegister', () => {
  const result = db.insert('users', mockUser)
  expect(result.changes).toBe(1)
})

test('UserRegister duplicate', () => {
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

afterAll(() => {
  // Clean up test database file if needed
  db.close();
  if (fs.existsSync('/data/test_database.db')) {
    fs.unlinkSync('/data/test_database.db');
  }   
});