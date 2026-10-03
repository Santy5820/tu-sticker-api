import { Request, Response } from "express";
import { CategoriesService } from "./categories.service";

export class CategoriesController {
    private readonly categoriesService = new CategoriesService();

    create = async (req: Request, res: Response): Promise<void> => {
        const category = await this.categoriesService.create(req.body);
        res.status(201).json(category);
    };

    findAll = async (_req: Request, res: Response): Promise<void> => {
        const categories = await this.categoriesService.findAll();
        res.status(200).json(categories);
    };

    findAllForAdmin = async (_req: Request, res: Response): Promise<void> => {
        const categories = await this.categoriesService.findAllForAdmin();
        res.status(200).json(categories);
    };

    findById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const category = await this.categoriesService.findById(req.params.id);
        res.status(200).json(category);
    };

    findBySlug = async (req: Request<{ slug: string }>, res: Response): Promise<void> => {
        const category = await this.categoriesService.findBySlug(req.params.slug);
        res.status(200).json(category);
    };

    update = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const category = await this.categoriesService.update(req.params.id, req.body);
        res.status(200).json(category);
    };

    delete = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        await this.categoriesService.delete(req.params.id);
        res.status(204).send();
    };
}
