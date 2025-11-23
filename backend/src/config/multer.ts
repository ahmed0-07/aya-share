import multer from "multer";
import { type Request } from "express";

const storage = multer.diskStorage({
    destination: (req: Request, file, cb) => {
        cb(null, "./src/uploads");
    },
    filename: (req: Request, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
})

const audioFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (
    file.mimetype.startsWith("audio/") ||
    [
      "audio/mpeg",
      "audio/wav",
      "audio/mp4",
      "audio/ogg",
      "audio/webm",
      "audio/aac",
    ].includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only audio files are allowed!"));
  }
};


const uploadAudio = multer({
  storage,
  fileFilter: audioFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

export default uploadAudio;