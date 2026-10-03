import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors/AppError";
import { CartRepository } from "../cart/cart.repository";
import { Customer, CustomerAddress } from "../customers/customers.model";
import { CustomersRepository } from "../customers/customers.repository";
import { InventoryRepository } from "../inventory/inventory.repository";
import { Product } from "../products/products.model";
import { ProductsRepository } from "../products/products.repository";
import {
    Order,
    OrderAddress,
    OrderCreateInput,
    OrderItem,
    OrderStatus,
    OrderStatusInput,
} from "./orders.model";
import { OrdersRepository } from "./orders.repository";

export class OrdersService {
    private readonly ordersRepository = new OrdersRepository();
    private readonly cartRepository = new CartRepository();
    private readonly customersRepository = new CustomersRepository();
    private readonly productsRepository = new ProductsRepository();
    private readonly inventoryRepository = new InventoryRepository();

    async create(userId: string, data: OrderCreateInput = {}): Promise<Order> {
        const userObjectId = this.toObjectId(userId, "userId");
        const customer = await this.getCustomer(userObjectId);
        const cart = await this.cartRepository.findByUserId(userObjectId);

        if (!cart || cart.items.length === 0) {
            throw new BadRequestError("No puedes crear un pedido con el carrito vacío");
        }

        const address = await this.resolveAddress(customer, data);
        const orderNumber = this.createOrderNumber();
        const stockChanges: Array<{ product: Product; previousStock: number | undefined; newStock: number }> = [];

        try {
            const items: OrderItem[] = [];

            for (const cartItem of cart.items) {
                const product = await this.getAvailableProduct(cartItem.productId);
                const item: OrderItem = {
                    productId: product._id as ObjectId,
                    productName: product.name,
                    productSlug: product.slug,
                    quantity: cartItem.quantity,
                    unitPrice: product.price,
                    subtotal: product.price * cartItem.quantity,
                };
                items.push(item);

                if (product.inventoryManaged) {
                    const previousStock = product.stock;
                    const currentStock = product.stock ?? 0;
                    const newStock = currentStock - cartItem.quantity;

                    if (newStock < 0) {
                        throw new BadRequestError(`Stock insuficiente para el producto '${product.name}'`);
                    }

                    const updatedProduct = await this.productsRepository.updateStock(
                        product._id as ObjectId,
                        previousStock,
                        newStock
                    );

                    if (!updatedProduct) {
                        throw new BadRequestError(
                            `El stock de '${product.name}' cambió durante la operación; intenta nuevamente`
                        );
                    }

                    stockChanges.push({ product, previousStock, newStock });
                    await this.inventoryRepository.createMovement({
                        productId: product._id as ObjectId,
                        type: "OUT",
                        quantity: cartItem.quantity,
                        previousStock: currentStock,
                        newStock,
                        reason: `Pedido ${orderNumber}`,
                        reference: orderNumber,
                        createdBy: userObjectId,
                        createdAt: new Date(),
                    });
                }
            }

            const subtotal = items.reduce((total, item) => total + item.subtotal, 0);
            const now = new Date();
            const order = await this.ordersRepository.create({
                orderNumber,
                userId: userObjectId,
                customerId: customer._id as ObjectId,
                items,
                address,
                subtotal,
                total: subtotal,
                status: "PENDING_PAYMENT",
                paymentStatus: "PENDING",
                createdAt: now,
                updatedAt: now,
            });

            await this.cartRepository.save({
                userId: userObjectId,
                items: [],
                subtotal: 0,
                total: 0,
                createdAt: cart.createdAt,
                updatedAt: new Date(),
            });

            return order;
        } catch (error: unknown) {
            await this.rollbackStock(stockChanges, userObjectId, orderNumber);
            throw error;
        }
    }

    async findMine(userId: string): Promise<Order[]> {
        return this.ordersRepository.findByUserId(this.toObjectId(userId, "userId"));
    }

    async findAll(status?: OrderStatus): Promise<Order[]> {
        return this.ordersRepository.findAll(status);
    }

    async findById(id: string, userId?: string): Promise<Order> {
        const order = await this.ordersRepository.findById(this.toObjectId(id));
        if (!order) {
            throw new NotFoundError("Pedido no encontrado");
        }

        if (userId && !order.userId.equals(this.toObjectId(userId, "userId"))) {
            throw new ForbiddenError("No puedes consultar este pedido");
        }

        return order;
    }

    async updateStatus(id: string, data: OrderStatusInput): Promise<Order> {
        const order = await this.findById(id);
        const nextStatus = this.requireStatus(data.status);
        this.validateTransition(order.status, nextStatus);

        if (nextStatus === "CANCELLED") {
            return this.cancelOrder(order);
        }

        const updated = await this.ordersRepository.updateStatus(
            order._id as ObjectId,
            nextStatus,
            order.paymentStatus
        );
        if (!updated) {
            throw new NotFoundError("Pedido no encontrado");
        }
        return updated;
    }

    async cancel(id: string, userId: string, isAdmin = false): Promise<Order> {
        const order = await this.findById(id, isAdmin ? undefined : userId);
        if (order.status !== "PENDING_PAYMENT" && order.status !== "CONFIRMED") {
            throw new BadRequestError("El pedido ya no puede cancelarse en su estado actual");
        }
        return this.cancelOrder(order);
    }

    private async cancelOrder(order: Order): Promise<Order> {
        const stockChanges: Array<{ product: Product; previousStock: number | undefined; newStock: number }> = [];

        try {
            for (const item of order.items) {
                const product = await this.productsRepository.findById(item.productId);
                if (!product?.inventoryManaged) continue;

                const previousStock = product.stock;
                const currentStock = product.stock ?? 0;
                const newStock = currentStock + item.quantity;
                const updatedProduct = await this.productsRepository.updateStock(
                    item.productId,
                    previousStock,
                    newStock
                );

                if (!updatedProduct) {
                    throw new BadRequestError(
                        `El stock de '${item.productName}' cambió durante la cancelación; intenta nuevamente`
                    );
                }

                stockChanges.push({ product, previousStock, newStock });
                await this.inventoryRepository.createMovement({
                    productId: item.productId,
                    type: "IN",
                    quantity: item.quantity,
                    previousStock: currentStock,
                    newStock,
                    reason: `Reintegro por cancelación del pedido ${order.orderNumber}`,
                    reference: order.orderNumber,
                    createdBy: order.userId,
                    createdAt: new Date(),
                });
            }

            const updated = await this.ordersRepository.updateStatus(
                order._id as ObjectId,
                "CANCELLED",
                "CANCELLED"
            );
            if (!updated) {
                throw new NotFoundError("Pedido no encontrado");
            }
            return updated;
        } catch (error: unknown) {
            await this.rollbackStock(stockChanges, order.userId, order.orderNumber);
            throw error;
        }
    }

    private async resolveAddress(customer: Customer, data: OrderCreateInput): Promise<OrderAddress> {
        let address: CustomerAddress | Partial<OrderAddress> | undefined;

        if (data.addressIndex !== undefined) {
            if (!Number.isInteger(data.addressIndex) || data.addressIndex < 0) {
                throw new BadRequestError("addressIndex debe ser un entero mayor o igual a cero");
            }
            address = customer.addresses[data.addressIndex];
            if (!address) {
                throw new BadRequestError("La dirección seleccionada no existe");
            }
        } else {
            address = data.address;
            if (!address) {
                throw new BadRequestError(
                    "Debes seleccionar una dirección guardada o enviar una nueva dirección"
                );
            }
        }

        const normalizedAddress = this.normalizeAddress(address, customer);

        if (data.addressIndex === undefined && data.saveAddress === true) {
            const savedAddress: CustomerAddress = {
                alias: normalizedAddress.alias,
                street: normalizedAddress.street,
                city: normalizedAddress.city,
                state: normalizedAddress.state,
                postalCode: normalizedAddress.postalCode,
                country: normalizedAddress.country,
                isDefault: customer.addresses.length === 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await this.customersRepository.update(customer._id as ObjectId, {
                addresses: [...customer.addresses, savedAddress],
            });
        }

        return normalizedAddress;
    }

    private normalizeAddress(
        address: CustomerAddress | Partial<OrderAddress>,
        customer: Customer
    ): OrderAddress {
        return {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            alias: this.optionalString(address.alias),
            street: this.requireString(address.street, "address.street"),
            city: this.requireString(address.city, "address.city"),
            state: this.requireString(address.state, "address.state"),
            postalCode: this.optionalString(address.postalCode),
            country: this.requireString(address.country, "address.country"),
        };
    }

    private async getCustomer(userId: ObjectId): Promise<Customer> {
        const customer = await this.customersRepository.findByUserId(userId);
        if (!customer) {
            throw new BadRequestError("El usuario no tiene un cliente activo asociado");
        }
        return customer;
    }

    private async getAvailableProduct(productId: ObjectId): Promise<Product> {
        const product = await this.productsRepository.findById(productId);
        if (!product || !product.isActive) {
            throw new BadRequestError("Uno de los productos del carrito ya no está disponible");
        }
        return product;
    }

    private async rollbackStock(
        changes: Array<{ product: Product; previousStock: number | undefined; newStock: number }>,
        userId: ObjectId,
        orderNumber: string
    ): Promise<void> {
        for (const change of changes.reverse()) {
            const restored = await this.productsRepository.updateStock(
                change.product._id as ObjectId,
                change.newStock,
                change.previousStock ?? 0
            );
            if (restored) {
                await this.inventoryRepository.createMovement({
                    productId: change.product._id as ObjectId,
                    type: change.newStock > (change.previousStock ?? 0) ? "OUT" : "IN",
                    quantity: Math.abs(change.newStock - (change.previousStock ?? 0)),
                    previousStock: change.newStock,
                    newStock: change.previousStock ?? 0,
                    reason: `Reversión de operación del pedido ${orderNumber}`,
                    reference: orderNumber,
                    createdBy: userId,
                    createdAt: new Date(),
                });
            }
        }
    }

    private createOrderNumber(): string {
        return `TS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID()
            .slice(0, 8)
            .toUpperCase()}`;
    }

    private validateTransition(current: OrderStatus, next: OrderStatus): void {
        const transitions: Record<OrderStatus, OrderStatus[]> = {
            PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
            CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
            IN_PRODUCTION: ["READY"],
            READY: ["DELIVERED"],
            DELIVERED: [],
            CANCELLED: [],
        };
        if (!transitions[current].includes(next)) {
            throw new BadRequestError(`No se puede cambiar un pedido de ${current} a ${next}`);
        }
    }

    private requireStatus(value: unknown): OrderStatus {
        const statuses: OrderStatus[] = [
            "PENDING_PAYMENT",
            "CONFIRMED",
            "IN_PRODUCTION",
            "READY",
            "DELIVERED",
            "CANCELLED",
        ];
        if (typeof value !== "string" || !statuses.includes(value as OrderStatus)) {
            throw new BadRequestError("El estado del pedido no es válido");
        }
        return value as OrderStatus;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== "string" || value.trim() === "") {
            throw new BadRequestError(`El campo '${field}' es obligatorio y debe ser texto no vacío`);
        }
        return value.trim();
    }

    private optionalString(value: unknown): string | undefined {
        return typeof value === "string" && value.trim() ? value.trim() : undefined;
    }

    private toObjectId(value: string, field = "id"): ObjectId {
        if (!ObjectId.isValid(value)) {
            throw new BadRequestError(`Identificador inválido para ${field}: ${value}`);
        }
        return new ObjectId(value);
    }
}
