import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/database";
import { Customer } from "./customers.model";

export class CustomersRepository {
    private collection(): Collection<Customer> {
        return getDb().collection<Customer>("customers");
    }

    async create(data: Omit<Customer, "_id">): Promise<Customer> {
        const now = new Date();
        const customer: Customer = {
            ...data,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
        };

        const result = await this.collection().insertOne(customer);
        return { ...customer, _id: result.insertedId };
    }

    async findAll(): Promise<Customer[]> {
        return this.collection().find({}).sort({ createdAt: -1 }).toArray();
    }

    async findByStatus(isActive: boolean): Promise<Customer[]> {
        return this.collection().find({ isActive }).sort({ createdAt: -1 }).toArray();
    }

    async findById(id: ObjectId): Promise<Customer | null> {
        return this.collection().findOne({ _id: id });
    }

    async findByUserId(userId: ObjectId): Promise<Customer | null> {
        return this.collection().findOne({ userId, isActive: true });
    }

    async findByEmail(email: string, includeInactive = false): Promise<Customer | null> {
        const normalizedEmail = email.trim().toLowerCase();
        const filter = includeInactive ? { email: normalizedEmail } : { email: normalizedEmail, isActive: true };
        return this.collection().findOne(filter);
    }

    async update(id: ObjectId, changes: Partial<Customer>): Promise<Customer | null> {
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
