export class DownloadQueue {
  private readonly downloads: string[] = [];

  enqueue(downloadId: string): void {
    this.downloads.push(downloadId);
  }

  dequeue(): string | undefined {
    return this.downloads.shift();
  }
}
