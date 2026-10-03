import { Request, Response } from "express";
import { AuthService } from "./auth.service";

export class AuthController {
    private readonly authService = new AuthService();

    register = async (req: Request, res: Response): Promise<void> => {
        const result = await this.authService.register(req.body);
        res.status(201).json(result);
    };

    login = async (req: Request, res: Response): Promise<void> => {
        const result = await this.authService.login(req.body);
        res.status(200).json(result);
    };

    logout = async (_req: Request, res: Response): Promise<void> => {
        const result = await this.authService.logout();
        res.status(200).json(result);
    };

    me = async (req: Request, res: Response): Promise<void> => {
        const request = req as Request & { user?: { userId: string } };
        const userId = request.user?.userId ?? "";
        const user = await this.authService.me(userId);
        res.status(200).json(user);
    };
}
