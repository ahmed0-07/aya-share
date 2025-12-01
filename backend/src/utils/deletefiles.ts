import { unlink } from "fs/promises";

export async function deleteFile(filePath: string): Promise<void> {
    try {
        await unlink(filePath);
        console.log(`Deleted file: ${filePath}`);
    } catch (err) {
        console.error(`Failed to delete file: ${filePath}`, err);
    }
}