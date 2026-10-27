const AppDataSource = require("../config/database");

class CategoryService {
    constructor() {
        this.categoryRepo = null;
    }

    getCategoryRepository() {
        if (!this.categoryRepo) {
            this.categoryRepo = AppDataSource.getRepository("Category");
        }
        return this.categoryRepo;
    }

    async getAllCategories() {
        const repo = this.getCategoryRepository();
        return await repo.find({
            where: { isActive: true },
            order: { displayOrder: "ASC", id: "ASC" },
            relations: ["products"],
        });
    }

    async getCategoryById(id) {
        const repo = this.getCategoryRepository();
        return await repo.findOne({
            where: { id: parseInt(id, 10) },
            relations: ["products"],
        });
    }

    async createCategory(data) {
        const repo = this.getCategoryRepository();
        const existing = await repo.findOne({ where: { name: data.name } });
        if (existing) {
            const err = new Error("اسم القسم موجود بالفعل");
            err.statusCode = 400;
            throw err;
        }

        const category = repo.create({
            name: data.name,
            description: data.description || "",
            icon: data.icon || "fa-shopping-basket",
            displayOrder: data.displayOrder || 0,
            isActive: true,
        });

        return await repo.save(category);
    }

    async updateCategory(id, data) {
        const repo = this.getCategoryRepository();
        const category = await repo.findOne({ where: { id: parseInt(id, 10) } });
        if (!category) return null;

        if (data.name) category.name = data.name;
        if (data.description !== undefined) category.description = data.description;
        if (data.icon) category.icon = data.icon;
        if (data.displayOrder !== undefined) category.displayOrder = data.displayOrder;
        if (data.isActive !== undefined) category.isActive = data.isActive;

        return await repo.save(category);
    }

    async deleteCategory(id) {
        const repo = this.getCategoryRepository();
        const category = await repo.findOne({ where: { id: parseInt(id, 10) } });
        if (!category) return false;

        category.isActive = false;
        await repo.save(category);
        return true;
    }
}

module.exports = new CategoryService();
