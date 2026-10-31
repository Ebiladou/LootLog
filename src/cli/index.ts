#!/usr/bin/env node

import { Command } from "commander";
import { startCommand } from "./commands/start";
import { statusCommand } from "./commands/status";
import { stopCommand } from "./commands/stop";
import { boxCommand } from "./commands/box";
import { listCommand } from "./commands/list";
import { resumeCommand } from "./commands/resume";
import { cancelCommand } from "./commands/cancel";
import { infoCommand } from "./commands/info";
import { setConfigCommand, getConfigCommand } from "./commands/config";
import { createDatabase } from "../database/db";
import { DownloadRepository } from "../database/repositories/download";
import { YtDlpEngine } from "../core/yt-dlp";
import { DownloadManager } from "../core/download";
import { loadConfig } from "../core/config";

async function main(): Promise<void> {
  const database = createDatabase();

  const downloadRepository = new DownloadRepository(database);

  const config = loadConfig();

  const downloadEngine = new YtDlpEngine({
    cookiesFromBrowser:
      config.cookies.enabled && config.cookies.browser
        ? config.cookies.browser
        : undefined,
  });

  const downloadManager = new DownloadManager(
    downloadEngine,
    downloadRepository,
  );

  const program = new Command();

  program
    .name("lootlog")
    .description("A command line YouTube download manager")
    .version("0.1.0");

  program
    .command("start")
    .description("Start the Download worker")
    .action(startCommand);

  program
    .command("stop")
    .description("Stop the running Download worker")
    .action(stopCommand);

  program
    .command("status")
    .description("Check the background worker status")
    .action(statusCommand);

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

  program
    .command("info <id>")
    .description("Show download details")
    .action((id) => {
      return infoCommand(id, downloadRepository);
    });

  const configCommand = program
    .command("config")
    .description("Manage LootLog configuration");

  configCommand
    .command("set <key> <value>")
    .description("Update a configuration setting")
    .action(setConfigCommand);

  configCommand
    .command("get <key>")
    .description("Display a configuration setting")
    .action(getConfigCommand);

  try {
    await program.parseAsync();
  } finally {
    database.close();
  }
}

main();
