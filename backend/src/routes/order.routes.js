const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const { authMiddleware, authorizeRoles } = require("../middlewares/auth.middleware");

// Authenticated users can create orders (cashier for in-store checkout, customer for online shopping)
router.post("/", authMiddleware, orderController.create);

// Cashiers and Admins can view all orders/invoices
router.get("/", authMiddleware, authorizeRoles("admin", "cashier"), orderController.getAll);

// Customers can view their own orders
router.get("/my-orders", authMiddleware, orderController.getMyOrders);

// View specific invoice by ID
router.get("/:id", authMiddleware, orderController.getById);

module.exports = router;
