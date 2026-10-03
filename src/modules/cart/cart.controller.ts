import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors/AppError";
import { AuthRequest } from "../../shared/middlewares/auth.middleware";
import { AddCartItemInput, CartOwner, UpdateCartItemInput } from "./cart.model";
import { CartService } from "./cart.service";

export class CartController {
    private readonly cartService = new CartService();

    getCart = async (req: Request, res: Response): Promise<void> => {
        const owner = this.getOwner(req, res);
        const cart = await this.cartService.getCart(owner);
        res.status(200).json(cart);
    };

    addItem = async (req: Request, res: Response): Promise<void> => {
        const owner = this.getOwner(req, res);
        const cart = await this.cartService.addItem(owner, req.body as AddCartItemInput);
        res.status(200).json(cart);
    };

    updateItem = async (req: Request<{ productId: string }>, res: Response): Promise<void> => {
        const owner = this.getOwner(req, res);
        const cart = await this.cartService.updateItem(
            owner,
            req.params.productId,
            req.body as UpdateCartItemInput
        );
        res.status(200).json(cart);
    };

    removeItem = async (req: Request<{ productId: string }>, res: Response): Promise<void> => {
        const owner = this.getOwner(req, res);
        const cart = await this.cartService.removeItem(owner, req.params.productId);
        res.status(200).json(cart);
    };

    clearCart = async (req: Request, res: Response): Promise<void> => {
        const owner = this.getOwner(req, res);
        const cart = await this.cartService.clearCart(owner);
        res.status(200).json(cart);
    };

    claimGuestCart = async (req: Request, res: Response): Promise<void> => {
        const guestId = this.getGuestId(req);
        const userId = this.getUserId(req);
        const cart = await this.cartService.claimGuestCart(guestId, userId);
        res.status(200).json(cart);
    };

    private getUserId(req: Request): string {
        const user = (req as AuthRequest).user;
        if (!user) {
            throw new UnauthorizedError("Debes autenticarte para usar el carrito");
        }
        return user.userId;
    }

    private getOwner(req: Request, res: Response): CartOwner {
        const user = (req as AuthRequest).user;
        if (user) {
            return { userId: user.userId };
        }

        let guestId = req.header("X-Cart-Id");
        if (guestId && !this.isValidGuestId(guestId)) {
            throw new UnauthorizedError("El identificador del carrito no es válido");
        }

        if (!guestId) {
            guestId = randomUUID();
            res.setHeader("X-Cart-Id", guestId);
        }

        return { guestId };
    }

    private getGuestId(req: Request): string {
        const guestId = req.header("X-Cart-Id");
        if (!guestId || !this.isValidGuestId(guestId)) {
            throw new UnauthorizedError("Debes enviar un X-Cart-Id válido para reclamar el carrito");
        }
        return guestId;
    }

    private isValidGuestId(value: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }
}
