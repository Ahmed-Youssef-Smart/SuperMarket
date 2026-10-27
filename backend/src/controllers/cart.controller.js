const cartService = require("../services/cart.service");

class CartController {
    constructor() {
        this.cartService = cartService;
        this.getCart = this.getCart.bind(this);
        this.addToCart = this.addToCart.bind(this);
        this.updateQuantity = this.updateQuantity.bind(this);
        this.removeItem = this.removeItem.bind(this);
        this.clearCart = this.clearCart.bind(this);
    }

    async getCart(req, res) {
        try {
            const customerId = req.user.id;
            const items = await this.cartService.getCartByUserId(customerId);
            res.json({ status: "success", data: items });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async addToCart(req, res) {
        try {
            const customerId = req.user.id;
            const { productId, quantity } = req.body;
            if (!productId) {
                return res.status(400).json({ status: "error", message: "معرف الصنف مطلوب (productId is required)" });
            }
            const cart = await this.cartService.addToCart(customerId, productId, quantity || 1);
            res.json({ status: "success", message: "تمت إضافة الصنف إلى السلة بنجاح", data: cart });
        } catch (error) {
            res.status(error.statusCode || 500).json({ status: "error", message: error.message });
        }
    }

    async updateQuantity(req, res) {
        try {
            const customerId = req.user.id;
            const cartItemId = req.params.id;
            const { quantity } = req.body;

            const cart = await this.cartService.updateQuantity(customerId, cartItemId, quantity);
            res.json({ status: "success", data: cart });
        } catch (error) {
            res.status(error.statusCode || 500).json({ status: "error", message: error.message });
        }
    }

    async removeItem(req, res) {
        try {
            const customerId = req.user.id;
            const cartItemId = req.params.id;

            const cart = await this.cartService.removeFromCart(customerId, cartItemId);
            res.json({ status: "success", message: "تم حذف الصنف من السلة", data: cart });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async clearCart(req, res) {
        try {
            const customerId = req.user.id;
            await this.cartService.clearCart(customerId);
            res.json({ status: "success", message: "تم إفراغ سلة المشتريات بالكامل", data: [] });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }
}

module.exports = new CartController();
