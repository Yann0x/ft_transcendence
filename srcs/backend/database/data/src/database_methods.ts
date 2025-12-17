import Database from 'better-sqlite3';
import { User, Channel, Message } from './shared/types/with_front/types';
import { FastifyRequest, FastifyReply } from 'fastify';

let db: Database.Database;

export function initializeDatabase(path: string | undefined = 'database.db' ): Database.Database {
    db = new Database(path); 
    db.pragma('WAL=1');   
    db.prepare(
    `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            avatar TEXT
        );
    `).run();
    db.prepare(
    `
        CREATE TABLE IF NOT EXISTS match (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id REFERENCES tournament(id) DEFAULT NULL,
            score1 INTEGER,
            score2 INTEGER,
            player1_id REFERENCES users(id),
            player2_id REFERENCES users(id)
        );
    `).run();
    db.prepare(
    `
        CREATE TABLE IF NOT EXISTS channel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT CHECK( type IN ('public','private') ) NOT NULL,
            created_by REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `).run();
    db.prepare(
    `
        CREATE TABLE IF NOT EXISTS chanel_member (
            channel_id REFERENCES channel(id),
            member_id REFERENCES users(id),
            PRIMARY KEY (channel_id, member_id)
        );
    `).run();
    db.prepare(
    `
        CREATE TABLE IF NOT EXISTS message (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id REFERENCES channel(id),
            sender_id REFERENCES users(id),
            content TEXT NOT NULL,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `).run();
    return db;
}

export function getUser
(
    req: FastifyRequest <{ Params : {id? : string, email?: string, name?: string}} >,
    reply: FastifyReply
): User[] {

    const query = req.params as User;
      const users = db.prepare(
        `SELECT id, name, email FROM users 
         WHERE (${query.id ? 'id = ?' : '1=1'})
         AND (${query.email ? 'email = ?' : '1=1'})
         AND (${query.name ? 'name = ?' : '1=1'})`
      ).all(
        ...(query.id ? [query.id] : []),
        ...(query.email ? [query.email] : []),
        ...(query.name ? [query.name] : [])
      ) as User[];
      return users;
}

export function updateUser(
    req: FastifyRequest<{ Body: User }>,
    reply: FastifyReply
): boolean | string {
    const request = db.prepare('UPDATE users SET name = ?, email = ?, avatar = ?, password_hash = ? WHERE id = ?');
    const result = request.run(req.body.name, req.body.email, req.body.avatar, req.body.password, req.body.id);
    if (result.changes === 0)
        return "no changes made" 
    return true 
}

export function createUser(
    req: FastifyRequest<{ Body: User }>,
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

export function getChannel(
    req: FastifyRequest <{ Params : {id : string}} >,
    reply: FastifyReply
): Channel | null {

    const query = req.params;
    const channel: Channel | null = db.prepare(
      `SELECT id, name, type, created_by, created_at FROM channel 
       WHERE id = ?`
    ).get(
      query.id
    ) as Channel | null;
    channel.messages = db.prepare(
      `SELECT id, channel_id, sender_id, content, sent_at FROM message 
       WHERE channel_id = ?`
    ).all(
      query.id
    ) as Channel[] | null;
    const members = db.prepare(
      `SELECT member_id FROM chanel_member 
       WHERE channel_id = ?`
    ).all( query.id ) as {member_id: string}[];
    channel.members = members.map( (m) => m.member_id );
    const moderators = db.prepare(
      `
      SELECT member_id FROM chanel_member 
       WHERE channel_id = ?
     `
    ).all( query.id ) as {member_id: string}[];
    channel.moderators = moderators.map( (m) => m.member_id );
    return channel;
}

export function getMessages(
    req: FastifyRequest <{ Params : {channel_id : string, last_messageg_id: string}} >,
    reply: FastifyReply
)
{
    const query = req.params;
    const messages = db.prepare(
    `
        SELECT *
        FROM messages
        WHERE channel_id = ?
        AND id < ?
        ORDER BY created_at DESC, id DESC
        LIMIT 100;
    `
    ).all(
      query.channel_id, 
      query.last_messageg_id
    ) as Message [];
    return messages;
}

