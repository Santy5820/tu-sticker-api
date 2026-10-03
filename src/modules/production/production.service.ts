import { ObjectId } from "mongodb";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError";
import { Order } from "../orders/orders.model";
import { OrdersRepository } from "../orders/orders.repository";
import {
    ProductionAssignmentInput,
    ProductionCreateInput,
    ProductionJob,
    ProductionNotesInput,
    ProductionPriority,
    ProductionStatus,
    ProductionStatusInput,
} from "./production.model";
import { ProductionRepository } from "./production.repository";

export class ProductionService {
    private readonly productionRepository = new ProductionRepository();
    private readonly ordersRepository = new OrdersRepository();

    async createJobsForOrder(
        orderId: string,
        data: ProductionCreateInput = {},
        userId: string
    ): Promise<ProductionJob[]> {
        const order = await this.getOrder(orderId);
        if (order.status === "CANCELLED" || order.status === "DELIVERED") {
            throw new BadRequestError("No se pueden crear trabajos para este pedido");
        }

        const priority = this.requirePriority(data.priority ?? "NORMAL");
        const notes = this.normalizeOptionalString(data.notes, "notes");
        const existingJobs = await this.productionRepository.findByOrderId(order._id as ObjectId);
        const existingProductIds = new Set(existingJobs.map((job) => String(job.productId)));

        for (const item of order.items) {
            if (existingProductIds.has(String(item.productId))) continue;

            try {
                await this.productionRepository.create({
                    jobNumber: this.createJobNumber(),
                    orderId: order._id as ObjectId,
                    orderNumber: order.orderNumber,
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    status: "PENDING",
                    priority,
                    notes,
                    createdBy: this.toObjectId(userId, "userId"),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            } catch (error: unknown) {
                if (!this.isDuplicateKeyError(error)) throw error;
            }
        }

        return this.productionRepository.findByOrderId(order._id as ObjectId);
    }

    async findQueue(
        status?: string,
        priority?: string
    ): Promise<ProductionJob[]> {
        const normalizedStatus = status ? this.requireStatus(status) : undefined;
        const normalizedPriority = priority ? this.requirePriority(priority) : undefined;
        return this.productionRepository.findByStatusAndPriority(normalizedStatus, normalizedPriority);
    }

    async findById(id: string): Promise<ProductionJob> {
        const job = await this.productionRepository.findById(this.toObjectId(id));
        if (!job) throw new NotFoundError("Trabajo de producción no encontrado");
        return job;
    }

    async findByOrderId(orderId: string): Promise<ProductionJob[]> {
        const order = await this.getOrder(orderId);
        return this.productionRepository.findByOrderId(order._id as ObjectId);
    }

    async updateStatus(
        id: string,
        data: ProductionStatusInput = {}
    ): Promise<ProductionJob> {
        const job = await this.findById(id);
        const nextStatus = this.requireStatus(data.status);
        this.validateTransition(job.status, nextStatus);

        const now = new Date();
        const changes: Partial<ProductionJob> = {
            status: nextStatus,
            notes: data.notes !== undefined
                ? this.normalizeOptionalString(data.notes, "notes")
                : job.notes,
        };

        if (nextStatus === "IN_PRODUCTION" && !job.startedAt) changes.startedAt = now;
        if (nextStatus === "COMPLETED") changes.completedAt = now;

        const updated = await this.productionRepository.update(job._id as ObjectId, changes);
        if (!updated) throw new NotFoundError("Trabajo de producción no encontrado");

        await this.syncOrderStatus(updated.orderId);
        return updated;
    }

    async assign(
        id: string,
        data: ProductionAssignmentInput = {}
    ): Promise<ProductionJob> {
        const job = await this.findById(id);
        const assignedTo = data.assignedTo === null || data.assignedTo === undefined
            ? undefined
            : this.toObjectId(data.assignedTo, "assignedTo");
        const updated = await this.productionRepository.update(job._id as ObjectId, { assignedTo });
        if (!updated) throw new NotFoundError("Trabajo de producción no encontrado");
        return updated;
    }

    async updateNotes(id: string, data: ProductionNotesInput = {}): Promise<ProductionJob> {
        const job = await this.findById(id);
        const notes = this.normalizeOptionalString(data.notes, "notes");
        const updated = await this.productionRepository.update(job._id as ObjectId, { notes });
        if (!updated) throw new NotFoundError("Trabajo de producción no encontrado");
        return updated;
    }

    private async syncOrderStatus(orderId: ObjectId): Promise<void> {
        const jobs = await this.productionRepository.findByOrderId(orderId);
        const order = await this.ordersRepository.findById(orderId);
        if (!order || jobs.length === 0) return;

        if (
            jobs.some((job) => job.status === "IN_PRODUCTION" || job.status === "QUALITY_CHECK") &&
            order.status === "CONFIRMED"
        ) {
            await this.ordersRepository.updateStatus(orderId, "IN_PRODUCTION", order.paymentStatus);
            return;
        }

        if (
            jobs.every((job) => job.status === "COMPLETED") &&
            (order.status === "CONFIRMED" || order.status === "IN_PRODUCTION")
        ) {
            await this.ordersRepository.updateStatus(orderId, "READY", order.paymentStatus);
        }
    }

    private async getOrder(orderId: string): Promise<Order> {
        const order = await this.ordersRepository.findById(this.toObjectId(orderId, "orderId"));
        if (!order) throw new NotFoundError("Pedido no encontrado");
        return order;
    }

    private validateTransition(current: ProductionStatus, next: ProductionStatus): void {
        const transitions: Record<ProductionStatus, ProductionStatus[]> = {
            PENDING: ["DESIGN", "READY_FOR_PRODUCTION", "CANCELLED"],
            DESIGN: ["READY_FOR_PRODUCTION", "CANCELLED"],
            READY_FOR_PRODUCTION: ["IN_PRODUCTION", "CANCELLED"],
            IN_PRODUCTION: ["QUALITY_CHECK", "CANCELLED"],
            QUALITY_CHECK: ["IN_PRODUCTION", "COMPLETED", "CANCELLED"],
            COMPLETED: [],
            CANCELLED: [],
        };
        if (!transitions[current].includes(next)) {
            throw new BadRequestError(`No se puede cambiar un trabajo de ${current} a ${next}`);
        }
    }

    private requireStatus(value: unknown): ProductionStatus {
        const statuses: ProductionStatus[] = [
            "PENDING",
            "DESIGN",
            "READY_FOR_PRODUCTION",
            "IN_PRODUCTION",
            "QUALITY_CHECK",
            "COMPLETED",
            "CANCELLED",
        ];
        if (typeof value !== "string" || !statuses.includes(value as ProductionStatus)) {
            throw new BadRequestError("El estado de producción no es válido");
        }
        return value as ProductionStatus;
    }

    private requirePriority(value: unknown): ProductionPriority {
        const priorities: ProductionPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
        if (typeof value !== "string" || !priorities.includes(value as ProductionPriority)) {
            throw new BadRequestError("La prioridad de producción no es válida");
        }
        return value as ProductionPriority;
    }

    private normalizeOptionalString(value: unknown, field: string): string | undefined {
        if (value === undefined || value === null || value === "") return undefined;
        if (typeof value !== "string") throw new BadRequestError(`El campo '${field}' debe ser texto`);
        return value.trim() || undefined;
    }

    private toObjectId(value: string, field = "id"): ObjectId {
        if (!ObjectId.isValid(value)) {
            throw new BadRequestError(`Identificador inválido para ${field}: ${value}`);
        }
        return new ObjectId(value);
    }

    private createJobNumber(): string {
        return `PR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${
            Math.random().toString(36).slice(2, 8).toUpperCase()
        }`;
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
