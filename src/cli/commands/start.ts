import { DownloadWorker } from "../../worker/worker";

export async function startWorker(worker: DownloadWorker): Promise<void> {
  try {
    worker.start();
  } catch (error) {
    console.log(`Error: Failed to start download worker: ${error}`);
  }
}
