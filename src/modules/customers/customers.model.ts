import { ObjectId } from "mongodb";

export interface CustomerAddress {
    alias?: string;
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
    isDefault?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Customer {
    _id?: ObjectId;
    userId?: ObjectId;
    firstName: string;
    lastName: string;
    fullName?: string;
    email: string;
    phone?: string;
    addresses: CustomerAddress[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CustomerCreateInput {
    userId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    addresses?: CustomerAddress[];
    isActive?: boolean;
}

export type CustomerUpdateInput = Partial<CustomerCreateInput>;
