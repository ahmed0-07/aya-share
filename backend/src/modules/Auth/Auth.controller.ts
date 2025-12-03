import type { Request, Response } from "express";
import config from "../../config/env.js";
import jwt from "jsonwebtoken";

export const handleCallBack = (req: Request, res: Response) => {
    const id = req.user?.id;

    const secret = config.JWT_SECRET_KEY as string;
    const token = jwt.sign({ id }, secret, {
        expiresIn: "1d"
    });

    // not used yet..
    const refresh = config.JWT_REFRESH_KEY as string;
    const refreshToken = jwt.sign({ id }, refresh, {
        expiresIn: "3d"
    });

    res.cookie("refreshtoken", refreshToken, {
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
}