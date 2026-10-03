import { ObjectId } from "mongodb";

export type UserRole =
    | "CUSTOMER"
    | "ADMIN"
    | "SALES"
    | "DESIGNER"
    | "PRODUCTION";

export interface User {
    _id?: ObjectId;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    customerId?: ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface RegisterInput {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    customerId?: string;
    phone?: string;
    address?: Record<string, unknown>;
}

export interface LoginInput {
    email?: string;
    password?: string;
}
