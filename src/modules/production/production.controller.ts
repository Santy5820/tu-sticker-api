import { Request, Response } from "express";
import { ProductionAssignmentInput, ProductionCreateInput, ProductionNotesInput, ProductionStatusInput } from "./production.model";
import { ProductionService } from "./production.service";
import { AuthRequest } from "../../shared/middlewares/auth.middleware";
import { UnauthorizedError } from "../../shared/errors/AppError";

export class ProductionController {
    private readonly productionService = new ProductionService();

    createJobsForOrder = async (req: Request<{ orderId: string }>, res: Response): Promise<void> => {
        const user = this.getUser(req);
        const jobs = await this.productionService.createJobsForOrder(
            req.params.orderId,
            req.body as ProductionCreateInput,
            user.userId
        );
        res.status(201).json(jobs);
    };

    findQueue = async (req: Request, res: Response): Promise<void> => {
        const jobs = await this.productionService.findQueue(
            typeof req.query.status === "string" ? req.query.status : undefined,
            typeof req.query.priority === "string" ? req.query.priority : undefined
        );
        res.status(200).json(jobs);
    };

    findById = async (req: Request<{ jobId: string }>, res: Response): Promise<void> => {
        const job = await this.productionService.findById(req.params.jobId);
        res.status(200).json(job);
    };

    findByOrderId = async (req: Request<{ orderId: string }>, res: Response): Promise<void> => {
        const jobs = await this.productionService.findByOrderId(req.params.orderId);
        res.status(200).json(jobs);
    };

    updateStatus = async (req: Request<{ jobId: string }>, res: Response): Promise<void> => {
        const job = await this.productionService.updateStatus(
            req.params.jobId,
            req.body as ProductionStatusInput
        );
        res.status(200).json(job);
    };

    assign = async (req: Request<{ jobId: string }>, res: Response): Promise<void> => {
        const job = await this.productionService.assign(
            req.params.jobId,
            req.body as ProductionAssignmentInput
        );
        res.status(200).json(job);
    };

    updateNotes = async (req: Request<{ jobId: string }>, res: Response): Promise<void> => {
        const job = await this.productionService.updateNotes(
            req.params.jobId,
            req.body as ProductionNotesInput
        );
        res.status(200).json(job);
    };

    private getUser(req: Request) {
        const user = (req as AuthRequest).user;
        if (!user) throw new UnauthorizedError("Debes autenticarte para gestionar producción");
        return user;
    }
}
