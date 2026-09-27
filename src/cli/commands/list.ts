import { DownloadRepository } from "../../database/repositories/download";
import { DownloadStatus } from "../../database/models/download";

export async function listCommand(repository: DownloadRepository, status?: string): Promise<void> {
  try {
    let downloads;

    if (status === undefined) {
      downloads = repository.findAll();
    } else {
      const normalizedStatus = status.toUpperCase();
      if (!Object.values(DownloadStatus).includes(normalizedStatus as DownloadStatus)) {
        console.error("Error: Invalid status entered");
        return;
      }

      const downloadStatus = normalizedStatus as DownloadStatus;
      downloads = repository.findByStatus(downloadStatus);
    }

    if (downloads.length === 0) {
      console.log("No downloads found.");
      return;
    }

    for (const download of downloads) {
      console.log(
        `${download.id} | ${download.status} | ${download.name}`
      );
    }
  } catch (error) {
    console.error(`Error: Cannot find downloads: ${error}`);
  }
}