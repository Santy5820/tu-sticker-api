import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { ObjectId } from "mongodb";
import { env } from "../../config/env";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "../../shared/errors/AppError";
import { Order } from "../orders/orders.model";
import { OrdersRepository } from "../orders/orders.repository";
import {
    Payment,
    PaymentStatus,
    WompiWebhook,
} from "./payments.model";
import { PaymentsRepository } from "./payments.repository";

const WOMPI_CHECKOUT_URL = "https://checkout.wompi.co/p/";

export class PaymentsService {
    private readonly paymentsRepository = new PaymentsRepository();
    private readonly ordersRepository = new OrdersRepository();

    async createWompiCheckout(
        orderId: string,
        userId: string,
        ip?: string
    ): Promise<{
        payment: Payment;
        checkout: { url: string; method: "GET"; fields: Record<string, string> };
    }> {
        this.ensureWompiEnabled();
        const order = await this.getOrder(orderId, userId);

        if (order.paymentStatus === "PAID") {
            throw new BadRequestError("El pedido ya está pagado");
        }
        if (order.status !== "PENDING_PAYMENT") {
            throw new BadRequestError("El pedido no está disponible para pago");
        }

        const amountInCents = Math.round(order.total * 100);
        if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
            throw new BadRequestError("El total del pedido no es válido para Wompi");
        }

        const reference = `${order.orderNumber}-${cryptoReference()}`;
        const signature = this.createIntegritySignature(reference, amountInCents);
        const publicKey = env.wompiPublicKey;
        if (!publicKey) {
            throw new BadRequestError("WOMPI_PUBLIC_KEY no está configurada");
        }

        const payment = await this.paymentsRepository.create({
            orderId: order._id as ObjectId,
            orderNumber: order.orderNumber,
            userId: order.userId,
            provider: "WOMPI",
            reference,
            amountInCents,
            currency: "COP",
            status: "PENDING",
            environment: this.wompiEnvironment(),
            ip,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const fields: Record<string, string> = {
            "public-key": publicKey,
            currency: "COP",
            "amount-in-cents": String(amountInCents),
            reference,
            "signature:integrity": signature,
        };
        if (env.wompiRedirectUrl) fields["redirect-url"] = env.wompiRedirectUrl;

        return {
            payment,
            checkout: { url: WOMPI_CHECKOUT_URL, method: "GET", fields },
        };
    }

    async findByOrderId(orderId: string, userId: string, isStaff: boolean): Promise<Payment[]> {
        const order = await this.getOrder(orderId, isStaff ? undefined : userId);
        return this.paymentsRepository.findByOrderId(order._id as ObjectId);
    }

    async handleWompiWebhook(payload: WompiWebhook, headerChecksum?: string): Promise<{ processed: boolean }> {
        this.ensureWompiEnabled();
        this.validateWebhookSignature(payload, headerChecksum);

        if (payload.event !== "transaction.updated") {
            return { processed: false };
        }

        const transaction = payload.data?.transaction;
        const reference = transaction?.reference;
        const status = transaction?.status;
        if (
            !reference ||
            !transaction?.id ||
            transaction.amount_in_cents === undefined ||
            !status ||
            !this.isPaymentStatus(status)
        ) {
            throw new BadRequestError("El evento de Wompi no contiene una transacción válida");
        }

        const payment = await this.paymentsRepository.findByReference(reference);
        if (!payment) {
            // El evento es auténtico, pero no corresponde a este comercio/entorno.
            return { processed: false };
        }

        if (
            payment.amountInCents !== transaction.amount_in_cents ||
            transaction.currency !== payment.currency
        ) {
            throw new BadRequestError("El monto o moneda del evento no coincide con el pago");
        }

        if (this.shouldIgnoreStatus(payment.status, status)) {
            return { processed: false };
        }

        const updatedPayment = await this.paymentsRepository.updateStatus(
            payment._id as ObjectId,
            {
                status,
                transactionId: transaction.id,
                paymentMethodType: transaction.payment_method_type,
                statusMessage: transaction.status_message,
            }
        );

        if (!updatedPayment) throw new NotFoundError("Pago no encontrado");

        const order = await this.ordersRepository.findById(payment.orderId);
        if (order) {
            const nextPaymentStatus = status === "APPROVED" ? "PAID" : "CANCELLED";
            const nextOrderStatus =
                status === "APPROVED" && order.status === "PENDING_PAYMENT"
                    ? "CONFIRMED"
                    : order.status;
            await this.ordersRepository.updateStatus(
                order._id as ObjectId,
                nextOrderStatus,
                nextPaymentStatus
            );
        }

        return { processed: true };
    }

    private async getOrder(orderId: string, userId?: string): Promise<Order> {
        const order = await this.ordersRepository.findById(this.toObjectId(orderId, "orderId"));
        if (!order) throw new NotFoundError("Pedido no encontrado");
        if (userId && !order.userId.equals(this.toObjectId(userId, "userId"))) {
            throw new ForbiddenError("No puedes operar pagos de este pedido");
        }
        return order;
    }

    private createIntegritySignature(reference: string, amountInCents: number): string {
        const secret = env.wompiIntegritySecret;
        if (!secret) throw new BadRequestError("WOMPI_INTEGRITY_SECRET no está configurada");
        return createHash("sha256")
            .update(`${reference}${amountInCents}COP${secret}`)
            .digest("hex");
    }

    private validateWebhookSignature(payload: WompiWebhook, headerChecksum?: string): void {
        const secret = env.wompiEventsSecret;
        if (!secret) throw new BadRequestError("WOMPI_EVENTS_SECRET no está configurada");

        const properties = payload.signature?.properties;
        const receivedChecksum = headerChecksum || payload.signature?.checksum;
        if (!properties || !receivedChecksum || payload.timestamp === undefined) {
            throw new UnauthorizedError("El evento de Wompi no contiene una firma válida");
        }

        const values = properties.map((property) => {
            const value = this.getNestedValue(payload.data, property);
            if (value === undefined || value === null) {
                throw new UnauthorizedError("La firma del evento de Wompi no pudo validarse");
            }
            return String(value);
        });

        const expectedChecksum = createHash("sha256")
            .update(`${values.join("")}${payload.timestamp}${secret}`)
            .digest("hex");

        const expectedBuffer = Buffer.from(expectedChecksum, "utf8");
        const receivedBuffer = Buffer.from(receivedChecksum, "utf8");
        if (
            expectedBuffer.length !== receivedBuffer.length ||
            !timingSafeEqual(expectedBuffer, receivedBuffer)
        ) {
            throw new UnauthorizedError("La firma del evento de Wompi no es válida");
        }
    }

    private getNestedValue(value: unknown, path: string): unknown {
        return path.split(".").reduce<unknown>((current, segment) => {
            if (!current || typeof current !== "object") return undefined;
            return (current as Record<string, unknown>)[segment];
        }, value);
    }

    private shouldIgnoreStatus(current: PaymentStatus, next: PaymentStatus): boolean {
        if (current === next) return true;
        if (current === "APPROVED" && next === "PENDING") return true;
        if (current === "VOIDED" && (next === "PENDING" || next === "APPROVED")) return true;
        return false;
    }

    private isPaymentStatus(value: string): value is PaymentStatus {
        return ["PENDING", "APPROVED", "DECLINED", "VOIDED", "ERROR"].includes(value);
    }

    private ensureWompiEnabled(): void {
        if (!env.wompiEnabled) {
            throw new BadRequestError("La integración con Wompi está deshabilitada");
        }
    }

    private wompiEnvironment(): "sandbox" | "production" {
        if (env.wompiEnvironment === "sandbox" || env.wompiEnvironment === "production") {
            return env.wompiEnvironment;
        }
        throw new BadRequestError("WOMPI_ENVIRONMENT debe ser sandbox o production");
    }

    private toObjectId(value: string, field: string): ObjectId {
        if (!ObjectId.isValid(value)) {
            throw new BadRequestError(`Identificador inválido para ${field}: ${value}`);
        }
        return new ObjectId(value);
    }
}

const cryptoReference = (): string =>
    randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
