import fs from "node:fs";

import { WORKER_PID_FILE } from "../core/path";

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ESRCH") {
      return false;
    }

    if (code === "EPERM") {
      return true;
    }

    throw error;
  }
}

export function getWorkerPid(): number | null {
  try {
    const pid = Number(fs.readFileSync(WORKER_PID_FILE, "utf-8").trim());

    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export function claimWorkerPid(): void {
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

    const storedPid = getWorkerPid();

    if (storedPid !== null && isProcessRunning(storedPid)) {
      throw new Error(`LootLog worker is already running (PID: ${storedPid}).`);
    }

    const currentPid = getWorkerPid();

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

export function removeWorkerPid(): void {
  try {
    if (getWorkerPid() === process.pid) {
      fs.unlinkSync(WORKER_PID_FILE);
    }
  } catch (error) {
    console.error("Failed to remove worker PID file:", error);
  }
}
