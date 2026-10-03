import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/database";
import { Product } from "./products.model";

export class ProductsRepository {
    private collection(): Collection<Product> {
        return getDb().collection<Product>("products");
    }

    async create(data: Omit<Product, "_id">): Promise<Product> {
        const now = new Date();
        const product: Product = {
            ...data,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
        };

        const result = await this.collection().insertOne(product);
        return { ...product, _id: result.insertedId };
    }

    async findAll(): Promise<Product[]> {
        return this.collection().find().sort({ createdAt: -1 }).toArray();
    }

    async findById(id: ObjectId): Promise<Product | null> {
        return this.collection().findOne({ _id: id });
    }

    async findBySlug(slug: string): Promise<Product | null> {
        return this.collection().findOne({ slug: slug.toLowerCase() });
    }

    async findByCategory(category: string): Promise<Product[]> {
        return this.collection().find({ category: category.toLowerCase() }).sort({ createdAt: -1 }).toArray();
    }

    async update(id: ObjectId, changes: Partial<Product>): Promise<Product | null> {
        const result = await this.collection().findOneAndUpdate(
            { _id: id },
            { $set: { ...changes, updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        return result ?? null;
    }

    async updateStock(
        id: ObjectId,
        previousStock: number | undefined,
        newStock: number
    ): Promise<Product | null> {
        const stockFilter = previousStock === undefined
            ? { stock: { $exists: false } }
            : { stock: previousStock };

        const result = await this.collection().findOneAndUpdate(
            { _id: id, ...stockFilter },
            { $set: { stock: newStock, updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        return result ?? null;
    }

    async delete(id: ObjectId): Promise<boolean> {
        const result = await this.collection().updateOne(
            { _id: id },
            { $set: { isActive: false, updatedAt: new Date() } }
        );
        return result.matchedCount === 1;
    }

    async countActive(): Promise<number> {
        return this.collection().countDocuments({ isActive: true });
    }
}
