import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/database";
import { Payment } from "./payments.model";

export class PaymentsRepository {
    private collection(): Collection<Payment> {
        return getDb().collection<Payment>("payments");
    }

    private async ensureIndexes(): Promise<void> {
        await this.collection().createIndex(
            { reference: 1 },
            { unique: true, name: "payments_reference_unique" }
        );
        await this.collection().createIndex(
            { orderId: 1, createdAt: -1 },
            { name: "payments_order_created_at" }
        );
    }

    async create(data: Omit<Payment, "_id">): Promise<Payment> {
        await this.ensureIndexes();
        const result = await this.collection().insertOne(data);
        return { _id: result.insertedId, ...data };
    }

    async findByReference(reference: string): Promise<Payment | null> {
        return this.collection().findOne({ reference });
    }

    async findLatestByOrderId(orderId: ObjectId): Promise<Payment | null> {
        return this.collection().findOne({ orderId }, { sort: { createdAt: -1 } });
    }

    async findByOrderId(orderId: ObjectId): Promise<Payment[]> {
        return this.collection().find({ orderId }).sort({ createdAt: -1 }).toArray();
    }

    async updateStatus(
        id: ObjectId,
        changes: Pick<Payment, "status" | "transactionId" | "paymentMethodType" | "statusMessage">
    ): Promise<Payment | null> {
        const result = await this.collection().findOneAndUpdate(
            { _id: id },
            { $set: { ...changes, updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        return result ?? null;
    }
}
