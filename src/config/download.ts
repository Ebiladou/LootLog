import { randomUUID } from "node:crypto";
import {Download, DownloadStatus} from "../database/models/download";
import { DownloadRepository } from "../database/repositories/download";
import { YtDlpEngine } from "../config/yt-dlp";

export interface CreateDownloadOptions {
  url: string;
  outputDirectory: string;
  audioOnly?: boolean;
  playlist?: boolean;
}

export class DownloadManager {
  private readonly downloadEngine: YtDlpEngine;
  private readonly downloadRepository: DownloadRepository;

  private activeDownloadId: string | null = null;

  private stoppingDownloadId: string | null = null;
  private stoppingStatus: DownloadStatus | null = null;

  constructor(
    downloadEngine: YtDlpEngine,
    downloadRepository: DownloadRepository
  ) {
    this.downloadEngine = downloadEngine;
    this.downloadRepository = downloadRepository;
  }

  async download(options: CreateDownloadOptions): Promise<Download> {
    const name = await this.downloadEngine.getTitle(options.url);

    const download: Download = {
      id: randomUUID(),
      url: options.url,
      name,
      status: DownloadStatus.PENDING,
      createdAt: new Date(),
    };

    this.downloadRepository.create(download);

    download.status = DownloadStatus.DOWNLOADING;

    this.downloadRepository.updateStatus(download.id, download.status);

    this.activeDownloadId = download.id;

    try {
      await this.downloadEngine.download(
        download.url,
        {
          outputDirectory: options.outputDirectory,
          audioOnly: options.audioOnly,
          playlist: options.playlist,
        }
      );

      if (this.stoppingDownloadId === download.id) {
        download.status = this.stoppingStatus!;

        this.downloadRepository.updateStatus(download.id, download.status);

        this.clearStoppingState();
        this.activeDownloadId = null;

        return download;
      }

      download.status = DownloadStatus.COMPLETED;

      this.downloadRepository.updateStatus(download.id, download.status);

      this.activeDownloadId = null;
    } catch (error) {
      if (this.stoppingDownloadId === download.id) {
        download.status = this.stoppingStatus!;

        this.downloadRepository.updateStatus(download.id, download.status);

        this.clearStoppingState();
        this.activeDownloadId = null;

        return download;
      }

      download.status = DownloadStatus.FAILED;

      this.downloadRepository.updateStatus(download.id, download.status);

      this.activeDownloadId = null;
      throw error;
    }
    return download;
  }

  pauseForNetwork(): void {
    if (this.activeDownloadId === null) {
      return;
    }

    this.stopDownload(this.activeDownloadId, DownloadStatus.PAUSED);
  }

  cancel(id: string): void {
    this.stopDownload(id, DownloadStatus.CANCELLED);
  }

  private stopDownload(id: string, status: DownloadStatus): void {
    const download = this.downloadRepository.findByIdAndStatus(id, DownloadStatus.DOWNLOADING);

    if (!download) {
      throw new Error(
        `Download ${id} is not currently downloading`
      );
    }

    this.stoppingDownloadId = id;
    this.stoppingStatus = status;

    this.downloadEngine.stop();
  }

  private clearStoppingState(): void {
    this.stoppingDownloadId = null;
    this.stoppingStatus = null;
  }
}