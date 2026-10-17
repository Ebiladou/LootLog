export class DownloadQueue {
  private readonly downloads: string[] = [];

  enqueue(downloadId: string): void {
    this.downloads.push(downloadId);
  }

  dequeue(): string | undefined {
    return this.downloads.shift();
  }

  isEmpty(): boolean {
    return this.downloads.length === 0;
  }

  size(): number {
    return this.downloads.length;
  }
}
