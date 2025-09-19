const path = require('path');
const Database = require('better-sqlite3');
const dotenv = require('dotenv');

dotenv.config();

let dbInstance = null;

function ensureTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      author_name TEXT,
      topic_id TEXT NOT NULL,
      sentiment_result TEXT NOT NULL DEFAULT 'pending',
      sentiment_confidence REAL NOT NULL DEFAULT 0,
      is_analyzed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_comments_created_at ON user_comments(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_comments_is_analyzed ON user_comments(is_analyzed);
  `);
}

function getDb() {
  if (dbInstance) return dbInstance;
  const dbPath = process.env.DATABASE_URL
    ? path.resolve(process.cwd(), process.env.DATABASE_URL)
    : path.resolve(process.cwd(), 'data.sqlite');
  dbInstance = new Database(dbPath);
  ensureTables(dbInstance);
  return dbInstance;
}

module.exports = { getDb };



