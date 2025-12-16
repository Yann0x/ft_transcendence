import Database from 'better-sqlite3';
import { UserQuery, UserQueryResponse, UserRegister, UserUpdate } from './shared/types/user';
import { FastifyRequest, FastifyReply } from 'fastify';

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

export function getUser
(
    req: FastifyRequest <{ Params : {id? : string, email?: string, name?: string}} >,
    reply: FastifyReply
): UserQueryResponse[] {

    const query = req.params as UserQuery;
      const users = db.prepare(
        `SELECT id, name, email FROM users 
         WHERE (${query.id ? 'id = ?' : '1=1'})
         AND (${query.email ? 'email = ?' : '1=1'})
         AND (${query.name ? 'name = ?' : '1=1'})`
      ).all(
        ...(query.id ? [query.id] : []),
        ...(query.email ? [query.email] : []),
        ...(query.name ? [query.name] : [])
      ) as UserQueryResponse[];
      return users;
}

export function updateUser(
    req: FastifyRequest<{ Body: UserUpdate }>,
    reply: FastifyReply
): boolean | string {
    const request = db.prepare('UPDATE users SET name = ?, email = ?, avatar = ?, password_hash = ? WHERE id = ?');
    const result = request.run(req.body.name, req.body.email, req.body.avatar, req.body.password, req.body.id);
    if (result.changes === 0)
        return "no changes made" 
    return true 
}

export function createUser(
    req: FastifyRequest<{ Body: UserRegister }>,
    reply: FastifyReply
): string | null {
    const request = db.prepare('INSERT INTO users (name, email, password_hash, avatar) VALUES (?, ?, ?, ?)');
    const result = request.run(req.body.name, req.body.email, req.body.password, req.body.avatar);
    if (result.changes === 0)
        return null;
    return String(result.lastInsertRowid);
}

export function deleteUser(
    req: FastifyRequest<{ Body: { id: string } }>,
    reply: FastifyReply
): boolean {
    const request = db.prepare('DELETE FROM users WHERE id = ?');
    const result = request.run(req.body.id);
    if (result.changes === 0)
        return false 
    return true;
}

export function getUserPasswordHash(
    req: FastifyRequest<{ Querystring: { id: string } }>,
    reply: FastifyReply
) {
    const request = db.prepare('SELECT password_hash FROM users WHERE id = ?');
    const result = request.get(req.query.id) as {password_hash: string} | null;
    return result?.password_hash ?? null;
}