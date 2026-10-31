import { createDatabase } from "../database/db";
import { DownloadRepository } from "../database/repositories/download";
import { YtDlpEngine } from "../config/yt-dlp";
import { DownloadManager } from "../config/download";
import { ensureDirs } from "../config/path";
import { DownloadQueue } from "../queue/queue";
import { DownloadWorker } from "./worker";
import { claimWorkerPid, removeWorkerPid } from "./process";

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

    claimWorkerPid();

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
  } catch (error) {
    removeWorkerPid();
    database.close();
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error("Failed to start LootLog worker:", error);
  process.exitCode = 1;
});
