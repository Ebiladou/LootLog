
import { getWorkerPid, isProcessRunning } from "../../worker/process";

export function statusCommand(): void {
  const pid = getWorkerPid();

  if (pid === null) {
    console.log("LootLog worker is not running.");
    return;
  }

  if (!isProcessRunning(pid)) {
    console.log("LootLog worker is not running (stale PID file).");
    return;
  }

  console.log(`LootLog worker is running (PID: ${pid}).`);
}
