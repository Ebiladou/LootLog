import { ChildProcess, spawn } from "node:child_process";

export interface DownloadOptions {
  outputDirectory: string;
  audioOnly?: boolean;
  playlist?: boolean;
}

export class YtDlpEngine {
  private process: ChildProcess | null = null;
  private stopped = false;

  async getTitle(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn("yt-dlp", ["--get-title", "--no-playlist", url], {
        stdio: ["ignore", "pipe", "inherit"],
      });

      let title = "";

      process.stdout?.on("data", (data) => {
        title += data.toString();
      });

      process.on("error", (error) => {
        reject(error);
      });

      process.on("close", (exitCode) => {
        if (exitCode !== 0) {
          reject(new Error(`yt-dlp exited with code ${exitCode}`));
          return;
        }

        resolve(title.trim());
      });
    });
  }

  async download(url: string, options: DownloadOptions): Promise<void> {
    const argumentsList = [
      "--continue",
      options.playlist ? "--yes-playlist" : "--no-playlist",
      "-P",
      options.outputDirectory,
    ];

    if (options.audioOnly) {
      argumentsList.push("-x", "--audio-format", "mp3");
    }

    argumentsList.push(url);

    await this.run(argumentsList);
  }

  stop(): void {
    if (this.process === null) {
      return;
    }

    this.stopped = true;
    this.process.kill("SIGINT");
  }

  private run(argumentsList: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stopped = false;

      this.process = spawn("yt-dlp", argumentsList, {
        stdio: "inherit",
      });

      this.process.on("error", (error) => {
        this.process = null;
        reject(error);
      });

      this.process.on("close", (exitCode) => {
        this.process = null;

        if (this.stopped) {
          resolve();
          return;
        }

        if (exitCode === 0) {
          resolve();
          return;
        }

        reject(new Error(`yt-dlp exited with code ${exitCode}`));
      });
    });
  }
}
