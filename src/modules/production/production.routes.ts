import { Router } from "express";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { authMiddleware, requireRoles } from "../../shared/middlewares/auth.middleware";
import { ProductionController } from "./production.controller";

const router = Router();
const productionController = new ProductionController();

router.post(
    "/orders/:orderId/jobs",
    authMiddleware,
    requireRoles("ADMIN", "PRODUCTION"),
    asyncHandler(productionController.createJobsForOrder)
);
router.get(
    "/orders/:orderId",
    authMiddleware,
    requireRoles("ADMIN", "PRODUCTION", "DESIGNER"),
    asyncHandler(productionController.findByOrderId)
);
router.get(
    "/queue",
    authMiddleware,
    requireRoles("ADMIN", "PRODUCTION", "DESIGNER"),
    asyncHandler(productionController.findQueue)
);
router.get(
    "/jobs/:jobId",
    authMiddleware,
    requireRoles("ADMIN", "PRODUCTION", "DESIGNER"),
    asyncHandler(productionController.findById)
);
router.patch(
    "/jobs/:jobId/status",
    authMiddleware,
    requireRoles("ADMIN", "PRODUCTION", "DESIGNER"),
    asyncHandler(productionController.updateStatus)
);
router.patch(
    "/jobs/:jobId/assign",
    authMiddleware,
    requireRoles("ADMIN", "PRODUCTION"),
    asyncHandler(productionController.assign)
);
router.patch(
    "/jobs/:jobId/notes",
    authMiddleware,
    requireRoles("ADMIN", "PRODUCTION", "DESIGNER"),
    asyncHandler(productionController.updateNotes)
);

export default router;
