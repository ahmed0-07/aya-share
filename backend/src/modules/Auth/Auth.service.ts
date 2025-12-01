import { type Request, type Response, type NextFunction } from "express";
import config from "../../config/env.js";
import jwt from "jsonwebtoken";
import type { IUser, IToken } from "../../interfaces/types.js";
import prisma from "../../config/prisma.js";

export async function isAuth(req: Request, res: Response, next: NextFunction){
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