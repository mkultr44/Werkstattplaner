const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'werkstatt.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time TEXT,
    category TEXT NOT NULL CHECK (category IN ('routine', 'inspection', 'major')),
    title TEXT NOT NULL,
    customer TEXT,
    contact TEXT,
    vehicle TEXT,
    license TEXT,
    notes TEXT,
    hu_au INTEGER NOT NULL DEFAULT 0,
    car_care INTEGER NOT NULL DEFAULT 0,
    storage INTEGER NOT NULL DEFAULT 0,
    rental_car INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'done')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clipboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    notes TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const jobColumns = new Set(
  db.prepare('PRAGMA table_info(jobs)').all().map((column) => column.name),
);

const ensureJobColumn = (name, statement) => {
  if (jobColumns.has(name)) return;
  try {
    db.prepare(statement).run();
    jobColumns.add(name);
  } catch (error) {
    if (!/duplicate column name/i.test(error.message)) {
      throw error;
    }
  }
};

ensureJobColumn('hu_au', "ALTER TABLE jobs ADD COLUMN hu_au INTEGER NOT NULL DEFAULT 0");
ensureJobColumn('car_care', "ALTER TABLE jobs ADD COLUMN car_care INTEGER NOT NULL DEFAULT 0");
ensureJobColumn('storage', "ALTER TABLE jobs ADD COLUMN storage INTEGER NOT NULL DEFAULT 0");
ensureJobColumn('rental_car', "ALTER TABLE jobs ADD COLUMN rental_car INTEGER NOT NULL DEFAULT 0");

module.exports = db;
