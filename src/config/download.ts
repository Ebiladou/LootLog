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
    const updateRunningDownload =
      this.downloadRepository.updateExecutingDownload(downloadId); // specifically introduced this to prevent a race and duplicate download when multiple workers are eventually introduced (only god knows when). since the update happens in the same operation as the check, only one worker can pick the download. cannot tell if this is sufficient rn, will find out eventually anyway, but an attempt nonetheless. the idea is simply that a worker has CLAIMED the download process.

    if (!updateRunningDownload) {
      return;
    }

    const runningDownload = this.downloadRepository.findByIdAndStatus(
      downloadId,
      DownloadStatus.DOWNLOADING,
    );

    if (!runningDownload) {
      return;
    }

    this.activeDownloadId = downloadId;

    try {
      const downloadPromise = this.downloadEngine.download(
        runningDownload.url,
        {
          outputDirectory: runningDownload.outputDirectory,
          audioOnly: runningDownload.audioOnly,
          playlist: runningDownload.playlist,
        },
      );

      const processId = this.downloadEngine.getProcessId();

      this.downloadRepository.updateStatusAndProcessId(
        runningDownload.id,
        runningDownload.status,
        processId,
      );

      await downloadPromise;

      if (this.stoppingDownloadId === runningDownload.id) {
        runningDownload.status = DownloadStatus.PAUSED;

        this.downloadRepository.updateStatusAndProcessId(
          runningDownload.id,
          runningDownload.status,
          null,
        );

        this.stoppingDownloadId = null;
        this.activeDownloadId = null;
        return;
      }

      const currentDownload = this.downloadRepository.findById(
        runningDownload.id,
      );

      if (currentDownload?.status === DownloadStatus.CANCELLED) {
        runningDownload.status = DownloadStatus.CANCELLED;

        this.downloadRepository.updateStatusAndProcessId(
          runningDownload.id,
          runningDownload.status,
          null,
        );

        this.activeDownloadId = null;
        return;
      }

      runningDownload.status = DownloadStatus.COMPLETED;

      this.downloadRepository.updateStatusAndProcessId(
        runningDownload.id,
        runningDownload.status,
        null,
      );

      this.activeDownloadId = null;
    } catch (error) {
      if (this.stoppingDownloadId === runningDownload.id) {
        runningDownload.status = DownloadStatus.PAUSED;

        this.downloadRepository.updateStatusAndProcessId(
          runningDownload.id,
          runningDownload.status,
          null,
        );

        this.stoppingDownloadId = null;
        this.activeDownloadId = null;
        return;
      }

      const currentDownload = this.downloadRepository.findById(
        runningDownload.id,
      );

      if (currentDownload?.status === DownloadStatus.CANCELLED) {
        runningDownload.status = DownloadStatus.CANCELLED;

        this.downloadRepository.updateStatusAndProcessId(
          runningDownload.id,
          runningDownload.status,
          null,
        );

        this.activeDownloadId = null;
        return;
      }

      if (!this.networkConnected) {
        runningDownload.status = DownloadStatus.PAUSED;

        this.downloadRepository.updateStatusAndProcessId(
          runningDownload.id,
          runningDownload.status,
          null,
        );

        this.activeDownloadId = null;
        return;
      }

      runningDownload.status = DownloadStatus.FAILED;

      this.downloadRepository.updateStatusAndProcessId(
        runningDownload.id,
        runningDownload.status,
        null,
      );

      this.activeDownloadId = null;

      throw error;
    }
  }

  async cancel(id: string): Promise<void> {
    const download = this.downloadRepository.findById(id);

    if (!download) {
      throw new Error(`Download with id: ${id} not found`);
    }

    if (
      download.status !== DownloadStatus.DOWNLOADING &&
      download.status !== DownloadStatus.PENDING
    ) {
      throw new Error(
        `Can only cancel currently downloading and pending downloads`,
      );
    }

    if (download.status === DownloadStatus.DOWNLOADING) {
      if (download.processId === null) {
        throw new Error(`Download ${id} does not have an active process`);
      }

      try {
        process.kill(download.processId, "SIGINT");
      } catch (error) {
        throw new Error(
          `Could not stop process ${download.processId}: ${error}`,
        );
      }
    }

    this.downloadRepository.updateStatusAndProcessId(
      download.id,
      DownloadStatus.CANCELLED,
      null,
    );
  }

  async resume(downloadId: string): Promise<void> {
    const pausedDownload = this.downloadRepository.findByIdAndStatus(
      downloadId,
      DownloadStatus.PAUSED,
    );

    if (!pausedDownload) {
      console.error(`Error: No paused download with id: ${downloadId}`);
      return;
    }

    pausedDownload.status = DownloadStatus.PENDING;

    this.downloadRepository.updateStatusAndProcessId(
      pausedDownload.id,
      pausedDownload.status,
      null,
    );
  }

  setNetworkConnected(connected: boolean): void {
    this.networkConnected = connected;

    if (!connected && this.activeDownloadId !== null) {
      const download = this.downloadRepository.findByIdAndStatus(
        this.activeDownloadId,
        DownloadStatus.DOWNLOADING,
      );

      if (!download) {
        throw new Error(
          `Download ${this.activeDownloadId} is not currently downloading`,
        );
      }

      this.stoppingDownloadId = this.activeDownloadId;

      this.downloadEngine.stop();
    }
  }
}
