import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/database";
import { Cart } from "./cart.model";

export class CartRepository {
    private indexesPromise: Promise<void> | undefined;

    private collection(): Collection<Cart> {
        return getDb().collection<Cart>("carts");
    }

    async findByUserId(userId: ObjectId): Promise<Cart | null> {
        return this.collection().findOne({ userId });
    }

    async findByGuestId(guestId: string): Promise<Cart | null> {
        return this.collection().findOne({ guestId });
    }

    async deleteByGuestId(guestId: string): Promise<void> {
        await this.collection().deleteOne({ guestId });
    }

    async save(cart: Omit<Cart, "_id">): Promise<Cart> {
        await this.ensureIndexes();

        const ownerFilter = cart.userId ? { userId: cart.userId } : { guestId: cart.guestId };
        const fields = {
            items: cart.items,
            subtotal: cart.subtotal,
            total: cart.total,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
            ...(cart.userId ? { userId: cart.userId } : { guestId: cart.guestId }),
        };

        const result = await this.collection().findOneAndUpdate(
            ownerFilter,
            { $set: fields },
            { upsert: true, returnDocument: "after" }
        );

        if (!result) {
            throw new Error("No fue posible guardar el carrito");
        }

        return result;
    }

    private async ensureIndexes(): Promise<void> {
        if (!this.indexesPromise) {
            this.indexesPromise = this.createIndexes();
        }
        await this.indexesPromise;
    }

    private async createIndexes(): Promise<void> {
        const collection = this.collection();

        // Compatibilidad con la primera versión del carrito, que solo tenía userId.
        try {
            await collection.dropIndex("carts_user_unique");
        } catch (error: unknown) {
            const code = typeof error === "object" && error !== null && "code" in error
                ? (error as { code?: unknown }).code
                : undefined;
            if (code !== 26 && code !== 27) {
                throw error;
            }
        }

        await collection.createIndex(
            { userId: 1 },
            { unique: true, sparse: true, name: "carts_user_unique" }
        );
        await collection.createIndex(
            { guestId: 1 },
            { unique: true, sparse: true, name: "carts_guest_unique" }
        );
    }
}
