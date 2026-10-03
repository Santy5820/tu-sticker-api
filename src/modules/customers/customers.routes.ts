import { Router } from "express";
import { CustomersController } from "./customers.controller";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { authMiddleware, requireRoles } from "../../shared/middlewares/auth.middleware";

const router = Router();
const customersController = new CustomersController();

router.get(
    "/me",
    authMiddleware,
    requireRoles("CUSTOMER"),
    asyncHandler(customersController.findMe)
);
router.use(authMiddleware, requireRoles("ADMIN", "SALES"));
router.post("/", asyncHandler(customersController.create));
router.get("/", asyncHandler(customersController.findAll));
router.get("/active", asyncHandler(customersController.findActive));
router.get("/inactive", asyncHandler(customersController.findInactive));
router.get("/:id", asyncHandler(customersController.findById));
router.patch("/:id", asyncHandler(customersController.update));
router.delete("/:id", asyncHandler(customersController.delete));

export default router;
