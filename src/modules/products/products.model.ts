import { ObjectId } from "mongodb";

export interface Product {
    _id?: ObjectId;
    name: string;
    slug: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    isActive: boolean;
    isCustomizable: boolean;
    inventoryManaged?: boolean;
    stock?: number;
    stockAlertThreshold?: number;
    requiresSupplierFallback?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductCreateInput {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    images?: string[];
    isActive?: boolean;
    isCustomizable?: boolean;
    inventoryManaged?: boolean;
    stock?: number;
    stockAlertThreshold?: number;
    requiresSupplierFallback?: boolean;
}

export type ProductUpdateInput = Partial<ProductCreateInput>;
