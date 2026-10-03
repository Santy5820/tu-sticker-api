/**
 * Error operacional de la aplicación. Permite adjuntar un código HTTP
 * para que el middleware de errores devuelva la respuesta adecuada.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Solicitud inválida") {
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "No autenticado") {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "No tienes permisos para realizar esta operación") {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Recurso no encontrado") {
        super(message, 404);
    }
}
