import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/database";
import { InventoryMovement } from "./inventory.model";

export class InventoryRepository {
    private collection(): Collection<InventoryMovement> {
        return getDb().collection<InventoryMovement>("inventory_movements");
    }

    async createMovement(data: Omit<InventoryMovement, "_id">): Promise<InventoryMovement> {
        await this.collection().createIndex(
            { productId: 1, createdAt: -1 },
            { name: "inventory_product_created_at" }
        );

        const result = await this.collection().insertOne(data);
        return { _id: result.insertedId, ...data };
    }

    async findMovementsByProductId(productId: ObjectId): Promise<InventoryMovement[]> {
        return this.collection()
            .find({ productId })
            .sort({ createdAt: -1 })
            .toArray();
    }
}
