import { Router } from "express";
import { ProductsController } from "./products.controller";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { authMiddleware, requireRoles } from "../../shared/middlewares/auth.middleware";

const router = Router();
const productsController = new ProductsController();

router.get("/", asyncHandler(productsController.findAll));
router.get("/category/:category", asyncHandler(productsController.findByCategory));
router.get("/:id", asyncHandler(productsController.findById));
router.post("/", authMiddleware, requireRoles("ADMIN", "DESIGNER", "PRODUCTION"), asyncHandler(productsController.create));
router.patch("/:id", authMiddleware, requireRoles("ADMIN", "DESIGNER", "PRODUCTION"), asyncHandler(productsController.update));
router.delete("/:id", authMiddleware, requireRoles("ADMIN", "DESIGNER", "PRODUCTION"), asyncHandler(productsController.delete));

export default router;
