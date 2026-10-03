import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/database";
import { ProductionJob, ProductionPriority, ProductionStatus } from "./production.model";

export class ProductionRepository {
    private collection(): Collection<ProductionJob> {
        return getDb().collection<ProductionJob>("production_jobs");
    }

    private async ensureIndexes(): Promise<void> {
        await this.collection().createIndex(
            { jobNumber: 1 },
            { unique: true, name: "production_job_number_unique" }
        );
        await this.collection().createIndex(
            { orderId: 1, productId: 1 },
            { unique: true, name: "production_order_product_unique" }
        );
        await this.collection().createIndex(
            { status: 1, priority: -1, createdAt: 1 },
            { name: "production_queue_index" }
        );
    }

    async create(data: Omit<ProductionJob, "_id">): Promise<ProductionJob> {
        await this.ensureIndexes();
        const result = await this.collection().insertOne(data);
        return { _id: result.insertedId, ...data };
    }

    async findById(id: ObjectId): Promise<ProductionJob | null> {
        return this.collection().findOne({ _id: id });
    }

    async findByOrderId(orderId: ObjectId): Promise<ProductionJob[]> {
        return this.collection().find({ orderId }).sort({ createdAt: 1 }).toArray();
    }

    async findAll(status?: ProductionStatus): Promise<ProductionJob[]> {
        const filter = status ? { status } : {};
        return this.collection()
            .find(filter)
            .sort({ priority: -1, createdAt: 1 })
            .toArray();
    }

    async update(
        id: ObjectId,
        changes: Partial<ProductionJob>
    ): Promise<ProductionJob | null> {
        const setChanges: Partial<ProductionJob> = {};
        const unsetChanges: Record<string, ""> = {};

        for (const [key, value] of Object.entries(changes)) {
            if (value === undefined) {
                unsetChanges[key] = "";
            } else {
                (setChanges as Record<string, unknown>)[key] = value;
            }
        }

        const update = {
            ...(Object.keys(setChanges).length > 0 ? { $set: setChanges } : {}),
            ...(Object.keys(unsetChanges).length > 0 ? { $unset: unsetChanges } : {}),
            $currentDate: { updatedAt: true as const },
        };

        const result = await this.collection().findOneAndUpdate(
            { _id: id },
            update,
            { returnDocument: "after" }
        );
        return result ?? null;
    }

    async findByStatusAndPriority(
        status?: ProductionStatus,
        priority?: ProductionPriority
    ): Promise<ProductionJob[]> {
        const filter = {
            ...(status ? { status } : {}),
            ...(priority ? { priority } : {}),
        };
        return this.collection().find(filter).sort({ createdAt: 1 }).toArray();
    }
}
