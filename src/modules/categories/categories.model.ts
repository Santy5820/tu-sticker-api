import { ObjectId } from "mongodb";

export interface Category {
    _id?: ObjectId;
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CategoryCreateInput {
    name?: string;
    description?: string;
    isActive?: boolean;
}

export type CategoryUpdateInput = Partial<CategoryCreateInput>;
