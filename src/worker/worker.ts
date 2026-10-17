import { DownloadStatus } from "../database/models/download";
import { DownloadManager } from "../config/download";
import { DownloadQueue } from "../queue/queue";
import { DownloadRepository } from "../database/repositories/download";

export class DownloadWorker {
  private readonly queue: DownloadQueue;
  private readonly downloadRepository: DownloadRepository;
  private readonly downloadManager: DownloadManager;

  private readonly queuedDownloadIds = new Set<string>();

  private running = false;

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
    if (this.running) {
      return;
    }

    this.running = true;

    this.loadPendingDownloads();

    void this.processQueue();
  }

  stop(): void {
    this.running = false;
  }

  private loadPendingDownloads(): void {
    const downloads = this.downloadRepository.findByStatus(
      DownloadStatus.PENDING,
    );

    for (const download of downloads) {
      this.enqueue(download);
    }
  }

  private enqueue(download: Parameters<DownloadQueue["enqueue"]>[0]): void {
    if (download.status !== DownloadStatus.PENDING) {
      return;
    }

    if (this.queuedDownloadIds.has(download.id)) {
      return;
    }

    this.queue.enqueue(download);
    this.queuedDownloadIds.add(download.id);
  }

  private async processQueue(): Promise<void> {
    while (this.running) {
      this.loadPendingDownloads();

      const download = this.queue.dequeue();

      if (!download) {
        await this.wait(1000);
        continue;
      }

      this.queuedDownloadIds.delete(download.id);

      try {
        await this.downloadManager.executeDownload(download.id);
      } catch (error) {
        console.error(`Error processing download ${download.id}:`, error);
      }
    }
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
