const orderService = require("../services/order.service");

class OrderController {
    constructor() {
        this.orderService = orderService;
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.getMyOrders = this.getMyOrders.bind(this);
    }

    async create(req, res) {
        try {
            const order = await this.orderService.createOrder(req.body, req.user);
            res.status(201).json({
                status: "success",
                message: "تم إنشاء الفاتورة وإتمام العملية بنجاح (Invoice created successfully)",
                data: order,
            });
        } catch (error) {
            res.status(error.statusCode || 400).json({ status: "error", message: error.message });
        }
    }

    async getAll(req, res) {
        try {
            const { customerId, search } = req.query;
            const orders = await this.orderService.getAllOrders({ customerId, search });
            res.json({ status: "success", data: orders });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const order = await this.orderService.getOrderById(req.params.id);
            if (!order) {
                return res.status(404).json({ status: "error", message: "الفاتورة غير موجودة" });
            }

            // If customer, ensure they only view their own invoice unless admin or cashier
            if (req.user.role === "customer" && order.customerId !== req.user.id) {
                return res.status(403).json({ status: "error", message: "غير مصرح لك بمشاهدة هذه الفاتورة" });
            }

            res.json({ status: "success", data: order });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async getMyOrders(req, res) {
        try {
            const orders = await this.orderService.getOrdersByCustomerId(req.user.id);
            res.json({ status: "success", data: orders });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }
}

module.exports = new OrderController();
