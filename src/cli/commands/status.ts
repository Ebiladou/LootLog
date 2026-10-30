import fs from "node:fs";

import { WORKER_PID_FILE } from "../../config/path";

export function statusCommand(): void {
  if (!fs.existsSync(WORKER_PID_FILE)) {
    console.log("LootLog worker is not running.");
    return;
  }

  const pid = Number(fs.readFileSync(WORKER_PID_FILE, "utf-8").trim());

  if (!Number.isInteger(pid) || pid <= 0) {
    console.log("LootLog worker is not running (invalid PID file).");
    return;
  }

  try {
    process.kill(pid, 0);
    console.log(`LootLog worker is running (PID: ${pid}).`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") {
      console.log("LootLog worker is not running (stale PID file).");
      return;
    }

    if ((error as NodeJS.ErrnoException).code === "EPERM") {
      console.log(`LootLog worker is running (PID: ${pid}).`);
      return;
    }

    throw error;
  }
}
