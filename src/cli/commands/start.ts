
import { spawn } from "node:child_process";
import path from "node:path";

import { getWorkerPid, isProcessRunning } from "../../worker/process";

export function startCommand(): void {
  const pid = getWorkerPid();

  if (pid !== null && isProcessRunning(pid)) {
    console.log(`LootLog worker is already running (PID: ${pid}).`);
    return;
  }

  const workerPath = path.resolve(
    __dirname,
    "../../worker/index.js",
  );

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
