import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const LOOTLOG_DIR = path.join(os.homedir(), ".lootlog");
export const QUEUE_FILE = path.join(LOOTLOG_DIR, "queue.json");
export const CONFIG_FILE = path.join(LOOTLOG_DIR, "config.json");

export function defaultDownloadDir(): string {
  if (process.platform === "win32") {
    const baseDirectory = process.env.USERPROFILE || os.homedir();

    return path.join(baseDirectory, "Downloads", "Lootlog");
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Downloads", "Lootlog");
  }

  const xdgUserDirectoriesFile = path.join(
    os.homedir(),
    ".config",
    "user-dirs.dirs",
  );

  if (fs.existsSync(xdgUserDirectoriesFile)) {
    const config = fs.readFileSync(xdgUserDirectoriesFile, "utf-8");

    const downloadsMatch = config.match(/^XDG_DOWNLOAD_DIR="(.+)"$/m);

    if (downloadsMatch) {
      const downloadsDirectory = downloadsMatch[1].replace(
        "$HOME",
        os.homedir(),
      );

      return path.join(downloadsDirectory, "Lootlog");
    }
  }

  return path.join(os.homedir(), "Downloads", "Lootlog");
}

export function ensureDirs(downloadDirectory?: string): void {
  fs.mkdirSync(LOOTLOG_DIR, { recursive: true });

  if (downloadDirectory) {
    fs.mkdirSync(downloadDirectory, { recursive: true });
  }
}
