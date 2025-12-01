import { rm } from "fs/promises";

export async function deleteFolder(folderPath: string): Promise<void> {
    try {
        await rm(folderPath, { recursive: true, force: true });
        console.log(`Deleted folder: ${folderPath}`);
    } catch (err) {
        console.error(`Failed to delete folder: ${folderPath}`, err);
    }
}