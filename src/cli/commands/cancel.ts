import { DownloadManager } from "../../config/download";

export async function cancelCommand(
  id: string,
  downloadManager: DownloadManager,
): Promise<void> {
  try {
    downloadManager.cancel(id);
  } catch (error) {
    console.error(`Error: Download cancel failed: ${error}`);
  }
}
