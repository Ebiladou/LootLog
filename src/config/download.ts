import { randomUUID } from "node:crypto";

import {
  Download,
  DownloadStatus,
} from "../database/models/download";
import { DownloadRepository } from "../database/repositories/download";

import { YtDlpEngine } from "../config/yt-dlp";

export interface CreateDownloadOptions {
  url: string;
  name: string;
  outputDirectory: string;
  audioOnly?: boolean;
  playlist?: boolean;
}

export class DownloadManager {
  private readonly downloadEngine: YtDlpEngine;
  private readonly downloadRepository: DownloadRepository;

  constructor(
    downloadEngine: YtDlpEngine,
    downloadRepository: DownloadRepository
) {
    this.downloadEngine = downloadEngine;
    this.downloadRepository = downloadRepository;
  }

  async download(options: CreateDownloadOptions): Promise<Download> {
    const download: Download = {
      id: randomUUID(),
      url: options.url,
      name: options.name,
      status: DownloadStatus.PENDING,
      createdAt: new Date(),
    };

    this.downloadRepository.create(download);

    download.status = DownloadStatus.DOWNLOADING;

    this.downloadRepository.updateStatus(
      download.id,
      download.status
    );

    try {
      await this.downloadEngine.download(download.url, {
        outputDirectory: options.outputDirectory,
        audioOnly: options.audioOnly,
        playlist: options.playlist,
      });

      download.status = DownloadStatus.COMPLETED;

      this.downloadRepository.updateStatus(
        download.id,
        download.status
      );

    } catch (error) {
      download.status = DownloadStatus.FAILED;

      this.downloadRepository.updateStatus(
        download.id,
        download.status
      );

      throw error;
    }

    return download;
  }
}