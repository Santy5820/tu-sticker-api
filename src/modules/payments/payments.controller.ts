import { Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors/AppError";
import { AuthRequest } from "../../shared/middlewares/auth.middleware";
import { WompiWebhook } from "./payments.model";
import { PaymentsService } from "./payments.service";

export class PaymentsController {
    private readonly paymentsService = new PaymentsService();

    createCheckout = async (req: Request<{ orderId: string }>, res: Response): Promise<void> => {
        const user = this.getUser(req);
        const result = await this.paymentsService.createWompiCheckout(
            req.params.orderId,
            user.userId,
            req.ip
        );
        res.status(201).json(result);
    };

    findByOrderId = async (req: Request<{ orderId: string }>, res: Response): Promise<void> => {
        const user = this.getUser(req);
        const isStaff = user.role !== "CUSTOMER";
        const payments = await this.paymentsService.findByOrderId(
            req.params.orderId,
            user.userId,
            isStaff
        );
        res.status(200).json(payments);
    };

    wompiWebhook = async (req: Request, res: Response): Promise<void> => {
        const result = await this.paymentsService.handleWompiWebhook(
            req.body as WompiWebhook,
            req.header("X-Event-Checksum")
        );
        res.status(200).json(result);
    };

    private getUser(req: Request) {
        const user = (req as AuthRequest).user;
        if (!user) throw new UnauthorizedError("Debes autenticarte para gestionar pagos");
        return user;
    }
}
