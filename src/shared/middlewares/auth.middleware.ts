import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { BadRequestError } from "../errors/AppError";

export interface AuthUserPayload {
    userId: string;
    email: string;
    role: string;
}

export interface AuthRequest extends Request {
    user?: AuthUserPayload;
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        next(new BadRequestError("Token no proporcionado"));
        return;
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        next(new BadRequestError("JWT_SECRET no está configurado"));
        return;
    }

    try {
        const decoded = jwt.verify(token, secret) as AuthUserPayload;
        (req as AuthRequest).user = decoded;
        next();
    } catch {
        next(new BadRequestError("Token inválido o expirado"));
    }
};
