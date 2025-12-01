import express, { type NextFunction, type Request, type Response} from "express";
import uploadAudio from "../../config/multer.js";
import prisma from "../../config/prisma.js";
import supabase from "../../config/supabase.js";
import config from "../../config/env.js";
import { type IToken, type IUser } from "../../interfaces/types.js";
import jwt from "jsonwebtoken";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { unlink, rm, readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const PYTHON_PATH = path.resolve(__dirname, "../../../../venv312/Scripts/python.exe");
const SCRIPT_PATH = path.resolve(__dirname, "../../../../scripts/app.py");
const UPLOAD_PATH = path.resolve(__dirname, "../../../../backend/shared");

function processAudio(filePath: string, filename: string): Promise<string> {
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

async function deleteFile(filePath: string): Promise<void> {
    try {
        await unlink(filePath);
        console.log(`Deleted file: ${filePath}`);
    } catch (err) {
        console.error(`Failed to delete file: ${filePath}`, err);
    }
}

async function deleteFolder(folderPath: string): Promise<void> {
    try {
        await rm(folderPath, { recursive: true, force: true });
        console.log(`Deleted folder: ${folderPath}`);
    } catch (err) {
        console.error(`Failed to delete folder: ${folderPath}`, err);
    }
}

async function isAuth(req: Request, res: Response, next: NextFunction){
    const header = req.headers["authorization"];
    if(!header){
        // error
    }

    if(!header?.startsWith("Bearer ")){
        // error
    }

    const token = header?.split(" ")[1];
    if(!token){
        // error
    }

    const decoded = jwt.verify(token!, config.JWT_SECRET_KEY!) as IToken;
    const id = decoded.id;

    const user: IUser | null = await prisma.user.findUnique({
        where: {
            id: id
        }
    });

    if(!user){
        return next(); // error
    }

    req.User = user;
    next();
}

router.post("/createVideo", isAuth ,uploadAudio.single("audio"), async (req: Request, res: Response) => {
    try{
        const audioPath = req.file?.path;
        const audioName = req.file?.filename;
        const n = audioName?.length!
        const videoName = audioName?.substring(0, n-1) + "4";
        await processAudio(audioPath!, videoName!);

        const videoPath = path.join(UPLOAD_PATH, videoName);

        if(audioPath){
            await deleteFile(audioPath);
        }

        // supabase
        const storage = `videos/${req.User.id}/${videoName}`;
        const videoBuffer = await readFile(videoPath);
        const { error: uploadError } = await supabase.storage
            .from("videos")
            .upload(storage, videoBuffer, {
                contentType: "video/mp4",
                upsert: false
            })

        if(uploadError){
            // upload error
        }

        const { data: urlData } = supabase.storage
            .from("videos")
            .getPublicUrl(storage);

        
        const video = await prisma.video.create({
            data:{
                title: videoName,
                url: urlData.publicUrl,
                storageKey: storage,
                userId: req.User.id,
            }
        })

        await deleteFolder(UPLOAD_PATH);

        res.status(200).json({
            status: "Success",
            data: {
                video: video
            },
        });
    }
    catch(error){
        res.json(500).json({
            status: "Faild",
            error: {
                error
            },
        })
    }
})

router.delete("/deleteVideo/:id", isAuth, async (req: Request, res: Response) => {
    const id = req.params.id!;

    const video = await prisma.video.findUnique({
        where: { 
            id 
        }
    });

    if(!video){
        // error
        throw new Error();
    }

    const { error: deleteError } = await supabase.storage
        .from("videos")
        .remove([video.storageKey]);

    if(deleteError){
        // handle error
    }

    await prisma.video.delete({
        where:{
            id: id
        }
    })

    res.status(200).json({

    })
})

router.get("/allVidoes", isAuth, async (req: Request, res: Response) => {
    const videos = await prisma.video.findMany({
        where: {
            userId: req.User.id
        },
    }
    );

    res.status(200).json({
        
    })
})

export default router;