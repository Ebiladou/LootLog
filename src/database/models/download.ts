export enum DownloadStatus {
  PENDING = "PENDING",
  DOWNLOADING = "DOWNLOADING",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}

export interface Download {
  id: string;
  url: string;
  name: string;
  outputDirectory: string;
  audioOnly: boolean;
  playlist: boolean;
  status: DownloadStatus;
  processId: number | null;
  createdAt: Date;
}
