import path from "node:path";

import {
  defaultDownloadDir,
  ensureDirs,
} from "../../config/path";

import { YtDlpEngine } from "../../config/yt-dlp";

interface BoxOptions {
  output?: string;
  audio?: boolean;
  playlist?: boolean;
}

export async function boxCommand(url: string, options: BoxOptions): Promise<void> {
  if (!/^https?:\/\//.test(url)) {
    console.error(
      "Error: provide a valid HTTP(S) URL."
    );

    process.exitCode = 1;
    return;
  }

  const downloadDirectory = path.resolve(
    options.output || defaultDownloadDir()
  );

  try {
    ensureDirs(downloadDirectory);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(
      `Error: cannot create destination directory: ${message}`
    );

    process.exitCode = 1;
    return;
  }

  console.log(`URL: ${url}`);
  console.log(`Download directory: ${downloadDirectory}`);

  if (options.audio) {
    console.log("Mode: audio");
  }

  if (options.playlist) {
    console.log("Mode: playlist");
  }

  const downloadEngine = new YtDlpEngine();

    try {
    await downloadEngine.download(url, {
        outputDirectory: downloadDirectory,
        audioOnly: options.audio,
        playlist: options.playlist,
    });
    } catch (error) {
    const message =
        error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(`Error: ${message}`);

    process.exitCode = 1;
    }
}