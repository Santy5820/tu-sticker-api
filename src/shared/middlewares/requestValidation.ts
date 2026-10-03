import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../errors/AppError";

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const containsUnsafeKey = (value: unknown): boolean => {
    if (Array.isArray(value)) {
        return value.some(containsUnsafeKey);
    }

    if (!isObject(value)) {
        return false;
    }

    return Object.entries(value).some(
        ([key, nestedValue]) => key.startsWith("$") || key.includes(".") || containsUnsafeKey(nestedValue)
    );
};

/**
 * Valida cuerpos JSON antes de que lleguen a los servicios y evita claves
 * que MongoDB puede interpretar como operadores o rutas de actualización.
 */
export const validateRequestBody = (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body === undefined) {
        next();
        return;
    }

    if (!isObject(req.body) || Array.isArray(req.body)) {
        next(new BadRequestError("El cuerpo de la solicitud debe ser un objeto JSON"));
        return;
    }

    if (containsUnsafeKey(req.body)) {
        next(new BadRequestError("El cuerpo contiene una clave no permitida"));
        return;
    }

    next();
};
