const inventoryService = require("../services/inventory.service");

class InventoryController {
    constructor() {
        this.inventoryService = inventoryService;
        this.getLogs = this.getLogs.bind(this);
        this.adjustStock = this.adjustStock.bind(this);
        this.getSummary = this.getSummary.bind(this);
    }

    async getLogs(req, res) {
        try {
            const { productId, changeType } = req.query;
            const logs = await this.inventoryService.getInventoryLogs({ productId, changeType });
            res.json({ status: "success", count: logs.length, data: logs });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async adjustStock(req, res) {
        try {
            const { productId, actualCount, reason } = req.body;
            if (!productId || actualCount === undefined) {
                return res.status(400).json({
                    status: "error",
                    message: "رقم الصنف والكمية الفعلية مطلوبان (productId and actualCount are required)",
                });
            }

            const userId = req.user ? req.user.id : null;
            const result = await this.inventoryService.adjustStock(productId, actualCount, reason, userId);

            res.json({
                status: "success",
                message: "تم تحديث المخزون وتسجيل حركة الجرد بنجاح",
                data: result,
            });
        } catch (error) {
            res.status(error.statusCode || 500).json({ status: "error", message: error.message });
        }
    }

    async getSummary(req, res) {
        try {
            const summary = await this.inventoryService.getInventoryAuditSummary();
            res.json({ status: "success", data: summary });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }
}

module.exports = new InventoryController();
