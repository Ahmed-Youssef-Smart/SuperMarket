const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const { authMiddleware, authorizeRoles } = require("../middlewares/auth.middleware");

// Public endpoints
router.get("/", productController.getAll);
router.get("/low-stock", authMiddleware, authorizeRoles("admin", "cashier"), productController.getLowStock);
router.get("/barcode/:barcode", productController.getByBarcode);
router.get("/:id", productController.getById);

// Admin and Cashier management endpoints
router.post("/", authMiddleware, authorizeRoles("admin"), productController.create);
router.put("/:id", authMiddleware, authorizeRoles("admin", "cashier"), productController.update);
router.delete("/:id", authMiddleware, authorizeRoles("admin"), productController.delete);

module.exports = router;
