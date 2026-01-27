/* DATABASE METHODS */

import Database from 'better-sqlite3';
import { FastifyRequest, FastifyReply,} from 'fastify';
import { User, Channel, Message } from './shared/with_front/types';

let db: Database.Database;

/* INIT */

export function initializeDatabase(path: string | undefined = 'database.db' ): Database.Database {
    db = new Database(path);
    db.pragma('WAL=1');
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT DEFAULT NULL,
            avatar TEXT,
            ft_id TEXT UNIQUE DEFAULT NULL,
            twoAuth_secret TEXT DEFAULT NULL,
            twoAuth_enabled INTEGER DEFAULT 0
        );
    `).run();
    db.prepare(`
        CREATE TABLE IF NOT EXISTS match (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id TEXT DEFAULT NULL,
            score1 INTEGER,
            score2 INTEGER,
            player1_id TEXT REFERENCES users(id),
            player2_id TEXT REFERENCES users(id),
            played_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `).run();
    db.prepare(`
        CREATE TABLE IF NOT EXISTS channel (
            id TEXT PRIMARY KEY,
            name TEXT,
            type TEXT CHECK( type IN ('public','private') ) NOT NULL,
            created_by TEXT REFERENCES users(id),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `).run();
    db.prepare(`
        CREATE TABLE IF NOT EXISTS channel_member (
            channel_id TEXT REFERENCES channel(id) ON DELETE CASCADE,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            role TEXT CHECK(role IN ('member','moderator','owner')) DEFAULT 'member',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (channel_id, user_id)
        );
    `).run();
    db.prepare(`
        CREATE TABLE IF NOT EXISTS message (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id TEXT REFERENCES channel(id),
            sender_id TEXT REFERENCES users(id),
            content TEXT NOT NULL,
            type TEXT DEFAULT 'text',
            metadata TEXT DEFAULT NULL,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME DEFAULT NULL
        );
    `).run();
    db.prepare(`
        CREATE TABLE IF NOT EXISTS blocked_user (
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            blocked_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, blocked_user_id)
        );
    `).run();
    db.prepare(`
        CREATE TABLE IF NOT EXISTS friendship (
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            friend_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, friend_id)
        );
    `).run();
    db.prepare(`
        CREATE TABLE IF NOT EXISTS game_invitation (
            id TEXT PRIMARY KEY,
            channel_id TEXT REFERENCES channel(id),
            message_id INTEGER REFERENCES message(id),
            inviter_id TEXT REFERENCES users(id),
            invited_id TEXT REFERENCES users(id),
            status TEXT CHECK(status IN ('pending','accepted','declined','expired')),
            game_room_id TEXT DEFAULT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_invitation_status ON game_invitation(status)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_invitation_invited ON game_invitation(invited_id)`).run();

    /* MIGRATIONS */

    try {
        db.prepare(`ALTER TABLE message ADD COLUMN type TEXT DEFAULT 'text'`).run();
    } catch (error: any) {
        if (!error.message?.includes('duplicate column name')) {
            console.error('[DATABASE] Error adding type column:', error);
        }
    }

    try {
        db.prepare(`ALTER TABLE message ADD COLUMN metadata TEXT DEFAULT NULL`).run();
    } catch (error: any) {
        if (!error.message?.includes('duplicate column name')) {
            console.error('[DATABASE] Error adding metadata column:', error);
        }
    }

    try {
        db.prepare(`ALTER TABLE users ADD COLUMN twoAuth_secret TEXT DEFAULT NULL`).run();
    } catch (error: any) {
        if (!error.message?.includes('duplicate column name')) {
            console.error('[DATABASE] Error adding twoAuth_secret column:', error);
        }
    }

    try {
        db.prepare(`ALTER TABLE users ADD COLUMN twoAuth_enabled INTEGER DEFAULT 0`).run();
    } catch (error: any) {
        if (!error.message?.includes('duplicate column name')) {
            console.error('[DATABASE] Error adding twoAuth_enabled column:', error);
        }
    }

    try {
        db.prepare(`ALTER TABLE match ADD COLUMN match_type TEXT DEFAULT 'pvp'`).run();
    } catch (error: any) {
        if (!error.message?.includes('duplicate column name')) {
            console.error('[DATABASE] Error adding match_type column:', error);
        }
    }

    try {
        const testStmt = db.prepare(`INSERT INTO match (player1_id, player2_id, score1, score2, match_type) VALUES ('test_migration_check', 'AI_test', 0, 0, 'ai')`);
        try {
            testStmt.run();
            db.prepare(`DELETE FROM match WHERE player1_id = 'test_migration_check'`).run();
            console.log('[DATABASE] Match table already supports non-user IDs');
        } catch (fkError: any) {
            if (fkError.message?.includes('FOREIGN KEY constraint failed')) {
                console.log('[DATABASE] Migrating match table to remove FK constraints...');

                db.prepare(`
                    CREATE TABLE IF NOT EXISTS match_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        tournament_id TEXT DEFAULT NULL,
                        score1 INTEGER,
                        score2 INTEGER,
                        player1_id TEXT,
                        player2_id TEXT,
                        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        match_type TEXT DEFAULT 'pvp'
                    )
                `).run();

                db.prepare(`
                    INSERT INTO match_new (id, tournament_id, score1, score2, player1_id, player2_id, played_at, match_type)
                    SELECT id, tournament_id, score1, score2, player1_id, player2_id, played_at, match_type FROM match
                `).run();

                db.prepare(`DROP TABLE match`).run();
                db.prepare(`ALTER TABLE match_new RENAME TO match`).run();

                console.log('[DATABASE] Match table migration completed - FK constraints removed');
            } else {
                throw fkError;
            }
        }
    } catch (error: any) {
        console.error('[DATABASE] Error during match table migration:', error);
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS tournament (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status TEXT CHECK(status IN ('waiting','in_progress','finished')) NOT NULL,
            max_players INTEGER NOT NULL,
            created_by TEXT,
            winner_id TEXT,
            winner_name TEXT,
            data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            finished_at DATETIME DEFAULT NULL
        )
    `).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tournament_status ON tournament(status)`).run();

    return db;
}

/* USER METHODS */

export function getUser(req, reply): User[] {
    const query = (req.query || req.params || {}) as User & { ft_id?: string };

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
    if (query.ft_id) {
        conditions.push('ft_id = ?');
        values.push(query.ft_id);
    }

    const whereClause = conditions.length ? conditions.join(' AND ') : '1=1';

    const users = db.prepare(
        `SELECT id, name, email, avatar, ft_id, twoAuth_secret, twoAuth_enabled FROM users WHERE ${whereClause}`
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
    if (req.body.ft_id !== undefined) {
        fields.push('ft_id = ?');
        values.push(req.body.ft_id);
    }
    if (req.body._allow2FAUpdate) {
        if (req.body.twoAuth_secret !== undefined) {
            fields.push('twoAuth_secret = ?');
            values.push(req.body.twoAuth_secret);
            console.log('[DATABASE] Updating twoAuth_secret');
        }
        if (req.body.twoAuth_enabled !== undefined) {
            fields.push('twoAuth_enabled = ?');
            values.push(req.body.twoAuth_enabled ? 1 : 0);
            console.log('[DATABASE] Updating twoAuth_enabled to:', req.body.twoAuth_enabled ? 1 : 0);
        }
    }

    if (fields.length === 0) {
        return "no fields to update";
    }

    values.push(req.body.id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    console.log('[DATABASE] SQL:', sql, 'for user:', req.body.id);
    const request = db.prepare(sql);
    const result = request.run(...values);

    console.log('[DATABASE] Update result - changes:', result.changes);
    if (result.changes === 0)
        return "no changes made";
    return true;
}

export function createUser(req, reply): string | null {
    const request = db.prepare('INSERT INTO users (id, name, email, password_hash, avatar, ft_id) VALUES (?, ?, ?, ?, ?, ?)');
    const result = request.run(
        req.body.id,
        req.body.name,
        req.body.email,
        req.body.password || null,
        req.body.avatar,
        req.body.ft_id || null
    );
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

/* CHANNEL METHODS */

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
      `SELECT id, channel_id, sender_id, content, type, metadata, sent_at, read_at FROM message
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

export function postChannel(req: FastifyRequest, reply: FastifyReply) {
    const channel = req.body as Channel;
    const request = db.prepare('INSERT INTO channel (id, name, type, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
    const result = request.run(channel.id, channel.name, channel.type, channel.created_by, channel.created_at);
    if (result.changes === 0)
        return undefined
    return channel.id
}

export function putChannelName(req: FastifyRequest, reply: FastifyReply) {
    const request = db.prepare('UPDATE channel SET name = ? WHERE id = ?')
    const result = request.run(req.body.name, req.body.id);
    if (result.changes === 0)
        return ('No Change made')
    return String(result.lastInsertRowid)
}

/* MESSAGE METHODS */

export function getMessage(req, reply) {
    const query = req.query;
    const messages = db.prepare(`
        SELECT *
        FROM message
        WHERE channel_id = ?
        AND id < ?
        ORDER BY sent_at DESC, id DESC
        LIMIT 100;
    `).all(
      query.channel_id,
      query.id
    ) as Message [];
    return messages;
}

export function postMessage( req, reply ) {
    const message = req.body;
    const request = db.prepare(`
        INSERT INTO message (channel_id, sender_id, content, type, metadata, sent_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `)
    const result = request.run(
        message.channel_id,
        message.sender_id,
        message.content,
        message.type || 'text',
        message.metadata || null,
        message.sent_at
    )
    if (result.changes === 0)
        return false
    return String(result.lastInsertRowid)
}

export function putMessage( req, reply ) {
    const message = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (message.content !== undefined) {
        updates.push('content = ?');
        values.push(message.content);
    }

    if (message.read_at !== undefined) {
        updates.push('read_at = ?');
        values.push(message.read_at);
    }

    if (message.type !== undefined) {
        updates.push('type = ?');
        values.push(message.type);
    }

    if (message.metadata !== undefined) {
        updates.push('metadata = ?');
        values.push(message.metadata);
    }

    if (updates.length === 0) {
        return false;
    }

    values.push(message.id);

    const request = db.prepare(`UPDATE message SET ${updates.join(', ')} WHERE id = ?`)
    const result = request.run(...values)
    if (result.changes === 0)
        return false
    return String(result.lastInsertRowid)
}

/* CHANNEL MEMBER METHODS */

export function postChannelMember( req: FastifyRequest, reply: FastifyReply ) {
    const { channel_id, user_id, role } = req.body as any;
    const request = db.prepare(`INSERT INTO channel_member (channel_id, user_id, role) VALUES (?, ?, ?)`)
    const result = request.run(channel_id, user_id, role || 'member')
    if (result.changes === 0)
        return false
    return true
}

export function deleteChannelMember( req: FastifyRequest, reply: FastifyReply ) {
    const { channel_id, user_id } = req.body as any;
    const request = db.prepare(`DELETE FROM channel_member WHERE channel_id = ? AND user_id = ?`)
    const result = request.run(channel_id, user_id)
    if (result.changes === 0)
        return false
    return true
}

/* BLOCKED USER METHODS */

export function getBlockedUsers( req: FastifyRequest, reply: FastifyReply ) {
    const user_id = (req.query as any).user_id;
    const blocked_user_id = (req.query as any).blocked_user_id;

    if (blocked_user_id && !user_id) {
        const blockers = db.prepare(
            `SELECT user_id FROM blocked_user WHERE blocked_user_id = ?`
        ).all(blocked_user_id) as {user_id: string}[];
        return blockers.map(b => b.user_id);
    }

    const blocked = db.prepare(
        `SELECT blocked_user_id FROM blocked_user WHERE user_id = ?`
    ).all(user_id) as {blocked_user_id: string}[];
    return blocked.map(b => b.blocked_user_id);
}

export function postBlockUser( req: FastifyRequest, reply: FastifyReply ) {
    const { user_id, blocked_user_id } = req.body as any;
    const request = db.prepare(`INSERT OR IGNORE INTO blocked_user (user_id, blocked_user_id) VALUES (?, ?)`)
    const result = request.run(user_id, blocked_user_id)
    return result.changes > 0
}

export function deleteBlockUser( req: FastifyRequest, reply: FastifyReply ) {
    const { user_id, blocked_user_id } = req.body as any;
    const request = db.prepare(`DELETE FROM blocked_user WHERE user_id = ? AND blocked_user_id = ?`)
    const result = request.run(user_id, blocked_user_id)
    return result.changes > 0
}

/* USER CHANNELS METHODS */

export function getUserChannels( req: FastifyRequest, reply: FastifyReply ) {
    const user_id = (req.query as any).user_id;

    const channelIds = db.prepare(
        `SELECT channel_id FROM channel_member WHERE user_id = ?`
    ).all(user_id) as {channel_id: number}[];

    if (!channelIds || channelIds.length === 0) {
        return [];
    }

    const channels: Channel[] = [];
    for (const {channel_id} of channelIds) {
        const channel = db.prepare(
            `SELECT id, name, type, created_by, created_at FROM channel WHERE id = ?`
        ).get(channel_id) as Channel | null;

        if (channel) {
            channel.messages = db.prepare(
                `SELECT id, channel_id, sender_id, content, type, metadata, sent_at, read_at FROM message
                 WHERE channel_id = ?
                 ORDER BY sent_at ASC
                 LIMIT 100`
            ).all(channel_id) as Message[];

            const members = db.prepare(
                `SELECT user_id FROM channel_member WHERE channel_id = ?`
            ).all(channel_id) as {user_id: string}[];
            channel.members = members.map(m => m.user_id);

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

export function findDMChannel( req: FastifyRequest, reply: FastifyReply ) {
    const { user1_id, user2_id } = req.query as any;

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

/* FRIENDS METHODS */

export function getFriends( req: FastifyRequest, reply: FastifyReply ) {
    const { user_id } = req.query as any;

    if (!user_id) {
        return reply.send([]);
    }

    const friendIds = db.prepare(
        `SELECT friend_id FROM friendship WHERE user_id = ?`
    ).all(user_id) as {friend_id: string}[];

    if (!friendIds || friendIds.length === 0) {
        return reply.send([]);
    }

    const friends = friendIds.map(({friend_id}) => {
        const friend = db.prepare(
            `SELECT id, name, avatar FROM users WHERE id = ?`
        ).get(friend_id) as {id: string, name: string, avatar: string | null} | undefined;

        if (friend) {
            return {
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar,
                status: 'offline'
            };
        }
        return null;
    }).filter(f => f !== null);

    return reply.send(friends);
}

export function postFriend( req: FastifyRequest, reply: FastifyReply ) {
    const { user_id, friend_id } = req.body as any;

    if (!user_id || !friend_id) {
        return false;
    }

    if (user_id === friend_id) {
        return false;
    }

    try {
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

export function deleteFriend( req: FastifyRequest, reply: FastifyReply ) {
    const { user_id, friend_id } = req.body as any;

    if (!user_id || !friend_id) {
        return false;
    }

    try {
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

/* MARK READ */

export function markChannelRead( req: FastifyRequest, reply: FastifyReply ) {
    try {
        const { channel_id, user_id } = req.body as { channel_id: number, user_id: string };
        const now = new Date().toISOString();

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

/* GAME INVITATION METHODS */

export function getGameInvitation(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = req.query as { id: string };

        if (!id) {
            return reply.status(400).send({ error: 'id is required' });
        }

        const stmt = db.prepare(`
            SELECT * FROM game_invitation WHERE id = ?
        `);

        const result = stmt.get(id);
        return reply.status(200).send(result);
    } catch (error: any) {
        console.error('[DATABASE] getGameInvitation error:', error);
        return reply.status(500).send({ error: 'Failed to get game invitation' });
    }
}

export function postGameInvitation(req: FastifyRequest, reply: FastifyReply) {
    try {
        const {
            id,
            channel_id,
            message_id,
            inviter_id,
            invited_id,
            status,
            game_room_id,
            expires_at,
            created_at
        } = req.body as {
            id: string;
            channel_id: string;
            message_id: number;
            inviter_id: string;
            invited_id: string;
            status: string;
            game_room_id?: string;
            expires_at: string;
            created_at: string;
        };

        if (!id || !channel_id || !message_id || !inviter_id || !invited_id || !status || !expires_at) {
            return reply.status(400).send({ error: 'Missing required fields' });
        }

        const stmt = db.prepare(`
            INSERT INTO game_invitation (
                id, channel_id, message_id, inviter_id, invited_id,
                status, game_room_id, expires_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            channel_id,
            message_id,
            inviter_id,
            invited_id,
            status,
            game_room_id || null,
            expires_at,
            created_at || new Date().toISOString()
        );

        return reply.status(200).send({ id });
    } catch (error: any) {
        console.error('[DATABASE] postGameInvitation error:', error);
        return reply.status(500).send({ error: 'Failed to create game invitation' });
    }
}

export function putGameInvitation(req: FastifyRequest, reply: FastifyReply) {
    try {
        const {
            id,
            status,
            game_room_id
        } = req.body as {
            id: string;
            status?: string;
            game_room_id?: string;
        };

        if (!id) {
            return reply.status(400).send({ error: 'id is required' });
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (status) {
            updates.push('status = ?');
            values.push(status);
        }

        if (game_room_id !== undefined) {
            updates.push('game_room_id = ?');
            values.push(game_room_id);
        }

        if (updates.length === 0) {
            return reply.status(400).send({ error: 'No fields to update' });
        }

        updates.push('updated_at = ?');
        values.push(new Date().toISOString());

        values.push(id);

        const stmt = db.prepare(`
            UPDATE game_invitation
            SET ${updates.join(', ')}
            WHERE id = ?
        `);

        const result = stmt.run(...values);

        if (result.changes === 0) {
            return reply.status(404).send({ error: 'Game invitation not found' });
        }

        return reply.status(200).send({ id });
    } catch (error: any) {
        console.error('[DATABASE] putGameInvitation error:', error);
        return reply.status(500).send({ error: 'Failed to update game invitation' });
    }
}

/* MATCH METHODS */

export function postMatch(req: FastifyRequest, reply: FastifyReply) {
    try {
        const {
            player1_id,
            player2_id,
            score1,
            score2,
            tournament_id,
            match_type
        } = req.body as {
            player1_id: string;
            player2_id: string;
            score1: number;
            score2: number;
            tournament_id?: string;
            match_type?: string;
        };

        if (!player1_id || !player2_id || score1 === undefined || score2 === undefined) {
            return reply.status(400).send({ error: 'player1_id, player2_id, score1, and score2 are required' });
        }

        const stmt = db.prepare(`
            INSERT INTO match (player1_id, player2_id, score1, score2, tournament_id, match_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            player1_id,
            player2_id,
            score1,
            score2,
            tournament_id || null,
            match_type || 'pvp'
        );

        console.log(`[DATABASE] Match created: ${player1_id} vs ${player2_id}, score: ${score1}-${score2}, type: ${match_type || 'pvp'}`);
        return reply.status(200).send({ id: result.lastInsertRowid });
    } catch (error: any) {
        console.error('[DATABASE] postMatch error:', error);
        return reply.status(500).send({ error: 'Failed to create match' });
    }
}

/* STATS METHODS */

export function getUserStats(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { user_id } = req.query as { user_id: string };

        if (!user_id) {
            return reply.status(400).send({ error: 'user_id is required' });
        }

        const gamesPlayedResult = db.prepare(`
            SELECT COUNT(*) as count FROM match
            WHERE player1_id = ? OR player2_id = ?
        `).get(user_id, user_id) as { count: number };

        const gamesWonResult = db.prepare(`
            SELECT COUNT(*) as count FROM match
            WHERE (player1_id = ? AND score1 > score2)
               OR (player2_id = ? AND score2 > score1)
        `).get(user_id, user_id) as { count: number };

        let tournaments_won = 0;
        try {
            const tournamentsWonResult = db.prepare(`
                SELECT COUNT(DISTINCT tournament_id) as count FROM match
                WHERE match_type = 'tournament'
                AND tournament_id IS NOT NULL
                AND (
                    (player1_id = ? AND score1 > score2)
                    OR (player2_id = ? AND score2 > score1)
                )
            `).get(user_id, user_id) as { count: number };
            tournaments_won = tournamentsWonResult?.count || 0;
        } catch (e) {
            tournaments_won = 0;
        }

        const allUsersStats = db.prepare(`
            SELECT
                u.id,
                COUNT(m.id) as games_played,
                SUM(CASE
                    WHEN (m.player1_id = u.id AND m.score1 > m.score2)
                      OR (m.player2_id = u.id AND m.score2 > m.score1)
                    THEN 1 ELSE 0
                END) as games_won
            FROM users u
            LEFT JOIN match m ON m.player1_id = u.id OR m.player2_id = u.id
            GROUP BY u.id
            HAVING games_played > 0
            ORDER BY
                (CAST(games_won AS REAL) / games_played) DESC,
                games_won DESC,
                games_played DESC
        `).all() as { id: string; games_played: number; games_won: number }[];

        let global_rank = 0;
        for (let i = 0; i < allUsersStats.length; i++) {
            if (allUsersStats[i].id === user_id) {
                global_rank = i + 1;
                break;
            }
        }

        const games_played = gamesPlayedResult.count;
        const games_won = gamesWonResult.count;
        const games_lost = games_played - games_won;
        const win_rate = games_played > 0 ? Math.round((games_won / games_played) * 100) : 0;

        return reply.status(200).send({
            user_id,
            games_played,
            games_won,
            games_lost,
            win_rate,
            global_rank: global_rank || null,
            tournaments_won
        });
    } catch (error: any) {
        console.error('[DATABASE] getUserStats error:', error);
        return reply.status(500).send({ error: 'Failed to get user stats' });
    }
}

export function getMatchHistory(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { user_id, limit } = req.query as { user_id: string; limit?: string };

        if (!user_id) {
            return reply.status(400).send({ error: 'user_id is required' });
        }

        const maxResults = limit ? parseInt(limit, 10) : 20;

        const matches = db.prepare(`
            SELECT
                m.id,
                m.player1_id,
                m.player2_id,
                m.score1,
                m.score2,
                m.tournament_id,
                m.match_type,
                m.played_at,
                u1.name as player1_name,
                u2.name as player2_name
            FROM match m
            LEFT JOIN users u1 ON m.player1_id = u1.id
            LEFT JOIN users u2 ON m.player2_id = u2.id
            WHERE m.player1_id = ? OR m.player2_id = ?
            ORDER BY m.id DESC
            LIMIT ?
        `).all(user_id, user_id, maxResults);

        return reply.status(200).send(matches);
    } catch (error: any) {
        console.error('[DATABASE] getMatchHistory error:', error);
        return reply.status(500).send({ error: 'Failed to get match history' });
    }
}

/* TOURNAMENT METHODS */

export interface TournamentRecord {
    id: string;
    name: string;
    status: 'waiting' | 'in_progress' | 'finished';
    max_players: number;
    created_by: string | null;
    winner_id: string | null;
    winner_name: string | null;
    data: string;
    created_at: string;
    finished_at: string | null;
}

export function saveTournament(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = req.body as {
            id: string;
            name: string;
            status: 'waiting' | 'in_progress' | 'finished';
            max_players: number;
            created_by?: string;
            winner_id?: string;
            winner_name?: string;
            data: string;
        };

        const { id, name, status, max_players, created_by, winner_id, winner_name, data } = body;

        if (!id || !name || !status || !max_players || !data) {
            return reply.status(400).send({ error: 'Missing required fields' });
        }

        const stmt = db.prepare(`
            INSERT INTO tournament (id, name, status, max_players, created_by, winner_id, winner_name, data, finished_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                winner_id = excluded.winner_id,
                winner_name = excluded.winner_name,
                data = excluded.data,
                finished_at = excluded.finished_at
        `);

        const finished_at = status === 'finished' ? new Date().toISOString() : null;
        stmt.run(id, name, status, max_players, created_by || null, winner_id || null, winner_name || null, data, finished_at);

        return reply.status(200).send({ success: true, id });
    } catch (error: any) {
        console.error('[DATABASE] saveTournament error:', error);
        return reply.status(500).send({ error: 'Failed to save tournament' });
    }
}

export function getTournaments(req: FastifyRequest, reply: FastifyReply) {
    try {
        const query = req.query as { status?: string };

        let sql = 'SELECT * FROM tournament';
        const values: string[] = [];

        if (query.status) {
            sql += ' WHERE status = ?';
            values.push(query.status);
        }

        sql += ' ORDER BY created_at DESC';

        const stmt = db.prepare(sql);
        const tournaments = values.length > 0 ? stmt.all(...values) : stmt.all();

        return reply.status(200).send(tournaments);
    } catch (error: any) {
        console.error('[DATABASE] getTournaments error:', error);
        return reply.status(500).send({ error: 'Failed to get tournaments' });
    }
}

export function getTournamentById(req: FastifyRequest, reply: FastifyReply) {
    try {
        const params = req.params as { id: string };

        if (!params.id) {
            return reply.status(400).send({ error: 'Tournament ID required' });
        }

        const stmt = db.prepare('SELECT * FROM tournament WHERE id = ?');
        const tournament = stmt.get(params.id);

        if (!tournament) {
            return reply.status(404).send({ error: 'Tournament not found' });
        }

        return reply.status(200).send(tournament);
    } catch (error: any) {
        console.error('[DATABASE] getTournamentById error:', error);
        return reply.status(500).send({ error: 'Failed to get tournament' });
    }
}

export function deleteTournament(req: FastifyRequest, reply: FastifyReply) {
    try {
        const params = req.params as { id: string };

        if (!params.id) {
            return reply.status(400).send({ error: 'Tournament ID required' });
        }

        const stmt = db.prepare('DELETE FROM tournament WHERE id = ?');
        const result = stmt.run(params.id);

        if (result.changes === 0) {
            return reply.status(404).send({ error: 'Tournament not found' });
        }

        return reply.status(200).send({ success: true });
    } catch (error: any) {
        console.error('[DATABASE] deleteTournament error:', error);
        return reply.status(500).send({ error: 'Failed to delete tournament' });
    }
}
