const sqlite3 = require('sqlite3').verbose();

// For Render (temporary storage)
const db = new sqlite3.Database('./school.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            sender_name TEXT,
            narration TEXT,
            transaction_time TEXT,
            source_type TEXT,
            source_id TEXT,
            fingerprint TEXT UNIQUE,
            raw_payload TEXT,
            status TEXT DEFAULT 'unmatched',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT,
            class TEXT,
            aliases TEXT
        )
    `);
});

module.exports = db;
