import { Router } from "express";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { authMiddleware, requireRoles } from "../../shared/middlewares/auth.middleware";
import { CartController } from "./cart.controller";

const router = Router();
const cartController = new CartController();

router.get("/", asyncHandler(cartController.getCart));
router.post("/items", asyncHandler(cartController.addItem));
router.patch("/items/:productId", asyncHandler(cartController.updateItem));
router.delete("/items/:productId", asyncHandler(cartController.removeItem));
router.delete("/", asyncHandler(cartController.clearCart));
router.post(
    "/claim",
    authMiddleware,
    requireRoles("CUSTOMER"),
    asyncHandler(cartController.claimGuestCart)
);

export default router;
