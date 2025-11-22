import express, { type Request, type Response} from "express";
import passport from "../../config/passport.js";
import jwt from "jsonwebtoken";
import config from "../../config/env.js";

const router = express.Router();

router.get('/google', passport.authenticate("google", {
    scope: ["profile", "email"]
}));

router.get("/google/callback", passport.authenticate("google", {
    failureRedirect: "/login", //to do
    session: false
}), 
(req: Request, res: Response) => {
    const id = req.user?.id;
    const token = jwt.sign({ id }, config.JWT_SECRET_KEY as string, {
        expiresIn: "15m"
    });
    const refreshToken = jwt.sign({ id }, config.JWT_REFRESH_KEY as string, {
        expiresIn: "3d"
    });

    res.cookie("token", refreshToken, {
        maxAge: 3 * 24 * 60 * 60 * 1000,
        httpOnly: true
    })

    res.status(200).json({
        status: "Success",
        data: {
            user: req.user,
        },
        token,
    });
})


export default router;