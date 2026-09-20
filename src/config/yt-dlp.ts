import { spawn } from "node:child_process";

export interface DownloadOptions {
  outputDirectory: string;
  audioOnly?: boolean;
  playlist?: boolean;
}

export class YtDlpEngine {
  async download(url: string, options: DownloadOptions): Promise<void> {
    const argumentsList = [
      "--no-playlist",
      "-P",
      options.outputDirectory,
    ];

    if (options.audioOnly) {
      argumentsList.push(
        "-x",
        "--audio-format",
        "mp3"
      );
    }

    if (options.playlist) {
      const noPlaylistIndex = argumentsList.indexOf("--no-playlist");
      argumentsList.splice(noPlaylistIndex, 1);
    }

    argumentsList.push(url);
    await this.run(argumentsList);
  }

  private run(argumentsList: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(
        "yt-dlp",
        argumentsList,
        {
          stdio: "inherit",
        }
      );

      process.on("error", (error) => {
        reject(error);
      });

      process.on("close", (exitCode) => {
        if (exitCode === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            `yt-dlp exited with code ${exitCode}`
          )
        );
      });
    });
  }
}