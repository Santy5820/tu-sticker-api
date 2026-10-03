import { Request, Response } from "express";
import { ProductsService } from "./products.service";

export class ProductsController {
    private readonly productsService = new ProductsService();

    create = async (req: Request, res: Response): Promise<void> => {
        const product = await this.productsService.create(req.body);
        res.status(201).json(product);
    };

    findAll = async (_req: Request, res: Response): Promise<void> => {
        const products = await this.productsService.findAll();
        res.status(200).json(products);
    };

    findById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const product = await this.productsService.findById(req.params.id);
        res.status(200).json(product);
    };

    findByCategory = async (req: Request<{ category: string }>, res: Response): Promise<void> => {
        const products = await this.productsService.findByCategory(req.params.category);
        res.status(200).json(products);
    };

    update = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const product = await this.productsService.update(req.params.id, req.body);
        res.status(200).json(product);
    };

    delete = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        await this.productsService.delete(req.params.id);
        res.status(204).send();
    };
}
