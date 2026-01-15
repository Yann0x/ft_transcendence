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
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
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
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT CHECK( type IN ('public','private') ) NOT NULL,
            created_by TEXT REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `).run();
    db.prepare(
    `
        CREATE TABLE IF NOT EXISTS channel_member (
            channel_id TEXT REFERENCES channel(id) ON DELETE CASCADE,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            role TEXT CHECK(role IN ('member','moderator','owner')) DEFAULT 'member',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (channel_id, user_id)
        );
    `).run();
    db.prepare(
    `
        CREATE TABLE IF NOT EXISTS message (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id TEXT REFERENCES channel(id),
            sender_id TEXT REFERENCES users(id),
            content TEXT NOT NULL,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME DEFAULT NULL
        );
    `).run();
    db.prepare(
    `
        CREATE TABLE IF NOT EXISTS blocked_user (
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            blocked_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, blocked_user_id)
        );
    `).run();
    db.prepare(
    `
        CREATE TABLE IF NOT EXISTS friendship (
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            friend_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, friend_id)
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
        `SELECT id, name, email, avatar FROM users WHERE ${whereClause}`
    ).all(...values) as User[];

    return users;
}

export function updateUser(req, reply): boolean | string {
    const fields: string[] = [];
    const values: any[] = [];

    if (req.body.name !== undefined) {
        fields.push('name = ?');
        values.push(req.body.name);
    }
    if (req.body.email !== undefined) {
        fields.push('email = ?');
        values.push(req.body.email);
    }
    if (req.body.avatar !== undefined) {
        fields.push('avatar = ?');
        values.push(req.body.avatar);
    }
    if (req.body.password !== undefined) {
        fields.push('password_hash = ?');
        values.push(req.body.password);
    }

    if (fields.length === 0) {
        return "no fields to update";
    }

    values.push(req.body.id); // id for WHERE clause

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const request = db.prepare(sql);
    const result = request.run(...values);

    if (result.changes === 0)
        return "no changes made";
    return true;
}

export function createUser(req, reply): string | null {
    const request = db.prepare('INSERT INTO users (id, name, email, password_hash, avatar) VALUES (?, ?, ?, ?, ?)');
    const result = request.run(req.body.id, req.body.name, req.body.email, req.body.password, req.body.avatar);
    if (result.changes === 0)
        return null;
    return req.body.id;
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

export function getChannel(req: FastifyRequest, reply: FastifyReply): Channel | null {

    const query = req.query as Channel;
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
      `SELECT id, channel_id, sender_id, content, sent_at, read_at FROM message
       WHERE channel_id = ?
       ORDER BY sent_at ASC`
    ).all(
      query.id
    ) as Message[];
    const members = db.prepare(
      `SELECT user_id FROM channel_member
       WHERE channel_id = ?`
    ).all( query.id ) as {user_id: string}[];
    channel.members = members.map( (m) => m.user_id );
    const moderators = db.prepare(
      `SELECT user_id FROM channel_member
       WHERE channel_id = ? AND role IN ('moderator', 'owner')
     `
    ).all( query.id ) as {user_id: string}[];
    channel.moderators = moderators.map( (m) => m.user_id );
    return channel;
}

export function postChannel(req: FastifyRequest, reply: FastifyReply)
{
    const channel = req.body as Channel;
    const request = db.prepare('INSERT INTO channel (id, name, type, created_by, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    const result = request.run(channel.id, channel.name, channel.type, channel.created_by, channel.created_at);
    if (result.changes === 0)
        return undefined
    return channel.id
}

export function putChannelName(req: FastifyRequest, reply: FastifyReply)
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

export function postChannelMember( req: FastifyRequest, reply: FastifyReply )
{
    const { channel_id, user_id, role } = req.body as any;
    const request = db.prepare(`INSERT INTO channel_member (channel_id, user_id, role) VALUES (?, ?, ?)`)
    const result = request.run(channel_id, user_id, role || 'member')
    if (result.changes === 0)
        return false
    return true
}

export function deleteChannelMember( req: FastifyRequest, reply: FastifyReply )
{
    const { channel_id, user_id } = req.body as any;
    const request = db.prepare(`DELETE FROM channel_member WHERE channel_id = ? AND user_id = ?`)
    const result = request.run(channel_id, user_id)
    if (result.changes === 0)
        return false
    return true
}

export function getBlockedUsers( req: FastifyRequest, reply: FastifyReply )
{
    const user_id = (req.query as any).user_id;
    const blocked = db.prepare(
        `SELECT blocked_user_id FROM blocked_user WHERE user_id = ?`
    ).all(user_id) as {blocked_user_id: string}[];
    return blocked.map(b => b.blocked_user_id);
}

export function postBlockUser( req: FastifyRequest, reply: FastifyReply )
{
    const { user_id, blocked_user_id } = req.body as any;
    const request = db.prepare(`INSERT OR IGNORE INTO blocked_user (user_id, blocked_user_id) VALUES (?, ?)`)
    const result = request.run(user_id, blocked_user_id)
    return result.changes > 0
}

export function deleteBlockUser( req: FastifyRequest, reply: FastifyReply )
{
    const { user_id, blocked_user_id } = req.body as any;
    const request = db.prepare(`DELETE FROM blocked_user WHERE user_id = ? AND blocked_user_id = ?`)
    const result = request.run(user_id, blocked_user_id)
    return result.changes > 0
}

export function getUserChannels( req: FastifyRequest, reply: FastifyReply )
{
    const user_id = (req.query as any).user_id;

    // Get all channel IDs where user is a member
    const channelIds = db.prepare(
        `SELECT channel_id FROM channel_member WHERE user_id = ?`
    ).all(user_id) as {channel_id: number}[];

    if (!channelIds || channelIds.length === 0) {
        return [];
    }

    // For each channel, get full channel data with members and messages
    const channels: Channel[] = [];
    for (const {channel_id} of channelIds) {
        const channel = db.prepare(
            `SELECT id, name, type, created_by, created_at FROM channel WHERE id = ?`
        ).get(channel_id) as Channel | null;

        if (channel) {
            // Get messages for this channel
            channel.messages = db.prepare(
                `SELECT id, channel_id, sender_id, content, sent_at, read_at FROM message
                 WHERE channel_id = ?
                 ORDER BY sent_at ASC
                 LIMIT 100`
            ).all(channel_id) as Message[];

            // Get members for this channel
            const members = db.prepare(
                `SELECT user_id FROM channel_member WHERE channel_id = ?`
            ).all(channel_id) as {user_id: string}[];
            channel.members = members.map(m => m.user_id);

            // Get moderators for this channel
            const moderators = db.prepare(
                `SELECT user_id FROM channel_member
                 WHERE channel_id = ? AND role IN ('moderator', 'owner')`
            ).all(channel_id) as {user_id: string}[];
            channel.moderators = moderators.map(m => m.user_id);

            channels.push(channel);
        }
    }

    return channels;
}

export function findDMChannel( req: FastifyRequest, reply: FastifyReply )
{
    const { user1_id, user2_id } = req.query as any;

    // Find channels where both users are members and it's a private channel with exactly 2 members
    const result = db.prepare(
        `SELECT c.id
         FROM channel c
         WHERE c.type = 'private'
         AND (
             SELECT COUNT(*) FROM channel_member cm WHERE cm.channel_id = c.id
         ) = 2
         AND EXISTS (
             SELECT 1 FROM channel_member cm1 WHERE cm1.channel_id = c.id AND cm1.user_id = ?
         )
         AND EXISTS (
             SELECT 1 FROM channel_member cm2 WHERE cm2.channel_id = c.id AND cm2.user_id = ?
         )
         LIMIT 1`
    ).get(user1_id, user2_id) as {id: number} | undefined;

    return result ? result.id : null;
}

export function getFriends( req: FastifyRequest, reply: FastifyReply )
{
    const { user_id } = req.query as any;

    if (!user_id) {
        return [];
    }

    // Get all friend IDs for the user
    const friendIds = db.prepare(
        `SELECT friend_id FROM friendship WHERE user_id = ?`
    ).all(user_id) as {friend_id: string}[];

    if (!friendIds || friendIds.length === 0) {
        return [];
    }

    // Get full user info for each friend
    const friends = friendIds.map(({friend_id}) => {
        const friend = db.prepare(
            `SELECT id, name, avatar FROM users WHERE id = ?`
        ).get(friend_id) as {id: string, name: string, avatar: string | null} | undefined;

        if (friend) {
            return {
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar,
                status: 'offline' // Status will be updated by social service
            };
        }
        return null;
    }).filter(f => f !== null);

    return friends;
}

export function postFriend( req: FastifyRequest, reply: FastifyReply )
{
    const { user_id, friend_id } = req.body as any;

    if (!user_id || !friend_id) {
        return false;
    }

    if (user_id === friend_id) {
        return false; // Can't be friends with yourself
    }

    try {
        // Add friendship in both directions
        const stmt1 = db.prepare(`INSERT OR IGNORE INTO friendship (user_id, friend_id) VALUES (?, ?)`);
        const stmt2 = db.prepare(`INSERT OR IGNORE INTO friendship (user_id, friend_id) VALUES (?, ?)`);

        const result1 = stmt1.run(user_id, friend_id);
        const result2 = stmt2.run(friend_id, user_id);

        return result1.changes > 0 || result2.changes > 0;
    } catch (error) {
        console.error('[DB] Error adding friend:', error);
        return false;
    }
}

export function deleteFriend( req: FastifyRequest, reply: FastifyReply )
{
    const { user_id, friend_id } = req.body as any;

    if (!user_id || !friend_id) {
        return false;
    }

    try {
        // Remove friendship in both directions
        const stmt1 = db.prepare(`DELETE FROM friendship WHERE user_id = ? AND friend_id = ?`);
        const stmt2 = db.prepare(`DELETE FROM friendship WHERE user_id = ? AND friend_id = ?`);

        const result1 = stmt1.run(user_id, friend_id);
        const result2 = stmt2.run(friend_id, user_id);

        return result1.changes > 0 || result2.changes > 0;
    } catch (error) {
        console.error('[DB] Error removing friend:', error);
        return false;
    }
}

export function markChannelRead( req: FastifyRequest, reply: FastifyReply )
{
    try {
        const { channel_id, user_id } = req.body as { channel_id: number, user_id: string };
        const now = new Date().toISOString();

        // Mark all messages in channel as read (except user's own messages)
        const stmt = db.prepare(`
            UPDATE message
            SET read_at = ?
            WHERE channel_id = ?
                AND sender_id != ?
                AND read_at IS NULL
        `);

        stmt.run(now, channel_id, user_id);

        return reply.status(200).send(true);
    } catch (error: any) {
        console.error('[DATABASE] markChannelRead error:', error);
        return reply.status(500).send({ error: 'Failed to mark channel as read' });
    }
}