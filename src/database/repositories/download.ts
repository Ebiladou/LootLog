import Database from "better-sqlite3";

import { Download, DownloadStatus } from "../models/download";

export class DownloadRepository {
  private readonly database: Database.Database;

  constructor(database: Database.Database) {
    this.database = database;
  }

  create(download: Download): void {
    const statement = this.database.prepare(`
      INSERT INTO downloads (
        id,
        url,
        name,
        status,
        created_at
      )
      VALUES (
        @id,
        @url,
        @name,
        @status,
        @createdAt
      )
    `);

    statement.run({
      id: download.id,
      url: download.url,
      name: download.name,
      status: download.status,
      createdAt: download.createdAt.toISOString(),
    });
  }

  findById(id: string): Download | null {
    const statement = this.database.prepare(`
      SELECT
        id,
        url,
        name,
        status,
        created_at
      FROM downloads
      WHERE id = ?
    `);

    const row = statement.get(id) as DownloadRow | undefined;

    if (!row) {
      return null;
    }

    return this.toDownload(row);
  }

  findAll(): Download[] {
    const statement = this.database.prepare(`
      SELECT
        id,
        url,
        name,
        status,
        created_at
      FROM downloads
      ORDER BY created_at DESC
    `);

    const rows = statement.all() as DownloadRow[];

    return rows.map((row) => this.toDownload(row));
  }

  findByStatus(status: DownloadStatus): Download[] {
    const statement = this.database.prepare(`
      SELECT
        id,
        url,
        name,
        status,
        created_at
      FROM downloads
      WHERE status = ?
      ORDER BY created_at DESC
    `);

    const rows = statement.all(status) as DownloadRow[];

    return rows.map((row) => this.toDownload(row));
  }

  findByIdAndStatus(id: string, status: DownloadStatus): Download | undefined {
    const statement = this.database.prepare(`
      SELECT
        id,
        url,
        name,
        status,
        created_at
      FROM downloads
      WHERE id = ? AND status = ?
    `);

    const row = statement.get(id, status) as DownloadRow | undefined;

    return row ? this.toDownload(row) : undefined;
}

  updateStatus(
    id: string,
    status: DownloadStatus
  ): void {
    const statement = this.database.prepare(`
      UPDATE downloads
      SET status = ?
      WHERE id = ?
    `);

    statement.run(status, id);
  }

  private toDownload(row: DownloadRow): Download {
    return {
      id: row.id,
      url: row.url,
      name: row.name,
      status: row.status as DownloadStatus,
      createdAt: new Date(row.created_at),
    };
  }
}

interface DownloadRow {
  id: string;
  url: string;
  name: string;
  status: string;
  created_at: string;
}