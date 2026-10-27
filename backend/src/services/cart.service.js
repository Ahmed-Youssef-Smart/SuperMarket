const AppDataSource = require("../config/database");

class CartService {
    constructor() {
        this.cartRepo = null;
    }

    getCartRepo() {
        if (!this.cartRepo) {
            this.cartRepo = AppDataSource.getRepository("CartItem");
        }
        return this.cartRepo;
    }

    async getCartByUserId(customerId) {
        const repo = this.getCartRepo();
        return await repo.find({
            where: { customerId: parseInt(customerId, 10) },
            relations: ["product", "product.category"],
            order: { id: "DESC" },
        });
    }

    async addToCart(customerId, productId, quantity = 1) {
        const repo = this.getCartRepo();
        const pId = parseInt(productId, 10);
        const cId = parseInt(customerId, 10);
        const qty = parseInt(quantity, 10) || 1;

        // Check if item already in cart
        let cartItem = await repo.findOne({
            where: { customerId: cId, productId: pId },
        });

        if (cartItem) {
            cartItem.quantity += qty;
            await repo.save(cartItem);
        } else {
            cartItem = repo.create({
                customerId: cId,
                productId: pId,
                quantity: qty,
            });
            await repo.save(cartItem);
        }

        return await this.getCartByUserId(cId);
    }

    async updateQuantity(customerId, cartItemId, quantity) {
        const repo = this.getCartRepo();
        const item = await repo.findOne({
            where: { id: parseInt(cartItemId, 10), customerId: parseInt(customerId, 10) },
        });

        if (!item) {
            const err = new Error("عنصر السلة غير موجود");
            err.statusCode = 404;
            throw err;
        }

        const newQty = parseInt(quantity, 10);
        if (newQty <= 0) {
            await repo.remove(item);
        } else {
            item.quantity = newQty;
            await repo.save(item);
        }

        return await this.getCartByUserId(customerId);
    }

    async removeFromCart(customerId, cartItemId) {
        const repo = this.getCartRepo();
        const item = await repo.findOne({
            where: { id: parseInt(cartItemId, 10), customerId: parseInt(customerId, 10) },
        });

        if (item) {
            await repo.remove(item);
        }
        return await this.getCartByUserId(customerId);
    }

    async clearCart(customerId) {
        const repo = this.getCartRepo();
        await repo.delete({ customerId: parseInt(customerId, 10) });
        return [];
    }
}

module.exports = new CartService();
