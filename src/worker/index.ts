import fs from "node:fs";

import { createDatabase } from "../database/db";
import { DownloadRepository } from "../database/repositories/download";
import { YtDlpEngine } from "../config/yt-dlp";
import { DownloadManager } from "../config/download";
import { ensureDirs, WORKER_PID_FILE } from "../config/path";
import { DownloadQueue } from "../queue/queue";
import { DownloadWorker } from "./worker";

function writeWorkerPid(): void {
  fs.writeFileSync(WORKER_PID_FILE, String(process.pid), "utf-8");
}

function removeWorkerPid(): void {
  try {
    if (!fs.existsSync(WORKER_PID_FILE)) {
      return;
    }

    const storedPid = Number(fs.readFileSync(WORKER_PID_FILE, "utf-8").trim());

    if (storedPid === process.pid) {
      fs.unlinkSync(WORKER_PID_FILE);
    }
  } catch (error) {
    console.error("Failed to remove worker PID file:", error);
  }
}

async function main(): Promise<void> {
  ensureDirs();

  const database = createDatabase();

  try {
    const downloadRepository = new DownloadRepository(database);
    const downloadEngine = new YtDlpEngine();

    const downloadManager = new DownloadManager(
      downloadEngine,
      downloadRepository,
    );

    const downloadQueue = new DownloadQueue();

    const worker = new DownloadWorker(
      downloadQueue,
      downloadRepository,
      downloadManager,
    );

    let stopping = false;

    const shutdown = async (): Promise<void> => {
      if (stopping) {
        return;
      }

      stopping = true;

      try {
        await worker.stop();
      } catch (error) {
        console.error("Error while stopping worker:", error);
        process.exitCode = 1;
      } finally {
        removeWorkerPid();
        database.close();
      }
    };

    process.on("SIGINT", () => {
      void shutdown();
    });

    process.on("SIGTERM", () => {
      void shutdown();
    });

    worker.start();
    writeWorkerPid();

    console.log(`LootLog worker started (PID: ${process.pid})`);
  } catch (error) {
    database.close();
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error("Failed to start LootLog worker:", error);
  process.exitCode = 1;
});
