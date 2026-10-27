const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const { authMiddleware, authorizeRoles } = require("../middlewares/auth.middleware");

// Inventory endpoints restricted to Admin and Cashier
router.use(authMiddleware);
router.use(authorizeRoles("admin", "cashier"));

router.get("/logs", inventoryController.getLogs);
router.get("/summary", inventoryController.getSummary);
router.post("/adjust", inventoryController.adjustStock);

module.exports = router;
