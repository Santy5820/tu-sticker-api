import { ObjectId } from "mongodb";
import { Product, ProductCreateInput, ProductUpdateInput } from "./products.model";
import { ProductsRepository } from "./products.repository";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError";

export class ProductsService {
    private readonly productsRepository = new ProductsRepository();

    async create(data: ProductCreateInput): Promise<Product> {
        const name = this.requireString(data.name, "name");
        const description = this.requireString(data.description, "description");
        const category = this.requireString(data.category, "category");
        const price = this.requirePositiveNumber(data.price, "price");
        const images = Array.isArray(data.images) ? data.images : [];
        const isCustomizable = typeof data.isCustomizable === "boolean" ? data.isCustomizable : false;
        const isActive = typeof data.isActive === "boolean" ? data.isActive : true;
        const inventoryManaged = typeof data.inventoryManaged === "boolean" ? data.inventoryManaged : false;
        const requiresSupplierFallback = typeof data.requiresSupplierFallback === "boolean" ? data.requiresSupplierFallback : false;
        const stock = data.stock !== undefined ? this.requireNonNegativeNumber(data.stock, "stock") : undefined;
        const stockAlertThreshold = data.stockAlertThreshold !== undefined ? this.requireNonNegativeNumber(data.stockAlertThreshold, "stockAlertThreshold") : undefined;

        const slug = this.createSlug(name);
        const existingProduct = await this.productsRepository.findBySlug(slug);
        if (existingProduct) {
            throw new BadRequestError("Ya existe un producto con ese nombre");
        }

        const now = new Date();

        return this.productsRepository.create({
            name,
            slug,
            description,
            price,
            category: category.toLowerCase(),
            images,
            isActive,
            isCustomizable,
            inventoryManaged,
            stock,
            stockAlertThreshold,
            requiresSupplierFallback,
            createdAt: now,
            updatedAt: now,
        });
    }

    async findAll(): Promise<Product[]> {
        return this.productsRepository.findAll();
    }

    async findById(id: string): Promise<Product> {
        const product = await this.productsRepository.findById(this.toObjectId(id));
        if (!product) {
            throw new NotFoundError("Producto no encontrado");
        }
        return product;
    }

    async findByCategory(category: string): Promise<Product[]> {
        const normalizedCategory = this.requireString(category, "category");
        return this.productsRepository.findByCategory(normalizedCategory);
    }

    async update(id: string, data: ProductUpdateInput): Promise<Product> {
        const objectId = this.toObjectId(id);
        const changes: Partial<Product> = {};

        if (data.name !== undefined) {
            changes.name = this.requireString(data.name, "name");
            changes.slug = this.createSlug(changes.name);

            const existingProduct = await this.productsRepository.findBySlug(changes.slug);
            if (existingProduct && !existingProduct._id?.equals(objectId)) {
                throw new BadRequestError("Ya existe un producto con ese nombre");
            }
        }

        if (data.description !== undefined) {
            changes.description = this.requireString(data.description, "description");
        }

        if (data.price !== undefined) {
            changes.price = this.requirePositiveNumber(data.price, "price");
        }

        if (data.category !== undefined) {
            changes.category = this.requireString(data.category, "category").toLowerCase();
        }

        if (data.images !== undefined) {
            if (!Array.isArray(data.images)) {
                throw new BadRequestError("El campo 'images' debe ser un arreglo");
            }
            changes.images = data.images;
        }

        if (data.isActive !== undefined) {
            if (typeof data.isActive !== "boolean") {
                throw new BadRequestError("El campo 'isActive' debe ser booleano");
            }
            changes.isActive = data.isActive;
        }

        if (data.isCustomizable !== undefined) {
            if (typeof data.isCustomizable !== "boolean") {
                throw new BadRequestError("El campo 'isCustomizable' debe ser booleano");
            }
            changes.isCustomizable = data.isCustomizable;
        }

        if (data.inventoryManaged !== undefined) {
            if (typeof data.inventoryManaged !== "boolean") {
                throw new BadRequestError("El campo 'inventoryManaged' debe ser booleano");
            }
            changes.inventoryManaged = data.inventoryManaged;
        }

        if (data.stock !== undefined) {
            changes.stock = this.requireNonNegativeNumber(data.stock, "stock");
        }

        if (data.stockAlertThreshold !== undefined) {
            changes.stockAlertThreshold = this.requireNonNegativeNumber(data.stockAlertThreshold, "stockAlertThreshold");
        }

        if (data.requiresSupplierFallback !== undefined) {
            if (typeof data.requiresSupplierFallback !== "boolean") {
                throw new BadRequestError("El campo 'requiresSupplierFallback' debe ser booleano");
            }
            changes.requiresSupplierFallback = data.requiresSupplierFallback;
        }

        if (Object.keys(changes).length === 0) {
            throw new BadRequestError("No se enviaron campos para actualizar");
        }

        const updatedProduct = await this.productsRepository.update(objectId, changes);
        if (!updatedProduct) {
            throw new NotFoundError("Producto no encontrado");
        }
        return updatedProduct;
    }

    async delete(id: string): Promise<void> {
        const objectId = this.toObjectId(id);
        const product = await this.productsRepository.findById(objectId);
        if (!product) {
            throw new NotFoundError("Producto no encontrado");
        }
        if (!product.isActive) {
            throw new BadRequestError("El producto ya está inactivo");
        }

        const deleted = await this.productsRepository.delete(objectId);
        if (!deleted) {
            throw new NotFoundError("Producto no encontrado");
        }
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== "string" || value.trim() === "") {
            throw new BadRequestError(`El campo '${field}' es obligatorio y debe ser texto no vacío`);
        }
        return value.trim();
    }

    private requirePositiveNumber(value: unknown, field: string): number {
        if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
            throw new BadRequestError(`El campo '${field}' debe ser un número mayor que cero`);
        }
        return value;
    }

    private requireNonNegativeNumber(value: unknown, field: string): number {
        if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
            throw new BadRequestError(`El campo '${field}' debe ser un número mayor o igual a cero`);
        }
        return value;
    }

    private createSlug(value: string): string {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    }

    private toObjectId(id: string): ObjectId {
        if (!ObjectId.isValid(id)) {
            throw new BadRequestError(`Identificador inválido: ${id}`);
        }
        return new ObjectId(id);
    }
}
