import { Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors/AppError";
import { AuthRequest } from "../../shared/middlewares/auth.middleware";
import { CustomersService } from "./customers.service";

export class CustomersController {
    private readonly customersService = new CustomersService();

    create = async (req: Request, res: Response): Promise<void> => {
        const customer = await this.customersService.create(req.body);
        res.status(201).json(customer);
    };

    findAll = async (_req: Request, res: Response): Promise<void> => {
        const customers = await this.customersService.findAll();
        res.status(200).json(customers);
    };

    findActive = async (_req: Request, res: Response): Promise<void> => {
        const customers = await this.customersService.findByStatus(true);
        res.status(200).json(customers);
    };

    findInactive = async (_req: Request, res: Response): Promise<void> => {
        const customers = await this.customersService.findByStatus(false);
        res.status(200).json(customers);
    };

    findMe = async (req: Request, res: Response): Promise<void> => {
        const user = (req as AuthRequest).user;
        if (!user) {
            throw new UnauthorizedError("Debes autenticarte para consultar tu perfil de cliente");
        }
        const customer = await this.customersService.findByUserId(user.userId);
        res.status(200).json(customer);
    };

    findById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const customer = await this.customersService.findById(req.params.id);
        res.status(200).json(customer);
    };

    update = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const customer = await this.customersService.update(req.params.id, req.body);
        res.status(200).json(customer);
    };

    delete = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        await this.customersService.delete(req.params.id);
        res.status(204).send();
    };
}
