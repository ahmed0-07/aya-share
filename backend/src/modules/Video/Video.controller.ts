import type { NextFunction, Request, Response } from "express";
import { processAudio, UPLOAD_PATH } from "../../utils/runpy.js";
import { deleteFile } from "../../utils/deletefiles.js";
import { deleteFolder } from "../../utils/deletefolder.js";
import { readFile } from "fs/promises";
import supabase from "../../config/supabase.js";
import prisma from "../../config/prisma.js";
import path from "path";
import APIError from "../../utils/APIError.js";
import { nextTick } from "process";

export const createVideo = async (req: Request, res: Response, next: NextFunction) => {
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
        return next(new APIError("Internal server error", 500));
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

export const deleteVideo = async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id!;

    const video = await prisma.video.findUnique({
        where: { 
            id 
        }
    });

    if(!video){
        return next(new APIError("Video not found", 404));
    }

    const { error: deleteError } = await supabase.storage
        .from("videos")
        .remove([video.storageKey]);

    if(deleteError){
        return next(new APIError("Internal server error", 500));
    }

    await prisma.video.delete({
        where:{
            id: id
        }
    })

    res.status(200).json({
        status: "Success",
    })
}

export const getAllVideos = async (req: Request, res: Response) => {
    const videos = await prisma.video.findMany({
        where: {
            userId: req.User.id
        },
    });

    res.status(200).json({
        status: "Success",
        data: {
            videos: videos
        }
    })
}