import { Command } from "commander";
import { boxCommand } from "./commands/box";

const program = new Command();

program
    .name("lootlog")
    .description("A command line YouTube download manager")
    .version("0.1.0");

program
    .command("box <url>")
    .description("Download a video")
    .option("-o, --output <directory>", "Download directory")
    .option('-a, --audio', 'download audio only and convert to MP3')
    .option('--playlist', 'download every video in the playlist')
    .action(boxCommand)

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

program.parse();