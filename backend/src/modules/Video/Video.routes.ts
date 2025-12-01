import express from "express";
import uploadAudio from "../../config/multer.js";
import { isAuth } from "../Auth/Auth.service.js";
import { createVideo, deleteVideo, getAllVideos } from "./Video.controller.js";

const router = express.Router();

router.post("/createVideo", isAuth ,uploadAudio.single("audio"), createVideo);

router.delete("/deleteVideo/:id", isAuth, deleteVideo);

router.get("/allVidoes", isAuth, getAllVideos);

export default router;