const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");
const { authMiddleware, authorizeRoles } = require("../middlewares/auth.middleware");

// Public can view categories
router.get("/", categoryController.getAll);
router.get("/:id", categoryController.getById);

// Admin only can add, edit, or delete categories
router.post("/", authMiddleware, authorizeRoles("admin"), categoryController.create);
router.put("/:id", authMiddleware, authorizeRoles("admin"), categoryController.update);
router.delete("/:id", authMiddleware, authorizeRoles("admin"), categoryController.delete);

module.exports = router;
