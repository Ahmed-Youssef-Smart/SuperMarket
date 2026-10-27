const AppDataSource = require("../config/database");

class OrderService {
    constructor() {
        this.orderRepo = null;
        this.orderItemRepo = null;
        this.productRepo = null;
        this.inventoryLogRepo = null;
    }

    getRepositories() {
        if (!this.orderRepo) {
            this.orderRepo = AppDataSource.getRepository("Order");
            this.orderItemRepo = AppDataSource.getRepository("OrderItem");
            this.productRepo = AppDataSource.getRepository("Product");
            this.inventoryLogRepo = AppDataSource.getRepository("InventoryLog");
        }
        return {
            orderRepo: this.orderRepo,
            orderItemRepo: this.orderItemRepo,
            productRepo: this.productRepo,
            inventoryLogRepo: this.inventoryLogRepo,
        };
    }

    generateInvoiceNumber() {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const rand = Math.floor(1000 + Math.random() * 9000);
        return `INV-${dateStr}-${rand}`;
    }

    async createOrder(orderData, currentUser = null) {
        const { orderRepo, orderItemRepo, productRepo, inventoryLogRepo } = this.getRepositories();

        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            const err = new Error("يجب أن تحتوي الفاتورة على صنف واحد على الأقل (Order must contain at least one item)");
            err.statusCode = 400;
            throw err;
        }

        // Calculate totals and verify products stock
        let subtotal = 0;
        const verifiedItems = [];

        for (const item of orderData.items) {
            const product = await productRepo.findOne({ where: { id: parseInt(item.productId, 10) } });
            if (!product) {
                const err = new Error(`الصنف برقم ${item.productId} غير موجود`);
                err.statusCode = 404;
                throw err;
            }

            const reqQty = parseInt(item.quantity, 10);
            if (product.stockQuantity < reqQty) {
                const err = new Error(`الكمية المتوفرة من صنف (${product.name}) غير كافية بالمخزن. المتوفر حالياً: ${product.stockQuantity}`);
                err.statusCode = 400;
                throw err;
            }

            const unitPrice = parseFloat(product.sellingPrice);
            const lineSubtotal = unitPrice * reqQty;
            subtotal += lineSubtotal;

            verifiedItems.push({
                product,
                quantity: reqQty,
                unitPrice,
                subtotal: lineSubtotal,
            });
        }

        const taxRate = orderData.taxRate !== undefined ? parseFloat(orderData.taxRate) : 0.15; // 15% VAT
        const discountAmount = parseFloat(orderData.discountAmount) || 0;
        const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
        const taxAmount = parseFloat((subtotalAfterDiscount * taxRate).toFixed(2));
        const totalAmount = parseFloat((subtotalAfterDiscount + taxAmount).toFixed(2));

        const invoiceNumber = this.generateInvoiceNumber();

        // Determine customerId and cashierId
        let customerId = orderData.customerId ? parseInt(orderData.customerId, 10) : null;
        let cashierId = orderData.cashierId ? parseInt(orderData.cashierId, 10) : null;

        if (currentUser) {
            if (currentUser.role === "cashier" || currentUser.role === "admin") {
                cashierId = currentUser.id;
            } else if (currentUser.role === "customer" && !customerId) {
                customerId = currentUser.id;
            }
        }

        // Create Order
        const newOrder = orderRepo.create({
            invoiceNumber,
            customerId,
            cashierId,
            subtotal,
            discountAmount,
            taxAmount,
            totalAmount,
            paymentMethod: orderData.paymentMethod || "cash",
            paymentStatus: orderData.paymentStatus || "paid",
            notes: orderData.notes || "",
        });

        const savedOrder = await orderRepo.save(newOrder);

        // Save items & deduct stock & record inventory logs
        for (const vi of verifiedItems) {
            const orderItem = orderItemRepo.create({
                orderId: savedOrder.id,
                productId: vi.product.id,
                productName: vi.product.name,
                quantity: vi.quantity,
                unitPrice: vi.unitPrice,
                subtotal: vi.subtotal,
            });
            await orderItemRepo.save(orderItem);

            // Deduct stock
            const oldStock = vi.product.stockQuantity;
            const newStock = oldStock - vi.quantity;
            vi.product.stockQuantity = newStock;
            await productRepo.save(vi.product);

            // Inventory log entry
            const invLog = inventoryLogRepo.create({
                productId: vi.product.id,
                changeType: "SALE",
                quantityChange: -vi.quantity,
                previousStock: oldStock,
                newStock: newStock,
                reason: `بيع بموجب فاتورة رقم: ${invoiceNumber}`,
                performedByUserId: cashierId || customerId,
            });
            await inventoryLogRepo.save(invLog);
        }

        return await this.getOrderById(savedOrder.id);
    }

    async getAllOrders(filters = {}) {
        const { orderRepo } = this.getRepositories();
        const query = orderRepo.createQueryBuilder("order")
            .leftJoinAndSelect("order.customer", "customer")
            .leftJoinAndSelect("order.cashier", "cashier")
            .leftJoinAndSelect("order.items", "items")
            .leftJoinAndSelect("items.product", "product")
            .orderBy("order.id", "DESC");

        if (filters.customerId) {
            query.andWhere("order.customerId = :cId", { cId: parseInt(filters.customerId, 10) });
        }

        if (filters.search) {
            query.andWhere(
                "(order.invoiceNumber LIKE :search OR customer.name LIKE :search)",
                { search: `%${filters.search}%` }
            );
        }

        return await query.getMany();
    }

    async getOrderById(id) {
        const { orderRepo } = this.getRepositories();
        return await orderRepo.findOne({
            where: { id: parseInt(id, 10) },
            relations: ["customer", "cashier", "items", "items.product"],
        });
    }

    async getOrdersByCustomerId(customerId) {
        return await this.getAllOrders({ customerId });
    }
}

module.exports = new OrderService();
