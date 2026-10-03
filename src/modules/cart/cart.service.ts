import { ObjectId } from "mongodb";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError";
import { ProductsRepository } from "../products/products.repository";
import { AddCartItemInput, Cart, CartItem, CartOwner, UpdateCartItemInput } from "./cart.model";
import { CartRepository } from "./cart.repository";

export class CartService {
    private readonly cartRepository = new CartRepository();
    private readonly productsRepository = new ProductsRepository();

    async getCart(owner: CartOwner): Promise<Cart> {
        const existingCart = await this.findCart(owner);

        if (existingCart) {
            return existingCart;
        }

        return this.emptyCart(owner);
    }

    async addItem(owner: CartOwner, data: AddCartItemInput): Promise<Cart> {
        const productId = this.toObjectId(data.productId, "productId");
        const quantityToAdd = this.requireQuantity(data.quantity);
        const product = await this.getAvailableProduct(productId);
        const cart = await this.getOrCreateCart(owner);
        const existingItem = cart.items.find((item) => item.productId.equals(productId));
        const quantity = (existingItem?.quantity ?? 0) + quantityToAdd;

        this.validateStock(product, quantity);

        const item: CartItem = {
            productId,
            productName: product.name,
            productSlug: product.slug,
            quantity,
            unitPrice: product.price,
            subtotal: this.calculateSubtotal(product.price, quantity),
        };

        const items = existingItem
            ? cart.items.map((currentItem) =>
                  currentItem.productId.equals(productId) ? item : currentItem
              )
            : [...cart.items, item];

        return this.saveCart(cart, items);
    }

    async updateItem(owner: CartOwner, productIdValue: string, data: UpdateCartItemInput): Promise<Cart> {
        const productId = this.toObjectId(productIdValue, "productId");
        const quantity = this.requireQuantity(data.quantity);
        const product = await this.getAvailableProduct(productId);
        const cart = await this.getOrCreateCart(owner);
        const existingItem = cart.items.find((item) => item.productId.equals(productId));

        if (!existingItem) {
            throw new NotFoundError("El producto no está en el carrito");
        }

        this.validateStock(product, quantity);

        const items = cart.items.map((item) =>
            item.productId.equals(productId)
                ? {
                      ...item,
                      productName: product.name,
                      productSlug: product.slug,
                      quantity,
                      unitPrice: product.price,
                      subtotal: this.calculateSubtotal(product.price, quantity),
                  }
                : item
        );

        return this.saveCart(cart, items);
    }

    async removeItem(owner: CartOwner, productIdValue: string): Promise<Cart> {
        const productId = this.toObjectId(productIdValue, "productId");
        const cart = await this.getOrCreateCart(owner);
        const items = cart.items.filter((item) => !item.productId.equals(productId));

        if (items.length === cart.items.length) {
            throw new NotFoundError("El producto no está en el carrito");
        }

        return this.saveCart(cart, items);
    }

    async clearCart(owner: CartOwner): Promise<Cart> {
        const cart = await this.getOrCreateCart(owner);
        return this.saveCart(cart, []);
    }

    async claimGuestCart(guestId: string, userId: string): Promise<Cart> {
        const guestCart = await this.cartRepository.findByGuestId(guestId);
        const userCart = await this.getOrCreateCart({ userId });

        if (!guestCart) {
            return userCart;
        }

        let items = [...userCart.items];
        for (const guestItem of guestCart.items) {
            const product = await this.getAvailableProduct(guestItem.productId);
            const existingItem = items.find((item) => item.productId.equals(guestItem.productId));
            const quantity = (existingItem?.quantity ?? 0) + guestItem.quantity;
            this.validateStock(product, quantity);

            const item: CartItem = {
                productId: guestItem.productId,
                productName: product.name,
                productSlug: product.slug,
                quantity,
                unitPrice: product.price,
                subtotal: this.calculateSubtotal(product.price, quantity),
            };

            items = existingItem
                ? items.map((currentItem) =>
                      currentItem.productId.equals(guestItem.productId) ? item : currentItem
                  )
                : [...items, item];
        }

        const savedCart = await this.saveCart(userCart, items);
        await this.cartRepository.deleteByGuestId(guestId);
        return savedCart;
    }

    private async getOrCreateCart(owner: CartOwner): Promise<Cart> {
        const existingCart = await this.findCart(owner);
        return existingCart ?? this.emptyCart(owner);
    }

    private async findCart(owner: CartOwner): Promise<Cart | null> {
        if (owner.userId) {
            return this.cartRepository.findByUserId(this.toObjectId(owner.userId));
        }

        if (owner.guestId) {
            return this.cartRepository.findByGuestId(owner.guestId);
        }

        throw new BadRequestError("No se identificó el propietario del carrito");
    }

    private async getAvailableProduct(productId: ObjectId) {
        const product = await this.productsRepository.findById(productId);

        if (!product || !product.isActive) {
            throw new NotFoundError("Producto no disponible");
        }

        return product;
    }

    private validateStock(product: { inventoryManaged?: boolean; stock?: number }, quantity: number): void {
        if (product.inventoryManaged && product.stock !== undefined && quantity > product.stock) {
            throw new BadRequestError("La cantidad solicitada supera el inventario disponible");
        }
    }

    private saveCart(cart: Cart, items: CartItem[]): Promise<Cart> {
        const subtotal = items.reduce((total, item) => total + item.subtotal, 0);
        const now = new Date();

        return this.cartRepository.save({
            ...(cart.userId ? { userId: cart.userId } : { guestId: cart.guestId }),
            items,
            subtotal,
            total: subtotal,
            createdAt: cart.createdAt,
            updatedAt: now,
        });
    }

    private emptyCart(owner: CartOwner): Cart {
        const now = new Date();
        return {
            ...(owner.userId ? { userId: this.toObjectId(owner.userId) } : { guestId: owner.guestId }),
            items: [],
            subtotal: 0,
            total: 0,
            createdAt: now,
            updatedAt: now,
        };
    }

    private requireQuantity(value: unknown): number {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
            throw new BadRequestError("La cantidad debe ser un número entero mayor que cero");
        }
        return value;
    }

    private calculateSubtotal(unitPrice: number, quantity: number): number {
        return unitPrice * quantity;
    }

    private toObjectId(value: unknown, field = "id"): ObjectId {
        if (typeof value !== "string" || !ObjectId.isValid(value)) {
            throw new BadRequestError(`Identificador inválido: ${value ?? field}`);
        }
        return new ObjectId(value);
    }
}
