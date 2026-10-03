import { ObjectId } from "mongodb";

export type InventoryMovementType = "IN" | "OUT" | "ADJUSTMENT";
export type InventoryStatus = "NOT_MANAGED" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface InventoryMovement {
    _id?: ObjectId;
    productId: ObjectId;
    type: InventoryMovementType;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    reference?: string;
    createdBy: ObjectId;
    createdAt: Date;
}

export interface InventoryAdjustmentInput {
    type?: InventoryMovementType;
    quantity?: number;
    reason?: string;
    reference?: string;
}

export interface InventoryItem {
    productId: ObjectId;
    name: string;
    slug: string;
    category: string;
    inventoryManaged: boolean;
    stock: number | null;
    stockAlertThreshold: number;
    status: InventoryStatus;
    updatedAt: Date;
}
