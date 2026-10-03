import { DownloadManager } from "../../config/download";

export async function cancelCommand(
  id: string,
  downloadManager: DownloadManager,
): Promise<void> {
  try {
    downloadManager.cancel(id);
    console.log(`Download ${id} cancelled.`);
  } catch (error) {
    console.error(`Error: Download cancel failed: ${error}`);
  }
}
