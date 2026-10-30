import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

import { WORKER_PID_FILE } from "../../config/path";

export function startCommand(): void {
  if (fs.existsSync(WORKER_PID_FILE)) {
    const pid = Number(fs.readFileSync(WORKER_PID_FILE, "utf-8").trim());

    if (Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(pid, 0);
        console.log(`LootLog worker is already running (PID: ${pid}).`);
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EPERM") {
          console.log(`LootLog worker is already running (PID: ${pid}).`);
          return;
        }

        if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
          throw error;
        }
      }
    }

    fs.unlinkSync(WORKER_PID_FILE);
  }

  const workerPath = path.resolve(__dirname, "../../worker/index.js");

  const child = spawn(process.execPath, [workerPath], {
    detached: true,
    stdio: "ignore",
  });

  child.on("error", (error) => {
    console.error("Failed to start LootLog worker:", error);
  });

  child.unref();

  console.log(`Starting LootLog worker (PID: ${child.pid}).`);
}
