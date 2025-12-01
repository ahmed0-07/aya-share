import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { unlink, rm, readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_PATH = path.resolve(__dirname, "../../../../venv312/Scripts/python.exe");
const SCRIPT_PATH = path.resolve(__dirname, "../../../../scripts/app.py");
export const UPLOAD_PATH = path.resolve(__dirname, "../../../../backend/shared");

export function processAudio(filePath: string, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const py = spawn(PYTHON_PATH, [SCRIPT_PATH, filePath, filename]);

        let result = "";
        let error = "";

        py.stdout.on("data", d => result += d.toString());
        py.stderr.on("data", d => error += d.toString());

        py.on("close", code => {
            if (code === 0) resolve(result.trim());
            else reject(error);
        });
    })
}