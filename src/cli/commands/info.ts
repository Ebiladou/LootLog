import { DownloadRepository } from "../../database/repositories/download";

export async function infoCommand(
  id: string,
  repository: DownloadRepository,
): Promise<void> {
  try {
    const download = repository.findById(id);

    if (!download) {
      console.log(`Error: Download not found with ID: ${id}`);
      return;
    }

    console.log(`ID: ${download.id}`);
    console.log(`Name: ${download.name}`);
    console.log(`URL: ${download.url}`);
    console.log(`Output directory: ${download.outputDirectory}`);
    console.log(`Audio only: ${download.audioOnly}`);
    console.log(`Playlist: ${download.playlist}`);
    console.log(`Status: ${download.status}`);
    console.log(`Created at: ${download.createdAt}`);
  } catch (error) {
    console.error(`Error: Download info unavailable: ${error}`);
  }
}
