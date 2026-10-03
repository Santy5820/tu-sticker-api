import { Router } from "express";
import { CategoriesController } from "./categories.controller";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { authMiddleware, requireRoles } from "../../shared/middlewares/auth.middleware";

const router = Router();
const categoriesController = new CategoriesController();

// Lectura pública: el catálogo solo muestra categorías activas.
router.get("/", asyncHandler(categoriesController.findAll));
router.get("/slug/:slug", asyncHandler(categoriesController.findBySlug));
router.get("/all", authMiddleware, requireRoles("ADMIN"), asyncHandler(categoriesController.findAllForAdmin));
router.get("/:id", asyncHandler(categoriesController.findById));

// Escritura administrativa.
router.post("/", authMiddleware, requireRoles("ADMIN"), asyncHandler(categoriesController.create));
router.patch("/:id", authMiddleware, requireRoles("ADMIN"), asyncHandler(categoriesController.update));
router.delete("/:id", authMiddleware, requireRoles("ADMIN"), asyncHandler(categoriesController.delete));

export default router;
