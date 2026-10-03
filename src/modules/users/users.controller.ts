import { Request, Response } from "express";
import { UsersService } from "./users.service";
import { sanitizeUser, sanitizeUsers } from "../../shared/security/userSanitizer";

export class UsersController {
    private readonly usersService = new UsersService();

    create = async (req: Request, res: Response): Promise<void> => {
        const user = await this.usersService.create(req.body);
        res.status(201).json(sanitizeUser(user));
    };

    findAll = async (_req: Request, res: Response): Promise<void> => {
        const users = await this.usersService.findAll();
        res.status(200).json(sanitizeUsers(users));
    };

    findById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const user = await this.usersService.findById(req.params.id);
        res.status(200).json(sanitizeUser(user));
    };

    update = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const user = await this.usersService.update(req.params.id, req.body);
        res.status(200).json(sanitizeUser(user));
    };

    delete = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        await this.usersService.delete(req.params.id);
        res.status(204).send();
    };
}
