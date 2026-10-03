import { Router } from "express";
import { UsersController } from "./users.controller";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";

const router = Router();
const usersController = new UsersController();

router.post("/", asyncHandler(usersController.create));
router.get("/", asyncHandler(usersController.findAll));
router.get("/:id", asyncHandler(usersController.findById));
router.patch("/:id", asyncHandler(usersController.update));
router.delete("/:id", asyncHandler(usersController.delete));

export default router;
