import { ObjectId } from "mongodb";

export type ProductionStatus =
    | "PENDING"
    | "DESIGN"
    | "READY_FOR_PRODUCTION"
    | "IN_PRODUCTION"
    | "QUALITY_CHECK"
    | "COMPLETED"
    | "CANCELLED";

export type ProductionPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface ProductionJob {
    _id?: ObjectId;
    jobNumber: string;
    orderId: ObjectId;
    orderNumber: string;
    productId: ObjectId;
    productName: string;
    quantity: number;
    status: ProductionStatus;
    priority: ProductionPriority;
    assignedTo?: ObjectId;
    notes?: string;
    createdBy: ObjectId;
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

export interface ProductionCreateInput {
    priority?: ProductionPriority;
    notes?: string;
}

export interface ProductionStatusInput {
    status?: ProductionStatus;
    notes?: string;
}

export interface ProductionAssignmentInput {
    assignedTo?: string | null;
}

export interface ProductionNotesInput {
    notes?: string;
}
