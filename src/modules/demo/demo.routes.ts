import { Router } from "express";
import { DemoController } from "./demo.controller";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { authMiddleware, requireRoles } from "../../shared/middlewares/auth.middleware";

const router = Router();
const demoController = new DemoController();

router.use(authMiddleware, requireRoles("ADMIN"));
router.post("/", asyncHandler(demoController.create));
router.get("/", asyncHandler(demoController.findAll));
router.get("/:id", asyncHandler(demoController.findById));
router.put("/:id", asyncHandler(demoController.update));
router.delete("/:id", asyncHandler(demoController.delete));

export default router;
