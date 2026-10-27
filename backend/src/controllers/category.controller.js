const categoryService = require("../services/category.service");

class CategoryController {
    constructor() {
        this.categoryService = categoryService;
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async getAll(req, res) {
        try {
            const categories = await this.categoryService.getAllCategories();
            res.json({ status: "success", data: categories });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const category = await this.categoryService.getCategoryById(req.params.id);
            if (!category) {
                return res.status(404).json({ status: "error", message: "القسم غير موجود" });
            }
            res.json({ status: "success", data: category });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async create(req, res) {
        try {
            const newCategory = await this.categoryService.createCategory(req.body);
            res.status(201).json({ status: "success", data: newCategory });
        } catch (error) {
            res.status(error.statusCode || 400).json({ status: "error", message: error.message });
        }
    }

    async update(req, res) {
        try {
            const updated = await this.categoryService.updateCategory(req.params.id, req.body);
            if (!updated) {
                return res.status(404).json({ status: "error", message: "القسم غير موجود" });
            }
            res.json({ status: "success", data: updated });
        } catch (error) {
            res.status(400).json({ status: "error", message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const deleted = await this.categoryService.deleteCategory(req.params.id);
            if (!deleted) {
                return res.status(404).json({ status: "error", message: "القسم غير موجود" });
            }
            res.json({ status: "success", message: "تم حذف القسم بنجاح" });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }
}

module.exports = new CategoryController();
