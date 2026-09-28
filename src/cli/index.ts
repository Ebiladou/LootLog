import { Command } from "commander";

import { boxCommand } from "./commands/box";
import { listCommand } from "./commands/list";
import { resumeCommand } from "./commands/resume";
import { cancelCommand } from "./commands/cancel";

import { createDatabase } from "../database/db";
import { DownloadRepository } from "../database/repositories/download";
import { YtDlpEngine } from "../config/yt-dlp";
import { DownloadManager } from "../config/download";
import { ConnectivityMonitor } from "../config/network";

async function main(): Promise<void> {
  const database = createDatabase();

  const downloadRepository = new DownloadRepository(database);
  const downloadEngine = new YtDlpEngine();

  const downloadManager = new DownloadManager(
    downloadEngine,
    downloadRepository,
  );

  const connectivityMonitor = new ConnectivityMonitor((connected) => {
    downloadManager.setNetworkConnected(connected);
  });

  connectivityMonitor.start();

  const program = new Command();

  program
    .name("lootlog")
    .description("A command line YouTube download manager")
    .version("0.1.0");

  program
    .command("box <url>")
    .description("Download a video")
    .option("-o, --output <directory>", "Download directory")
    .option("-a, --audio", "Download audio only and convert to MP3")
    .option("--playlist", "Download every video in the playlist")
    .action((url, options) => {
      return boxCommand(url, options, downloadManager);
    });

  program
    .command("list")
    .description("List downloads")
    .option("-s, --status <status>", "Download status")
    .action((options) => {
      return listCommand(downloadRepository, options.status);
    });

  program
    .command("resume <id>")
    .description("Resume a download")
    .action((id) => {
      return resumeCommand(id, downloadRepository, downloadManager);
    });

  program
    .command("cancel <id>")
    .description("Cancel a download")
    .action((id) => {
      return cancelCommand(id, downloadManager);
    });

  program.command("info <id>").description("Show download details");

  await program.parseAsync();

  database.close();
}

main();
