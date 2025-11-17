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
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trashed_at TEXT
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
    notes TEXT,
    date TEXT,
    time TEXT,
    category TEXT NOT NULL DEFAULT 'routine',
    customer TEXT,
    contact TEXT,
    vehicle TEXT,
    license TEXT,
    hu_au INTEGER NOT NULL DEFAULT 0,
    car_care INTEGER NOT NULL DEFAULT 0,
    storage INTEGER NOT NULL DEFAULT 0,
    rental_car INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trashed_at TEXT
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
ensureJobColumn('trashed_at', 'ALTER TABLE jobs ADD COLUMN trashed_at TEXT');

const clipboardColumns = new Set(
  db.prepare('PRAGMA table_info(clipboard)').all().map((column) => column.name),
);

const ensureClipboardColumn = (name, statement) => {
  if (clipboardColumns.has(name)) return;
  try {
    db.prepare(statement).run();
    clipboardColumns.add(name);
  } catch (error) {
    if (!/duplicate column name/i.test(error.message)) {
      throw error;
    }
  }
};

ensureClipboardColumn('notes', 'ALTER TABLE clipboard ADD COLUMN notes TEXT');
ensureClipboardColumn('date', 'ALTER TABLE clipboard ADD COLUMN date TEXT');
ensureClipboardColumn('time', 'ALTER TABLE clipboard ADD COLUMN time TEXT');
ensureClipboardColumn(
  'category',
  "ALTER TABLE clipboard ADD COLUMN category TEXT NOT NULL DEFAULT 'routine'",
);
ensureClipboardColumn('customer', 'ALTER TABLE clipboard ADD COLUMN customer TEXT');
ensureClipboardColumn('contact', 'ALTER TABLE clipboard ADD COLUMN contact TEXT');
ensureClipboardColumn('vehicle', 'ALTER TABLE clipboard ADD COLUMN vehicle TEXT');
ensureClipboardColumn('license', 'ALTER TABLE clipboard ADD COLUMN license TEXT');
ensureClipboardColumn('hu_au', 'ALTER TABLE clipboard ADD COLUMN hu_au INTEGER NOT NULL DEFAULT 0');
ensureClipboardColumn(
  'car_care',
  'ALTER TABLE clipboard ADD COLUMN car_care INTEGER NOT NULL DEFAULT 0',
);
ensureClipboardColumn('storage', 'ALTER TABLE clipboard ADD COLUMN storage INTEGER NOT NULL DEFAULT 0');
ensureClipboardColumn(
  'rental_car',
  'ALTER TABLE clipboard ADD COLUMN rental_car INTEGER NOT NULL DEFAULT 0',
);
ensureClipboardColumn('trashed_at', 'ALTER TABLE clipboard ADD COLUMN trashed_at TEXT');

module.exports = db;
