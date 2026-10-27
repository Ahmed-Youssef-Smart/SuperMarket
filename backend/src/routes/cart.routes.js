const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

// All cart routes require user authentication
router.use(authMiddleware);

router.get("/", cartController.getCart);
router.post("/add", cartController.addToCart);
router.put("/item/:id", cartController.updateQuantity);
router.delete("/item/:id", cartController.removeItem);
router.delete("/clear", cartController.clearCart);

module.exports = router;
