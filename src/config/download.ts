import process from "node:process";
import { randomUUID } from "node:crypto";

import { Download, DownloadStatus } from "../database/models/download";
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

  private networkConnected = true;

  constructor(
    downloadEngine: YtDlpEngine,
    downloadRepository: DownloadRepository,
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
      outputDirectory: options.outputDirectory,
      audioOnly: options.audioOnly ?? false,
      playlist: options.playlist ?? false,
      status: DownloadStatus.PENDING,
      processId: null,
      createdAt: new Date(),
    };

    this.downloadRepository.create(download);
    return download;
  }

  async executeDownload(downloadId: string): Promise<void> {
    const pendingDownload = this.downloadRepository.findByIdAndStatus(downloadId, DownloadStatus.PENDING)

    if (!pendingDownload){
      console.error(`Error: No pending download with id: ${downloadId}`)
      return
    }

    this.activeDownloadId = downloadId;

    try {
      const downloadPromise = this.downloadEngine.download(pendingDownload.url, {
        outputDirectory: pendingDownload.outputDirectory,
        audioOnly: pendingDownload.audioOnly,
        playlist: pendingDownload.playlist,
      });

      const processId = this.downloadEngine.getProcessId();

      // once multiple workers is introduced, the status will be updated before the download engine is called so only one worker gets to pick the download from the queue before the ststus gets updated in the db.
      pendingDownload.status = DownloadStatus.DOWNLOADING;

      this.downloadRepository.updateStatusAndProcessId(
        pendingDownload.id,
        pendingDownload.status,
        processId,
      );

      await downloadPromise;

      if (this.stoppingDownloadId === pendingDownload.id) {
        pendingDownload.status = this.stoppingStatus!;

        this.downloadRepository.updateStatusAndProcessId(
          pendingDownload.id,
          pendingDownload.status,
          null,
        );

        this.clearStoppingState();
        this.activeDownloadId = null;
      }

      const currentDownload = this.downloadRepository.findById(pendingDownload.id);

      if (currentDownload?.status === DownloadStatus.CANCELLED) {
        pendingDownload.status = DownloadStatus.CANCELLED;

        this.downloadRepository.updateStatusAndProcessId(
          pendingDownload.id,
          pendingDownload.status,
          null,
        );

        this.activeDownloadId = null;
      }

      pendingDownload.status = DownloadStatus.COMPLETED;

      this.downloadRepository.updateStatusAndProcessId(
        pendingDownload.id,
        pendingDownload.status,
        null,
      );

      this.activeDownloadId = null;
    } catch (error) {
      if (this.stoppingDownloadId === pendingDownload.id) {
        pendingDownload.status = this.stoppingStatus!;

        this.downloadRepository.updateStatusAndProcessId(
          pendingDownload.id,
          pendingDownload.status,
          null,
        );

        this.clearStoppingState();
        this.activeDownloadId = null;
      }

      const currentDownload = this.downloadRepository.findById(pendingDownload.id);

      if (currentDownload?.status === DownloadStatus.CANCELLED) {
        pendingDownload.status = DownloadStatus.CANCELLED;

        this.downloadRepository.updateStatusAndProcessId(
          pendingDownload.id,
          pendingDownload.status,
          null,
        );

        this.activeDownloadId = null;
      }

      if (!this.networkConnected) {
        pendingDownload.status = DownloadStatus.PAUSED;

        this.downloadRepository.updateStatusAndProcessId(
          pendingDownload.id,
          pendingDownload.status,
          null,
        );

        this.activeDownloadId = null;
      }

      pendingDownload.status = DownloadStatus.FAILED;

      this.downloadRepository.updateStatusAndProcessId(
        pendingDownload.id,
        pendingDownload.status,
        null,
      );

      this.activeDownloadId = null;

      throw error;
    }
  }

  setNetworkConnected(connected: boolean): void {
    this.networkConnected = connected;

    if (!connected) {
      this.pauseForNetwork();
    }
  }

  pauseForNetwork(): void {
    if (this.activeDownloadId === null) {
      return;
    }

    this.stopDownload(this.activeDownloadId, DownloadStatus.PAUSED);
  }

  async cancel(id: string): Promise<void> {
    const download = this.downloadRepository.findById(id);

    if (!download) {
      throw new Error(`Download with id: ${id} not found`);
    }

    if (download.status === DownloadStatus.DOWNLOADING){
      if (download.processId === null) {
        throw new Error(`Download ${id} does not have an active process`);
      }

      try {
        process.kill(download.processId, "SIGINT");
      } catch (error) {
        throw new Error(`Could not stop process ${download.processId}: ${error}`);
      }

      this.downloadRepository.updateStatusAndProcessId(
        download.id,
        DownloadStatus.CANCELLED,
        null,
      );
    } else if (download.status === DownloadStatus.PENDING) {
      this.downloadRepository.updateStatusAndProcessId(
        download.id,
        DownloadStatus.CANCELLED,
        null,
      );
    };
    
  }

  async resume(downloadId: string): Promise<void> {
    const pausedDownload = this.downloadRepository.findByIdAndStatus(downloadId, DownloadStatus.PAUSED);

    if(!pausedDownload){
      console.error(`Error: No paused download with id: ${downloadId}`)
      return
    };

    pausedDownload.status = DownloadStatus.PENDING;

    this.downloadRepository.updateStatusAndProcessId(
      pausedDownload.id,
      pausedDownload.status,
      null
    );
  }

  private stopDownload(id: string, status: DownloadStatus): void {
    const download = this.downloadRepository.findByIdAndStatus(
      id,
      DownloadStatus.DOWNLOADING,
    );

    if (!download) {
      throw new Error(`Download ${id} is not currently downloading`);
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
