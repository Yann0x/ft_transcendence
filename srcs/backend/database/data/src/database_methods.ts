import Database from 'better-sqlite3';
import *  as User from './shared/types/user'
import { get } from 'http';

let db: Database.Database;

export function initDatabase(db_path: string = '/data/database.db'): Database.Database {
    db = new Database(db_path);
    // Creation des tables si elles n'existent pas
    const structure_db: Record<string, string> = {
        users: `
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        `,
    };
    for (const [table, schema] of Object.entries(structure_db)) {
        const sql = `CREATE TABLE IF NOT EXISTS ${table} (${schema})`;
        db.exec(sql);
    }
    return db;
}

export function close (): void {
    db.close();
}

export function resetDatabase(): void {
    for (const table of Object.keys(structure_db)) {
        const sql = `DROP TABLE IF EXISTS ${table}`;
        db.exec(sql);
    }
    initDatabase();
}

export function getUser(params : {id?: string, email?: string, username?: string}): User.User | undefined {
    const {id, email, username} = params;
    if (!id && !email && !username)
        return undefined;
    let sql = 'SELECT * FROM users WHERE ';
    const conditions: string[] = [];
    const values: any[] = [];
    
    if (id) {
        conditions.push('id = ?');
        values.push(id);
    }
    if (email) {
        conditions.push('email = ?');
        values.push(email);
    }
    if (username) {
        conditions.push('username = ?');
        values.push(username);
    }
    
    sql += conditions.join(' OR ');
    const stmt = db.prepare(sql);
    const user = stmt.get(...values);
    return user;
}

export function emailExists(email: string): boolean {
    const user = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email) as string | undefined;
    if (user) 
        return true;
    return false;
}

export function insert(table: string, data: User.Register): User.User | unknown {
    const keys = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;
    const stmt = db.prepare(sql);
    const info = stmt.run(...values);
    console.log(`insert() : into ${table}:`, data);
    console.log('insert() Return Info:', info);
    return getUser({ email : data.email });
}