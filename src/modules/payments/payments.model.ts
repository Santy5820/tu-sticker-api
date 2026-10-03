import { ObjectId } from "mongodb";

export type PaymentProvider = "WOMPI";
export type PaymentStatus = "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";

export interface Payment {
    _id?: ObjectId;
    orderId: ObjectId;
    orderNumber: string;
    userId: ObjectId;
    provider: PaymentProvider;
    reference: string;
    transactionId?: string;
    amountInCents: number;
    currency: "COP";
    status: PaymentStatus;
    paymentMethodType?: string;
    statusMessage?: string;
    environment: "sandbox" | "production";
    ip?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WompiWebhook {
    event?: string;
    data?: {
        transaction?: {
            id?: string;
            reference?: string;
            amount_in_cents?: number;
            currency?: string;
            status?: PaymentStatus;
            payment_method_type?: string;
            status_message?: string;
        };
    };
    environment?: string;
    signature?: {
        properties?: string[];
        checksum?: string;
    };
    timestamp?: number;
}
