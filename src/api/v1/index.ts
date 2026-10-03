import { Router } from "express";
import demoRoutes from "../../modules/demo/demo.routes";
import customersRoutes from "../../modules/customers/customers.routes";
import productsRoutes from "../../modules/products/products.routes";
import authRoutes from "../../modules/auth/auth.routes";
import usersRoutes from "../../modules/users/users.routes";

const router = Router();

router.use("/demo", demoRoutes);
router.use("/customers", customersRoutes);
router.use("/products", productsRoutes);
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);

export default router;
