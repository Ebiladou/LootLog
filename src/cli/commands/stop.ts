import fs from "node:fs";

import { WORKER_PID_FILE } from "../../config/path";

export function stopCommand(): void {
  if (!fs.existsSync(WORKER_PID_FILE)) {
    console.log("LootLog worker is not running.");
    return;
  }

  const pid = Number(fs.readFileSync(WORKER_PID_FILE, "utf-8").trim());

  if (!Number.isInteger(pid) || pid <= 0) {
    console.log("Invalid worker PID file. Removing it.");

    fs.unlinkSync(WORKER_PID_FILE);
    return;
  }

  try {
    process.kill(pid, 0);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ESRCH") {
      console.log("Worker is not running. Removing stale PID file.");
      fs.unlinkSync(WORKER_PID_FILE);
      return;
    }

    if (code !== "EPERM") {
      throw error;
    }
  }

  try {
    process.kill(pid, "SIGTERM");
    console.log(`Shutdown signal sent to LootLog worker (PID: ${pid}).`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") {
      console.log("LootLog worker is already stopped.");
      return;
    }

    throw error;
  }
}
