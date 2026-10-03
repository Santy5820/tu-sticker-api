import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/database";
import { User } from "./auth.model";

export class AuthRepository {
    private collection(): Collection<User> {
        return getDb().collection<User>("users");
    }

    async create(data: Omit<User, "_id">): Promise<User> {
        const now = new Date();
        const user: User = {
            ...data,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
        };

        const result = await this.collection().insertOne(user);
        return { ...user, _id: result.insertedId };
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.collection().findOne({ email: email.toLowerCase() });
    }

    async findById(id: ObjectId): Promise<User | null> {
        return this.collection().findOne({ _id: id });
    }
}
