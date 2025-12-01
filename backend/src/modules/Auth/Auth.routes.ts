import express, { type Request, type Response} from "express";
import passport from "../../config/passport.js";
import { handleCallBack } from "./Auth.controller.js";

const router = express.Router();

router.get('/google', passport.authenticate("google", {
    scope: ["profile", "email"]
}));

router.get("/google/callback", passport.authenticate("google", {
    failureRedirect: "/login", //to do
    session: false
}), handleCallBack);


export default router;