import Database from 'better-sqlite3';
import { UserQuery, UserQueryResponse, UserRegister, UserUpdate } from './shared/types/user';

let db: Database.Database;

export function initializeDatabase(path: string | undefined = 'database.db' ): Database.Database {
    db = new Database(path); 
    db.pragma('WAL=1');   
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            avatar TEXT
        );
    `).run();
    return db;
}

export function getUser(user: UserQuery): UserQueryResponse[] {
    const request = db.prepare('SELECT * FROM users WHERE name = ? OR email = ? OR id = ?');
    const result : UserQueryResponse[] = request.all(user.name, user.email, user.id) as UserQueryResponse[];
    return result;
}

export function updateUser(user: UserUpdate): boolean{
    const request = db.prepare('UPDATE users SET name = ?, email = ?, avatar = ?, password_hash = ? WHERE id = ?');
    const result = request.run(user.name, user.email, user.avatar, user.passwordHash, user.id);
    if (result.changes === 0)
        return false 
    return true 
}

export function createUser(user: UserRegister): boolean {
    const request = db.prepare('INSERT INTO users (name, email, password_hash, avatar) VALUES (?, ?, ?, ?)');
    const result = request.run(user.name, user.email, user.password, user.avatar);
    if (result.changes === 0)
        return false 
    return true 
}

export function deleteUser(user: UserQuery): boolean {
    const request = db.prepare('DELETE FROM users WHERE id = ?');
    const result = request.run(user.id);
    if (result.changes === 0)
        return false 
    return true;
}

export function getUserPasswordHash(user: UserQuery): string | undefined {
    const request = db.prepare('SELECT password_hash FROM users WHERE id = ?');
    const result = request.get(user.id) as {password_hash: string} | undefined;
    return result?.password_hash;
}