import { Router } from "express";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { authMiddleware, requireRoles } from "../../shared/middlewares/auth.middleware";
import { InventoryController } from "./inventory.controller";

const router = Router();
const inventoryController = new InventoryController();

router.use(authMiddleware, requireRoles("ADMIN", "PRODUCTION"));
router.get("/", asyncHandler(inventoryController.findAll));
router.get("/:productId/movements", asyncHandler(inventoryController.findMovements));
router.get("/:productId", asyncHandler(inventoryController.findByProductId));
router.post("/:productId/adjust", asyncHandler(inventoryController.adjustStock));

export default router;
