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
      job_type TEXT DEFAULT '',
      apply_url TEXT DEFAULT '',
      description TEXT DEFAULT '',
      posted_at TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Откат/миграция: добавляем колонку, если ее нет. sql.js выбрасывает ошибку, если колонка уже существует.
  try { db.run("ALTER TABLE vacancies ADD COLUMN job_type TEXT DEFAULT ''"); } catch (e) {}
  try { db.run("ALTER TABLE vacancies ADD COLUMN apply_url TEXT DEFAULT ''"); } catch (e) {}
  try { db.run("ALTER TABLE vacancies ADD COLUMN description TEXT DEFAULT ''"); } catch (e) {}
  try { db.run("ALTER TABLE vacancies ADD COLUMN posted_at TEXT DEFAULT ''"); } catch (e) {}

  save();
  return db;
}

function save() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

module.exports = { getDb, save };
