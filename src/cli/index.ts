import { Command } from "commander";
import { boxCommand } from "./commands/box";
import { createDatabase } from "../database/db";
import { DownloadRepository } from "../database/repositories/download";
import { YtDlpEngine } from "../config/yt-dlp";
import { DownloadManager } from "../config/download";

const database = createDatabase();


const program = new Command();

const downloadRepository = new DownloadRepository(database);
const downloadEngine = new YtDlpEngine();

const downloadManager = new DownloadManager(
  downloadEngine,
  downloadRepository
);

program
    .name("lootlog")
    .description("A command line YouTube downloamd manager")
    .version("0.1.0");

program
    .command("box <url>")
    .description("Download a video")
    .option("-o, --output <directory>", "Download directory")
    .option('-a, --audio', 'download audio only and convert to MP3')
    .option('--playlist', 'download every video in the playlist')
    .action((url, options) => {
    return boxCommand(
      url,
      options,
      downloadManager
    );
  });

program
  .command("list")
  .description("List downloads");

program
  .command("paused")
  .description("List paused downloads");

program
  .command("resume <id>")
  .description("Resume a download");

program
  .command("cancel <id>")
  .description("Cancel a download");

program
  .command("info <id>")
  .description("Show download details");

program.parseAsync();

database.close();