import Database from 'better-sqlite3';
import { FastifyRequest, FastifyReply,} from 'fastify';
import { User, Channel, Message } from './shared/with_front/types';

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
            member1_id REFERENCES users(id),
            member2_id REFERENCES users(id),
            PRIMARY KEY (channel_id)
        );
    `).run();
    db.prepare(
    `
        CREATE TABLE IF NOT EXISTS message (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id REFERENCES channel(id),
            sender_id REFERENCES users(id),
            content TEXT NOT NULL,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME DEFAULT NULL
        );
    `).run();
    return db;
}
export function getUser(req, reply): User[] {
    // Accept both querystring (preferred) and path params as input filters
    const query = (req.query || req.params || {}) as User;

    const conditions: string[] = [];
    const values: Array<string> = [];

    if (query.id) {
        conditions.push('id = ?');
        values.push(String(query.id));
    }
    if (query.email) {
        conditions.push('email = ?');
        values.push(query.email);
    }
    if (query.name) {
        conditions.push('name = ?');
        values.push(query.name);
    }

    const whereClause = conditions.length ? conditions.join(' AND ') : '1=1';

    const users = db.prepare(
        `SELECT id, name, email FROM users WHERE ${whereClause}`
    ).all(...values) as User[];

    return users;
}

export function updateUser(req, reply): boolean | string {
    const request = db.prepare('UPDATE users SET name = ?, email = ?, avatar = ?, password_hash = ? WHERE id = ?');
    const result = request.run(req.body.name, req.body.email, req.body.avatar, req.body.password, req.body.id);
    if (result.changes === 0)
        return "no changes made" 
    return true 
}

export function createUser(req, reply): string | null {
    const request = db.prepare('INSERT INTO users (name, email, password_hash, avatar) VALUES (?, ?, ?, ?)');
    const result = request.run(req.body.name, req.body.email, req.body.password, req.body.avatar);
    if (result.changes === 0)
        return null;
    return String(result.lastInsertRowid);
}

export function deleteUser(req, reply): boolean {
    const request = db.prepare('DELETE FROM users WHERE id = ?');
    const result = request.run(req.body.id);
    if (result.changes === 0)
        return false 
    return true;
}

export function getUserPasswordHash( req, reply) {
    const request = db.prepare('SELECT password_hash FROM users WHERE id = ?');
    const result = request.get(req.query.id) as {password_hash: string} | null;
    console.log('STORE THE FUNCKING PASSWORD IN HASH')
    return result?.password_hash ?? null;
}

export function getChannel(req, reply): Channel | null {

    const query = req.query;
    const channel: Channel | null = db.prepare(
      `SELECT id, name, type, created_by, created_at FROM channel
       WHERE id = ?`
    ).get(
      query.id
    ) as Channel | null;

    if (!channel) {
        return null;
    }

    channel.messages = db.prepare(
      `SELECT id, channel_id, sender_id, content, sent_at FROM message
       WHERE channel_id = ?`
    ).all(
      query.id
    ) as Message[];
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

export function postChannel(req, reply) 
{
    const request = db.prepare('INSERT INTO channel (name, type, created_by, created_at) VALUES (?, ?, ?, ?)'
    )
    const result = request.run(req.body.name, req.body.type, req.body.created_by, req.body.created_at);
    if (result.changes === 0)
        return ('No Change made')
    return String(result.lastInsertRowid)
}

export function putChannelName(req, reply)
{
    const request = db.prepare('UPDATE channel SET name = ? WHERE id = ?')
    const result = request.run(req.body.name, req.body.id);
    if (result.changes === 0)
        return ('No Change made')
    return String(result.lastInsertRowid)
}

export function getMessage(req, reply)
{
    const query = req.query;
    const messages = db.prepare(
    `
        SELECT *
        FROM message
        WHERE channel_id = ?
        AND id < ?
        ORDER BY sent_at DESC, id DESC
        LIMIT 100;
    `
    ).all(
      query.channel_id,
      query.id
    ) as Message [];
    return messages;
}

export function postMessage( req, reply )
{
    const message = req.body;
    const request = db.prepare(`INSERT INTO message (channel_id, sender_id, content, sent_at) VALUES (?, ?, ?, ?)`)
    const result = request.run(message.channel_id, message.sender_id, message.content, message.sent_at)
    if (result.changes === 0)
        return false
    return String(result.lastInsertRowid)

}

export function putMessage( req, reply )
{
    const message = req.body;
    const request = db.prepare(`UPDATE message SET content = ? , read_at = ? WHERE id = ?`)
    const result = request.run(message.content, message.read_at, message.id)
    if (result.changes === 0)
        return false
    return String(result.lastInsertRowid)

}
