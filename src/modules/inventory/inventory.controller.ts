import { Request, Response } from "express";
import { AuthRequest } from "../../shared/middlewares/auth.middleware";
import { InventoryAdjustmentInput } from "./inventory.model";
import { InventoryService } from "./inventory.service";

export class InventoryController {
    private readonly inventoryService = new InventoryService();

    findAll = async (_req: Request, res: Response): Promise<void> => {
        const inventory = await this.inventoryService.findAll();
        res.status(200).json(inventory);
    };

    findByProductId = async (req: Request<{ productId: string }>, res: Response): Promise<void> => {
        const inventory = await this.inventoryService.findByProductId(req.params.productId);
        res.status(200).json(inventory);
    };

    findMovements = async (req: Request<{ productId: string }>, res: Response): Promise<void> => {
        const movements = await this.inventoryService.findMovements(req.params.productId);
        res.status(200).json(movements);
    };

    adjustStock = async (req: Request<{ productId: string }>, res: Response): Promise<void> => {
        const user = (req as AuthRequest).user;
        const result = await this.inventoryService.adjustStock(
            req.params.productId,
            req.body as InventoryAdjustmentInput,
            user?.userId ?? ""
        );
        res.status(200).json(result);
    };
}
