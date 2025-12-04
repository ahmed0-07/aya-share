import { spawn } from "child_process";
import path from "path";


const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const PYTHON_PATH = path.join(PROJECT_ROOT, "venv312", "Scripts", "python.exe");
const SCRIPT_PATH = path.join(PROJECT_ROOT, "scripts", "app.py");

console.log("PROJECT_ROOT:", PROJECT_ROOT);
console.log("PYTHON_PATH:", PYTHON_PATH);

export function processAudio(filePath: string, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // console.log("Running Python with:", filePath, filename);
        const py = spawn(PYTHON_PATH, [SCRIPT_PATH, filePath, filename]);

        let result = "";
        let error = "";

        py.stdout.on("data", d => {
            console.log("Python stdout:", d.toString());
            result += d.toString();
        });
        
        py.stderr.on("data", d => {
            console.log("Python stderr:", d.toString());
            error += d.toString();
        });

        py.on("error", err => {
            reject(`Failed to start Python: ${err.message}`);
        });

        py.on("close", code => {
            // console.log("Python exited with code:", code);
            if (code === 0) resolve(result.trim());
            else reject(error || `Python exited with code ${code}`);
        });
    })
}