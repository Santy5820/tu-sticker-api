import { Router } from "express";
import demoRoutes from "../../modules/demo/demo.routes";
import customersRoutes from "../../modules/customers/customers.routes";
import productsRoutes from "../../modules/products/products.routes";
import authRoutes from "../../modules/auth/auth.routes";
import usersRoutes from "../../modules/users/users.routes";
import categoriesRoutes from "../../modules/categories/categories.routes";
import cartRoutes from "../../modules/cart/cart.routes";
import inventoryRoutes from "../../modules/inventory/inventory.routes";
import ordersRoutes from "../../modules/orders/orders.routes";
import productionRoutes from "../../modules/production/production.routes";
import paymentsRoutes from "../../modules/payments/payments.routes";

const router = Router();

router.use("/demo", demoRoutes);
router.use("/customers", customersRoutes);
router.use("/products", productsRoutes);
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/categories", categoriesRoutes);
router.use("/cart", cartRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/orders", ordersRoutes);
router.use("/production", productionRoutes);
router.use("/payments", paymentsRoutes);

export default router;
