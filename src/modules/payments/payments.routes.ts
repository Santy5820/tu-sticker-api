import { Router } from "express";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { authMiddleware, requireRoles } from "../../shared/middlewares/auth.middleware";
import { PaymentsController } from "./payments.controller";

const router = Router();
const paymentsController = new PaymentsController();

router.post("/webhooks/wompi", asyncHandler(paymentsController.wompiWebhook));
router.post(
    "/orders/:orderId/checkout",
    authMiddleware,
    requireRoles("CUSTOMER"),
    asyncHandler(paymentsController.createCheckout)
);
router.get(
    "/orders/:orderId",
    authMiddleware,
    requireRoles("CUSTOMER", "ADMIN", "SALES"),
    asyncHandler(paymentsController.findByOrderId)
);

export default router;
