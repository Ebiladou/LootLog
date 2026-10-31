import { getWorkerPid, isProcessRunning } from "../../worker/process";

export function stopCommand(): void {
  const pid = getWorkerPid();

  if (pid === null) {
    console.log("LootLog worker is not running.");
    return;
  }

  if (!isProcessRunning(pid)) {
    console.log("LootLog worker is not running (stale PID file).");
    return;
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
