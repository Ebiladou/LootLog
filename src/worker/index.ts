import fs from "node:fs";

import { createDatabase } from "../database/db";
import { DownloadRepository } from "../database/repositories/download";
import { YtDlpEngine } from "../config/yt-dlp";
import { DownloadManager } from "../config/download";
import { ensureDirs, WORKER_PID_FILE } from "../config/path";
import { DownloadQueue } from "../queue/queue";
import { DownloadWorker } from "./worker";

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") {
      return false;
    }

    if ((error as NodeJS.ErrnoException).code === "EPERM") {
      return true;
    }

    throw error;
  }
}

function claimWorkerPid(): void {
  while (true) {
    try {
      fs.writeFileSync(WORKER_PID_FILE, String(process.pid), {
        encoding: "utf-8",
        flag: "wx",
      });

      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }

    const storedPid = Number(fs.readFileSync(WORKER_PID_FILE, "utf-8").trim());

    if (Number.isInteger(storedPid) && storedPid > 0) {
      if (isProcessRunning(storedPid)) {
        throw new Error(
          `LootLog worker is already running (PID: ${storedPid}).`,
        );
      }
    }

    const currentPid = Number(fs.readFileSync(WORKER_PID_FILE, "utf-8").trim());

    if (currentPid !== storedPid) {
      continue;
    }

    try {
      fs.unlinkSync(WORKER_PID_FILE);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }
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
