import { Router } from "express";
import { AuthController } from "./auth.controller";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";

const router = Router();
const authController = new AuthController();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/logout", authMiddleware, asyncHandler(authController.logout));
router.get("/me", authMiddleware, asyncHandler(authController.me));

export default router;
