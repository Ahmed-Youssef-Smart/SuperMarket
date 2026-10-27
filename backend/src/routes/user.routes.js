const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authMiddleware, authorizeRoles } = require("../middlewares/auth.middleware");

// Only Admin can list all users or create custom staff
router.get("/", authMiddleware, authorizeRoles("admin"), userController.getAll);
router.post("/", authMiddleware, authorizeRoles("admin"), userController.create);
router.get("/:id", authMiddleware, userController.getById);
router.put("/:id", authMiddleware, userController.update);
router.delete("/:id", authMiddleware, authorizeRoles("admin"), userController.delete);

module.exports = router;
