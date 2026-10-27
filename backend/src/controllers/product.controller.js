const productService = require("../services/product.service");

class ProductController {
    constructor() {
        this.productService = productService;
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.getByBarcode = this.getByBarcode.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.getLowStock = this.getLowStock.bind(this);
    }

    async getAll(req, res) {
        try {
            const { categoryId, search, lowStock } = req.query;
            const products = await this.productService.getAllProducts({ categoryId, search, lowStock });
            res.json({ status: "success", data: products });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const product = await this.productService.getProductById(req.params.id);
            if (!product) {
                return res.status(404).json({ status: "error", message: "الصنف غير موجود" });
            }
            res.json({ status: "success", data: product });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async getByBarcode(req, res) {
        try {
            const product = await this.productService.getProductByBarcode(req.params.barcode);
            if (!product) {
                return res.status(404).json({ status: "error", message: "لم يتم العثور على صنف بهذا الباركود" });
            }
            res.json({ status: "success", data: product });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async create(req, res) {
        try {
            const userId = req.user ? req.user.id : null;
            const product = await this.productService.createProduct(req.body, userId);
            res.status(201).json({ status: "success", message: "تمت إضافة الصنف بنجاح", data: product });
        } catch (error) {
            res.status(error.statusCode || 400).json({ status: "error", message: error.message });
        }
    }

    async update(req, res) {
        try {
            const userId = req.user ? req.user.id : null;
            const updated = await this.productService.updateProduct(req.params.id, req.body, userId);
            if (!updated) {
                return res.status(404).json({ status: "error", message: "الصنف غير موجود" });
            }
            res.json({ status: "success", message: "تم تحديث بيانات الصنف بنجاح", data: updated });
        } catch (error) {
            res.status(400).json({ status: "error", message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const deleted = await this.productService.deleteProduct(req.params.id);
            if (!deleted) {
                return res.status(404).json({ status: "error", message: "الصنف غير موجود" });
            }
            res.json({ status: "success", message: "تم تعطيل/حذف الصنف بنجاح" });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async getLowStock(req, res) {
        try {
            const alerts = await this.productService.getLowStockAlerts();
            res.json({ status: "success", count: alerts.length, data: alerts });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }
}

module.exports = new ProductController();
