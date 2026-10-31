import { createDatabase } from "../database/db";
import { DownloadRepository } from "../database/repositories/download";
import { YtDlpEngine } from "../core/yt-dlp";
import { DownloadManager } from "../core/download";
import { ConnectivityMonitor } from "../core/network";
import { ensureDirs } from "../core/path";
import { DownloadQueue } from "./queue";
import { DownloadWorker } from "./worker";
import { claimWorkerPid, removeWorkerPid } from "./process";
import { loadConfig } from "../core/config";

async function main(): Promise<void> {
  ensureDirs();

  const database = createDatabase();

  let connectivityMonitor: ConnectivityMonitor | null = null;

  try {
    const downloadRepository = new DownloadRepository(database);

    const config = loadConfig();

    const downloadEngine = new YtDlpEngine({
      cookiesFromBrowser:
        config.cookies.enabled && config.cookies.browser
          ? config.cookies.browser
          : undefined,
    });

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

    connectivityMonitor = new ConnectivityMonitor((connected) => {
      downloadManager.setNetworkConnected(connected);
    });

    claimWorkerPid();

    let stopping = false;

    const shutdown = async (): Promise<void> => {
      if (stopping) return;
      stopping = true;

      try {
        await worker.stop();
      } catch (error) {
        console.error("Error while stopping worker:", error);
        process.exitCode = 1;
      } finally {
        try {
          connectivityMonitor?.stop();
        } catch (error) {
          console.error("Error while stopping connectivity monitor:", error);
          process.exitCode = 1;
        }

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

    connectivityMonitor.start();
    worker.start();
  } catch (error) {
    connectivityMonitor?.stop();
    removeWorkerPid();
    database.close();
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error("Failed to start LootLog worker:", error);
  process.exitCode = 1;
});
