import { DownloadRepository } from "../../database/repositories/download";
import { DownloadStatus } from "../../database/models/download";
import { DownloadManager } from "../../config/download";

export async function resumeCommand(
  id: string,
  repository: DownloadRepository,
  downloadManager: DownloadManager,
): Promise<void> {
  try {
    const pausedDownload = repository.findByIdAndStatus(
      id,
      DownloadStatus.PAUSED,
    );
    if (!pausedDownload) {
      console.log(`Error: No paused download found with ID: ${id}`);
      return;
    }

    await downloadManager.resume(pausedDownload);
  } catch (error) {
    console.error(`Error: Download not found ${error}`);
  }
}
