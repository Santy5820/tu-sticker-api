import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/database";
import { Category } from "./categories.model";

export class CategoriesRepository {
    private collection(): Collection<Category> {
        return getDb().collection<Category>("categories");
    }

    private async ensureIndexes(): Promise<void> {
        await this.collection().createIndex(
            { slug: 1 },
            { unique: true, name: "categories_slug_unique" }
        );
    }

    async create(data: Omit<Category, "_id">): Promise<Category> {
        await this.ensureIndexes();

        const result = await this.collection().insertOne(data);
        return { _id: result.insertedId, ...data };
    }

    async findAll(includeInactive = false): Promise<Category[]> {
        const filter = includeInactive ? {} : { isActive: true };
        return this.collection().find(filter).sort({ name: 1 }).toArray();
    }

    async findById(id: ObjectId, includeInactive = false): Promise<Category | null> {
        const filter = includeInactive ? { _id: id } : { _id: id, isActive: true };
        return this.collection().findOne(filter);
    }

    async findBySlug(slug: string, includeInactive = false): Promise<Category | null> {
        const filter = includeInactive ? { slug } : { slug, isActive: true };
        return this.collection().findOne(filter);
    }

    async update(id: ObjectId, changes: Partial<Category>): Promise<Category | null> {
        await this.ensureIndexes();

        const result = await this.collection().findOneAndUpdate(
            { _id: id },
            { $set: { ...changes, updatedAt: new Date() } },
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
}
