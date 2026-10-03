import { Router } from "express";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { authMiddleware, requireRoles } from "../../shared/middlewares/auth.middleware";
import { OrdersController } from "./orders.controller";

const router = Router();
const ordersController = new OrdersController();

router.post("/", authMiddleware, requireRoles("CUSTOMER"), asyncHandler(ordersController.create));
router.get("/", authMiddleware, requireRoles("CUSTOMER"), asyncHandler(ordersController.findMine));
router.get(
    "/admin",
    authMiddleware,
    requireRoles("ADMIN", "SALES", "PRODUCTION"),
    asyncHandler(ordersController.findAll)
);
router.patch(
    "/:id/status",
    authMiddleware,
    requireRoles("ADMIN", "SALES", "PRODUCTION"),
    asyncHandler(ordersController.updateStatus)
);
router.post(
    "/:id/cancel",
    authMiddleware,
    requireRoles("CUSTOMER", "ADMIN", "SALES", "PRODUCTION"),
    asyncHandler(ordersController.cancel)
);
router.get(
    "/:id",
    authMiddleware,
    requireRoles("CUSTOMER", "ADMIN", "SALES", "PRODUCTION"),
    asyncHandler(ordersController.findById)
);

export default router;
