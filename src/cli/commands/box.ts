import path from "node:path";
import { defaultDownloadDir, ensureDirs } from "../../config/path";
import { DownloadManager } from "../../config/download";

interface BoxOptions {
  output?: string;
  audio?: boolean;
  playlist?: boolean;
}

export async function boxCommand(
  url: string,
  options: BoxOptions,
  downloadManager: DownloadManager,
): Promise<void> {
  if (!/^https?:\/\//.test(url)) {
    console.error("Error: provide a valid HTTP(S) URL.");

    process.exitCode = 1;
    return;
  }

  const downloadDirectory = path.resolve(
    options.output || defaultDownloadDir(),
  );

  try {
    ensureDirs(downloadDirectory);
  } catch (error) {
    console.error(`Error: cannot create destination directory: ${error}`);
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

  try {
    await downloadManager.download({
      url,
      outputDirectory: downloadDirectory,
      audioOnly: options.audio,
      playlist: options.playlist,
    });
  } catch (error) {
    console.error(`Error downloading file: ${error}`);
    process.exitCode = 1;
  }
}
