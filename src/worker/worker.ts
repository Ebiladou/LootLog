import { DownloadStatus } from "../database/models/download";
import { DownloadManager } from "../core/download";
import { DownloadQueue } from "./queue";
import { DownloadRepository } from "../database/repositories/download";

export class DownloadWorker {
  private readonly queue: DownloadQueue;
  private readonly downloadRepository: DownloadRepository;
  private readonly downloadManager: DownloadManager;

  private readonly queuedDownloadIds = new Set<string>();
  private running = false;
  private processing: Promise<void> | null = null;

  constructor(
    queue: DownloadQueue,
    downloadRepository: DownloadRepository,
    downloadManager: DownloadManager,
  ) {
    this.queue = queue;
    this.downloadRepository = downloadRepository;
    this.downloadManager = downloadManager;
  }

  start(): void {
    if (this.processing) {
      return;
    }

    this.running = true;

    this.processing = this.processQueue().finally(() => {
      this.processing = null;
    });
  }

  async stop(): Promise<void> {
    this.running = false;

    if (this.processing) {
      await this.processing;
    }
  }

  private loadPendingDownloads(): void {
    const downloads = this.downloadRepository.findByStatus(
      DownloadStatus.PENDING,
    );

    for (const download of downloads) {
      if (this.queuedDownloadIds.has(download.id)) {
        continue;
      }

      this.queue.enqueue(download.id);
      this.queuedDownloadIds.add(download.id);
    }
  }

  private async processQueue(): Promise<void> {
    while (this.running) {
      this.loadPendingDownloads();

      const downloadId = this.queue.dequeue();

      if (!downloadId) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      this.queuedDownloadIds.delete(downloadId);

      try {
        await this.downloadManager.executeDownload(downloadId);
      } catch (error) {
        console.error(`Error processing download ${downloadId}:`, error);
      }
    }
  }
}
