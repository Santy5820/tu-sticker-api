import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError";
import type { UserRole } from "../../modules/auth/auth.model";

export interface AuthUserPayload {
    userId: string;
    email: string;
    role: UserRole;
}

export interface AuthRequest extends Request {
    user?: AuthUserPayload;
}

const validRoles: UserRole[] = ["CUSTOMER", "ADMIN", "SALES", "DESIGNER", "PRODUCTION"];

const isAuthUserPayload = (value: unknown): value is AuthUserPayload => {
    if (!value || typeof value !== "object") {
        return false;
    }

    const payload = value as Record<string, unknown>;
    return (
        typeof payload.userId === "string" &&
        typeof payload.email === "string" &&
        typeof payload.role === "string" &&
        validRoles.includes(payload.role as UserRole)
    );
};

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        next(new UnauthorizedError("Token no proporcionado"));
        return;
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        next(new UnauthorizedError("JWT_SECRET no está configurado"));
        return;
    }

    try {
        const decoded = jwt.verify(token, secret);
        if (!isAuthUserPayload(decoded)) {
            next(new UnauthorizedError("El token no contiene un usuario válido"));
            return;
        }
        (req as AuthRequest).user = decoded;
        next();
    } catch {
        next(new UnauthorizedError("Token inválido o expirado"));
    }
};

export const requireRoles = (...allowedRoles: UserRole[]) =>
    (req: Request, _res: Response, next: NextFunction): void => {
        const user = (req as AuthRequest).user;

        if (!user) {
            next(new UnauthorizedError("Debes autenticarte para realizar esta operación"));
            return;
        }

        if (!allowedRoles.includes(user.role)) {
            next(new ForbiddenError("No tienes el rol necesario para realizar esta operación"));
            return;
        }

        next();
    };
