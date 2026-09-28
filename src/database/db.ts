import Database from "better-sqlite3";
import path from "node:path";

import { LOOTLOG_DIR } from "../config/path";

const DATABASE_FILE = path.join(LOOTLOG_DIR, "database.sqlite");

export function createDatabase(): Database.Database {
  const database = new Database(DATABASE_FILE);

  database.pragma("journal_mode = WAL");

  database.exec(`
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      name TEXT NOT NULL,
      output_directory TEXT NOT NULL,
      audio_only INTEGER NOT NULL,
      playlist INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  return database;
}
