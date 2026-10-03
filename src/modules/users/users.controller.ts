import { Request, Response } from "express";
import { UsersService } from "./users.service";

export class UsersController {
    private readonly usersService = new UsersService();

    create = async (req: Request, res: Response): Promise<void> => {
        const user = await this.usersService.create(req.body);
        res.status(201).json(user);
    };

    findAll = async (_req: Request, res: Response): Promise<void> => {
        const users = await this.usersService.findAll();
        res.status(200).json(users);
    };

    findById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const user = await this.usersService.findById(req.params.id);
        res.status(200).json(user);
    };

    update = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const user = await this.usersService.update(req.params.id, req.body);
        res.status(200).json(user);
    };

    delete = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        await this.usersService.delete(req.params.id);
        res.status(204).send();
    };
}
