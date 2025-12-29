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
		CREATE TABLE IF NOT EXISTS friendships (
		user1 INTEGER NOT NULL,
		user2 INTEGER NOT NULL,
		status TEXT CHECK(status IN ('pending', 'accepted')) DEFAULT 'pending',
		initiated_by INTEGER NOT NULL,
		since DATETIME DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY(user1, user2),
		FOREIGN KEY(user1) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(user2) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY(initiated_by) REFERENCES users(id) ON DELETE CASCADE,
		CHECK(user1 <> user2),
		CHECK(user1 < user2)
		);
    `).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_friend_user1 ON friendships(user1);`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_friend_user2 ON friendships(user2);`).run();
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
            PRIMARY KEY (channel_id, member1_id, member2_id)
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

export function putUserFriend(req, reply): boolean {
    const { user_id, friend_id } = req.body;

    // Ensure user1 < user2 to respect the CHECK constraint
    const user1 = parseInt(user_id) < parseInt(friend_id) ? user_id : friend_id;
    const user2 = parseInt(user_id) < parseInt(friend_id) ? friend_id : user_id;

    try {
        // Check if friendship already exists
        const existing = db.prepare(
            `SELECT status, initiated_by FROM friendships WHERE user1 = ? AND user2 = ?`
        ).get(user1, user2) as { status: string; initiated_by: number } | undefined;

        if (existing) {
            // If friendship exists and is pending and was initiated by the OTHER user -> accept it
            if (existing.status === 'pending' && String(existing.initiated_by) !== user_id) {
                const updateRequest = db.prepare(
                    `UPDATE friendships SET status = 'accepted' WHERE user1 = ? AND user2 = ?`
                );
                const result = updateRequest.run(user1, user2);
                return result.changes > 0;
            }
            // Otherwise, friendship already exists (either accepted or user initiated it)
            return false;
        }

        // No existing friendship -> create new pending friendship
        const insertRequest = db.prepare(
            `INSERT INTO friendships (user1, user2, status, initiated_by) VALUES (?, ?, 'pending', ?)`
        );
        const result = insertRequest.run(user1, user2, user_id);

        if (result.changes === 0) {
            return false;
        }
        return true;
    } catch (error) {
        // Handle constraint violations
        console.error('Error adding friend:', error);
        return false;
    }
}

export function getUserFriends(req, reply) {
    const query = req.query;
    const userId = query.user_id;

    // Get all friendships where the user is either user1 or user2
    // Return friend_id, status, initiated_by, and since timestamp
    const friendships = db.prepare(
        `SELECT
            CASE
                WHEN user1 = ? THEN user2
                ELSE user1
            END as friend_id,
            status,
            initiated_by,
            since
        FROM friendships
        WHERE user1 = ? OR user2 = ?`
    ).all(userId, userId, userId) as { friend_id: number; status: string; initiated_by: number; since: string }[];

    if (!friendships || friendships.length === 0) {
        return [];
    }

    // Get user details for all friends and combine with friendship metadata
    const friendIds = friendships.map(f => f.friend_id);
    const placeholders = friendIds.map(() => '?').join(',');

    const users = db.prepare(
        `SELECT id, name, avatar FROM users WHERE id IN (${placeholders})`
    ).all(...friendIds) as { id: string; name: string; avatar: string }[];

    // Combine user data with friendship metadata
    const result = friendships.map(friendship => {
        const user = users.find(u => u.id === String(friendship.friend_id));
        return {
            id: user?.id,
            name: user?.name,
            avatar: user?.avatar,
            status: friendship.status,
            initiated_by: String(friendship.initiated_by),
            since: friendship.since
        };
    });

    return result;
}

export function deleteUserFriend(req, reply): boolean {
    const { user_id, friend_id } = req.body;

    // Ensure user1 < user2 to match the table structure
    const user1 = parseInt(user_id) < parseInt(friend_id) ? user_id : friend_id;
    const user2 = parseInt(user_id) < parseInt(friend_id) ? friend_id : user_id;

    try {
        // Delete the friendship regardless of status (pending or accepted)
        // Both users can cancel/remove: sender can cancel their request, REQUESTr can reject it
        const request = db.prepare(
            `DELETE FROM friendships WHERE user1 = ? AND user2 = ?`
        );
        const result = request.run(user1, user2);

        if (result.changes === 0) {
            console.log(`No friendship found between ${user1} and ${user2}`);
            return false;
        }
        console.log(`Friendship removed between ${user1} and ${user2}`);
        return true;
    } catch (error) {
        console.error('Error removing friend:', error);
        return false;
    }
}
