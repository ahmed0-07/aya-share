import type { Request, Response } from "express";
import config from "../../config/env.js";
import jwt from "jsonwebtoken";

export const handleCallBack = (req: Request, res: Response) => {
    const id = req.user?.id;
    const token = jwt.sign({ id }, config.JWT_SECRET_KEY as string, {
        expiresIn: "15m"
    });

    // not used yet..
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
}