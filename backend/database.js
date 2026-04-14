const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'jobs.db');

let db;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS vacancies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      company TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      applied INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'saved',
      url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  save();
  return db;
}

function save() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

module.exports = { getDb, save };
