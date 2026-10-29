import { DownloadWorker } from "../../worker/worker";

export async function stopWorker(worker: DownloadWorker): Promise<void> {
  try {
    worker.stop();
  } catch (error) {
    console.log(`Error: Failed to stop download worker: ${error}`);
  }
}
