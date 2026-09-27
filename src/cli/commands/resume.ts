import { DownloadRepository } from "../../database/repositories/download";
import { DownloadStatus } from "../../database/models/download";

export async function resumeCommand(id: string, repository: DownloadRepository): Promise<void>{
    try{
        const pausedDownload = repository.findByIdAndStatus(id, DownloadStatus.PAUSED);
        if (!pausedDownload){
            console.log(`Error: No paused download found with ID: ${id}`);
            return;
        }


    }catch(error){
        console.error(`Error: Download not found ${error}`)
    }
}