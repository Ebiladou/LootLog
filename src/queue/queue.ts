import { Download } from "../database/models/download";

export class DownloadQueue {
  private readonly downloads: Download[] = [];

  enqueue(download: Download): void {
    this.downloads.push(download);
  }

  dequeue(): Download | undefined {
    return this.downloads.shift();
  }

  isEmpty(): boolean {
    return this.downloads.length === 0;
  }

  size(): number {
    return this.downloads.length;
  }
}
