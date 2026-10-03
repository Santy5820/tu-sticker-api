import { ObjectId } from "mongodb";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError";
import { Product } from "../products/products.model";
import { ProductsRepository } from "../products/products.repository";
import {
    InventoryAdjustmentInput,
    InventoryItem,
    InventoryMovement,
    InventoryMovementType,
    InventoryStatus,
} from "./inventory.model";
import { InventoryRepository } from "./inventory.repository";

export class InventoryService {
    private readonly inventoryRepository = new InventoryRepository();
    private readonly productsRepository = new ProductsRepository();

    async findAll(): Promise<InventoryItem[]> {
        const products = await this.productsRepository.findAll();
        return products.map((product) => this.toInventoryItem(product));
    }

    async findByProductId(productId: string): Promise<InventoryItem> {
        const product = await this.findProduct(productId);
        return this.toInventoryItem(product);
    }

    async findMovements(productId: string): Promise<InventoryMovement[]> {
        const productObjectId = this.toObjectId(productId);
        await this.findProduct(productId);
        return this.inventoryRepository.findMovementsByProductId(productObjectId);
    }

    async adjustStock(
        productId: string,
        data: InventoryAdjustmentInput,
        userId: string
    ): Promise<{ inventory: InventoryItem; movement: InventoryMovement }> {
        const productObjectId = this.toObjectId(productId);
        const product = await this.findProduct(productId);

        if (!product.inventoryManaged) {
            throw new BadRequestError(
                "El producto no tiene el inventario administrado; actívalo antes de registrar movimientos"
            );
        }

        const type = this.requireMovementType(data.type);
        const quantity = this.requireQuantity(data.quantity);
        const reason = this.requireString(data.reason, "reason");
        const reference = this.normalizeOptionalString(data.reference, "reference");
        const previousStock = product.stock ?? 0;
        const newStock = this.calculateNewStock(type, previousStock, quantity);

        if (newStock === previousStock) {
            throw new BadRequestError("El movimiento no cambia el stock actual");
        }

        const updatedProduct = await this.productsRepository.updateStock(
            productObjectId,
            product.stock,
            newStock
        );

        if (!updatedProduct) {
            throw new BadRequestError("El stock cambió durante la operación; intenta nuevamente");
        }

        const movement = await this.inventoryRepository.createMovement({
            productId: productObjectId,
            type,
            quantity: type === "ADJUSTMENT" ? Math.abs(newStock - previousStock) : quantity,
            previousStock,
            newStock,
            reason,
            reference,
            createdBy: this.toObjectId(userId, "userId"),
            createdAt: new Date(),
        });

        return {
            inventory: this.toInventoryItem(updatedProduct),
            movement,
        };
    }

    private async findProduct(productId: string): Promise<Product> {
        const product = await this.productsRepository.findById(this.toObjectId(productId));
        if (!product) {
            throw new NotFoundError("Producto no encontrado");
        }
        return product;
    }

    private toInventoryItem(product: Product): InventoryItem {
        const stock = product.stock ?? 0;
        const stockAlertThreshold = product.stockAlertThreshold ?? 0;

        return {
            productId: product._id as ObjectId,
            name: product.name,
            slug: product.slug,
            category: product.category,
            inventoryManaged: product.inventoryManaged ?? false,
            stock: product.inventoryManaged ? stock : null,
            stockAlertThreshold,
            status: this.getStatus(product.inventoryManaged ?? false, stock, stockAlertThreshold),
            updatedAt: product.updatedAt,
        };
    }

    private getStatus(
        inventoryManaged: boolean,
        stock: number,
        stockAlertThreshold: number
    ): InventoryStatus {
        if (!inventoryManaged) return "NOT_MANAGED";
        if (stock <= 0) return "OUT_OF_STOCK";
        if (stockAlertThreshold > 0 && stock <= stockAlertThreshold) return "LOW_STOCK";
        return "IN_STOCK";
    }

    private calculateNewStock(
        type: InventoryMovementType,
        previousStock: number,
        quantity: number
    ): number {
        if (type === "IN") return previousStock + quantity;
        if (type === "OUT") {
            const newStock = previousStock - quantity;
            if (newStock < 0) {
                throw new BadRequestError("El movimiento dejaría el inventario en un valor negativo");
            }
            return newStock;
        }
        return quantity;
    }

    private requireMovementType(value: unknown): InventoryMovementType {
        if (value !== "IN" && value !== "OUT" && value !== "ADJUSTMENT") {
            throw new BadRequestError("El tipo de movimiento debe ser IN, OUT o ADJUSTMENT");
        }
        return value;
    }

    private requireQuantity(value: unknown): number {
        if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
            throw new BadRequestError("La cantidad debe ser un número entero mayor que cero");
        }
        return value;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== "string" || value.trim() === "") {
            throw new BadRequestError(`El campo '${field}' es obligatorio y debe ser texto no vacío`);
        }
        return value.trim();
    }

    private normalizeOptionalString(value: unknown, field: string): string | undefined {
        if (value === undefined || value === null || value === "") return undefined;
        if (typeof value !== "string") {
            throw new BadRequestError(`El campo '${field}' debe ser texto`);
        }
        return value.trim() || undefined;
    }

    private toObjectId(value: string, field = "id"): ObjectId {
        if (!ObjectId.isValid(value)) {
            throw new BadRequestError(`Identificador inválido para ${field}: ${value}`);
        }
        return new ObjectId(value);
    }
}
