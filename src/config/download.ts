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

    this.activeDownloadId = download.id;

    try {
      const downloadPromise = this.downloadEngine.download(download.url, {
        outputDirectory: download.outputDirectory,
        audioOnly: download.audioOnly,
        playlist: download.playlist,
      });

      const processId = this.downloadEngine.getProcessId();

      download.status = DownloadStatus.DOWNLOADING;

      this.downloadRepository.updateStatusAndProcessId(
        download.id,
        download.status,
        processId,
      );

      await downloadPromise;

      if (this.stoppingDownloadId === download.id) {
        download.status = this.stoppingStatus!;

        this.downloadRepository.updateStatusAndProcessId(
          download.id,
          download.status,
          null,
        );

        this.clearStoppingState();
        this.activeDownloadId = null;

        return download;
      }

      const currentDownload = this.downloadRepository.findById(download.id);

      if (currentDownload?.status === DownloadStatus.CANCELLED) {
        download.status = DownloadStatus.CANCELLED;

        this.downloadRepository.updateStatusAndProcessId(
          download.id,
          download.status,
          null,
        );

        this.activeDownloadId = null;

        return download;
      }

      download.status = DownloadStatus.COMPLETED;

      this.downloadRepository.updateStatusAndProcessId(
        download.id,
        download.status,
        null,
      );

      this.activeDownloadId = null;
    } catch (error) {
      if (this.stoppingDownloadId === download.id) {
        download.status = this.stoppingStatus!;

        this.downloadRepository.updateStatusAndProcessId(
          download.id,
          download.status,
          null,
        );

        this.clearStoppingState();
        this.activeDownloadId = null;

        return download;
      }

      const currentDownload = this.downloadRepository.findById(download.id);

      if (currentDownload?.status === DownloadStatus.CANCELLED) {
        download.status = DownloadStatus.CANCELLED;

        this.downloadRepository.updateStatusAndProcessId(
          download.id,
          download.status,
          null,
        );

        this.activeDownloadId = null;

        return download;
      }

      if (!this.networkConnected) {
        download.status = DownloadStatus.PAUSED;

        this.downloadRepository.updateStatusAndProcessId(
          download.id,
          download.status,
          null,
        );

        this.activeDownloadId = null;

        return download;
      }

      download.status = DownloadStatus.FAILED;

      this.downloadRepository.updateStatusAndProcessId(
        download.id,
        download.status,
        null,
      );

      this.activeDownloadId = null;

      throw error;
    }

    return download;
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

  cancel(id: string): void {
    const download = this.downloadRepository.findByIdAndStatus(
      id,
      DownloadStatus.DOWNLOADING,
    );

    if (!download) {
      throw new Error(`Download ${id} is not currently downloading`);
    }

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
  }

  async resume(download: Download): Promise<void> {
    this.networkConnected = true;

    this.clearStoppingState();

    this.activeDownloadId = download.id;

    try {
      const downloadPromise = this.downloadEngine.download(download.url, {
        outputDirectory: download.outputDirectory,
        audioOnly: download.audioOnly,
        playlist: download.playlist,
      });

      const processId = this.downloadEngine.getProcessId();

      download.status = DownloadStatus.DOWNLOADING;

      this.downloadRepository.updateStatusAndProcessId(
        download.id,
        download.status,
        processId,
      );

      await downloadPromise;

      if (this.stoppingDownloadId === download.id) {
        download.status = this.stoppingStatus!;

        this.downloadRepository.updateStatusAndProcessId(
          download.id,
          download.status,
          null,
        );

        this.clearStoppingState();
        this.activeDownloadId = null;

        return;
      }

      const currentDownload = this.downloadRepository.findById(download.id);

      if (currentDownload?.status === DownloadStatus.CANCELLED) {
        download.status = DownloadStatus.CANCELLED;

        this.downloadRepository.updateStatusAndProcessId(
          download.id,
          download.status,
          null,
        );

        this.activeDownloadId = null;

        return;
      }

      download.status = DownloadStatus.COMPLETED;

      this.downloadRepository.updateStatusAndProcessId(
        download.id,
        download.status,
        null,
      );

      this.activeDownloadId = null;
    } catch (error) {
      if (this.stoppingDownloadId === download.id) {
        download.status = this.stoppingStatus!;

        this.downloadRepository.updateStatusAndProcessId(
          download.id,
          download.status,
          null,
        );

        this.clearStoppingState();
        this.activeDownloadId = null;

        return;
      }

      const currentDownload = this.downloadRepository.findById(download.id);

      if (currentDownload?.status === DownloadStatus.CANCELLED) {
        download.status = DownloadStatus.CANCELLED;

        this.downloadRepository.updateStatusAndProcessId(
          download.id,
          download.status,
          null,
        );

        this.activeDownloadId = null;

        return;
      }

      if (!this.networkConnected) {
        download.status = DownloadStatus.PAUSED;

        this.downloadRepository.updateStatusAndProcessId(
          download.id,
          download.status,
          null,
        );

        this.activeDownloadId = null;

        return;
      }

      download.status = DownloadStatus.FAILED;

      this.downloadRepository.updateStatusAndProcessId(
        download.id,
        download.status,
        null,
      );

      this.activeDownloadId = null;

      throw error;
    }
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
