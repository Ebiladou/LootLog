import { Command } from "commander";

const program = new Command();

program
    .name("lootlog")
    .description("A command line YouTube download manager")
    .version("0.1.0");

program
    .command("lootlog box")
    .description("Download a video")
    .argument("<url>", "Video URL")
    .action((url: string) => {
        console.log(`Downloading: ${url}`);
    });

program.parse();