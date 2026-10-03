import { ObjectId } from "mongodb";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError";
import { Category, CategoryCreateInput, CategoryUpdateInput } from "./categories.model";
import { CategoriesRepository } from "./categories.repository";

export class CategoriesService {
    private readonly categoriesRepository = new CategoriesRepository();

    async create(data: CategoryCreateInput): Promise<Category> {
        const name = this.requireString(data.name, "name");
        const slug = this.createSlug(name);
        const existingCategory = await this.categoriesRepository.findBySlug(slug, true);

        if (existingCategory) {
            throw new BadRequestError("Ya existe una categoría con ese nombre");
        }

        const now = new Date();
        try {
            return await this.categoriesRepository.create({
                name,
                slug,
                description: this.normalizeOptionalString(data.description, "description"),
                isActive: data.isActive ?? true,
                createdAt: now,
                updatedAt: now,
            });
        } catch (error: unknown) {
            if (this.isDuplicateKeyError(error)) {
                throw new BadRequestError("Ya existe una categoría con ese nombre");
            }
            throw error;
        }
    }

    async findAll(): Promise<Category[]> {
        return this.categoriesRepository.findAll(false);
    }

    async findAllForAdmin(): Promise<Category[]> {
        return this.categoriesRepository.findAll(true);
    }

    async findById(id: string, includeInactive = false): Promise<Category> {
        const category = await this.categoriesRepository.findById(this.toObjectId(id), includeInactive);
        if (!category) {
            throw new NotFoundError("Categoría no encontrada");
        }
        return category;
    }

    async findBySlug(slug: string): Promise<Category> {
        const normalizedSlug = this.requireString(slug, "slug").toLowerCase();
        const category = await this.categoriesRepository.findBySlug(normalizedSlug);
        if (!category) {
            throw new NotFoundError("Categoría no encontrada");
        }
        return category;
    }

    async update(id: string, data: CategoryUpdateInput): Promise<Category> {
        const objectId = this.toObjectId(id);
        const changes: Partial<Category> = {};

        if (data.name !== undefined) {
            changes.name = this.requireString(data.name, "name");
            changes.slug = this.createSlug(changes.name);

            const existingCategory = await this.categoriesRepository.findBySlug(changes.slug, true);
            if (existingCategory && !existingCategory._id?.equals(objectId)) {
                throw new BadRequestError("Ya existe una categoría con ese nombre");
            }
        }

        if (data.description !== undefined) {
            changes.description = this.normalizeOptionalString(data.description, "description");
        }

        if (data.isActive !== undefined) {
            if (typeof data.isActive !== "boolean") {
                throw new BadRequestError("El campo 'isActive' debe ser booleano");
            }
            changes.isActive = data.isActive;
        }

        if (Object.keys(changes).length === 0) {
            throw new BadRequestError("No se enviaron campos para actualizar");
        }

        try {
            const updatedCategory = await this.categoriesRepository.update(objectId, changes);
            if (!updatedCategory) {
                throw new NotFoundError("Categoría no encontrada");
            }
            return updatedCategory;
        } catch (error: unknown) {
            if (this.isDuplicateKeyError(error)) {
                throw new BadRequestError("Ya existe una categoría con ese nombre");
            }
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        const objectId = this.toObjectId(id);
        const category = await this.categoriesRepository.findById(objectId, true);

        if (!category) {
            throw new NotFoundError("Categoría no encontrada");
        }

        if (!category.isActive) {
            throw new BadRequestError("La categoría ya está inactiva");
        }

        const deleted = await this.categoriesRepository.delete(objectId);
        if (!deleted) {
            throw new NotFoundError("Categoría no encontrada");
        }
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== "string" || value.trim() === "") {
            throw new BadRequestError(`El campo '${field}' es obligatorio y debe ser texto no vacío`);
        }
        return value.trim();
    }

    private normalizeOptionalString(value: unknown, field: string): string | undefined {
        if (value === undefined || value === null || value === "") {
            return undefined;
        }
        if (typeof value !== "string") {
            throw new BadRequestError(`El campo '${field}' debe ser texto`);
        }
        const normalized = value.trim();
        return normalized === "" ? undefined : normalized;
    }

    private createSlug(value: string): string {
        const slug = value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");

        if (!slug) {
            throw new BadRequestError("El nombre no permite generar un slug válido");
        }

        return slug;
    }

    private toObjectId(id: string): ObjectId {
        if (!ObjectId.isValid(id)) {
            throw new BadRequestError(`Identificador inválido: ${id}`);
        }
        return new ObjectId(id);
    }

    private isDuplicateKeyError(error: unknown): boolean {
        return (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: unknown }).code === 11000
        );
    }
}
