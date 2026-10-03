import { Router } from "express";
import { ProductsController } from "./products.controller";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";

const router = Router();
const productsController = new ProductsController();

router.post("/", asyncHandler(productsController.create));
router.get("/", asyncHandler(productsController.findAll));
router.get("/category/:category", asyncHandler(productsController.findByCategory));
router.get("/:id", asyncHandler(productsController.findById));
router.patch("/:id", asyncHandler(productsController.update));
router.delete("/:id", asyncHandler(productsController.delete));

export default router;
