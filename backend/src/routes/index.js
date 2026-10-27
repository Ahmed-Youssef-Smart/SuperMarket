const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const categoryRoutes = require("./category.routes");
const productRoutes = require("./product.routes");
const orderRoutes = require("./order.routes");
const cartRoutes = require("./cart.routes");
const inventoryRoutes = require("./inventory.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/cart", cartRoutes);
router.use("/inventory", inventoryRoutes);

module.exports = router;
