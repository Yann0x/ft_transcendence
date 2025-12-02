import Database from 'better-sqlite3';
import *  as User from './shared/types/user'

const structure_db: Record<string, string> = {
    users: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    `,
};

let db = Database.Database


export function initDatabase(db_path: string = '/data/database.db'): Database.Database {
    db = new Database(db_path);
    // Creation des tables si elles n'existent pas
    for (const [table, schema] of Object.entries(structure_db)) {
        const sql = `CREATE TABLE IF NOT EXISTS ${table} (${schema})`;
        db.exec(sql);
    }
    return db;
}

export function emailExists(email: string): boolean {
    const user = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email) as string | undefined;
    if (user) 
        return true;
    return false;
}

export function insert(table: string, data: User.UserRegister): Database.RunResult {
    const keys = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;
    const stmt = db.prepare(sql);
    const info = stmt.run(...values);
    return info;
}

export function close (): void {
    db.close();
}