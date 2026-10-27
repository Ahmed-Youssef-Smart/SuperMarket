const AppDataSource = require("../config/database");

class ProductService {
    constructor() {
        this.productRepo = null;
        this.inventoryLogRepo = null;
    }

    getProductRepo() {
        if (!this.productRepo) {
            this.productRepo = AppDataSource.getRepository("Product");
        }
        return this.productRepo;
    }

    getInventoryLogRepo() {
        if (!this.inventoryLogRepo) {
            this.inventoryLogRepo = AppDataSource.getRepository("InventoryLog");
        }
        return this.inventoryLogRepo;
    }

    async getAllProducts(filters = {}) {
        const repo = this.getProductRepo();
        const where = { isActive: true };

        if (filters.categoryId) {
            where.categoryId = parseInt(filters.categoryId, 10);
        }

        const query = repo.createQueryBuilder("product")
            .leftJoinAndSelect("product.category", "category")
            .where("product.isActive = :isActive", { isActive: true });

        if (filters.categoryId) {
            query.andWhere("product.categoryId = :catId", { catId: parseInt(filters.categoryId, 10) });
        }

        if (filters.search) {
            query.andWhere(
                "(product.name LIKE :search OR product.barcode LIKE :search OR product.description LIKE :search)",
                { search: `%${filters.search}%` }
            );
        }

        if (filters.lowStock === "true" || filters.lowStock === true) {
            query.andWhere("product.stockQuantity <= product.minStockThreshold");
        }

        query.orderBy("product.id", "DESC");

        return await query.getMany();
    }

    async getProductById(id) {
        const repo = this.getProductRepo();
        return await repo.findOne({
            where: { id: parseInt(id, 10), isActive: true },
            relations: ["category"],
        });
    }

    async getProductByBarcode(barcode) {
        const repo = this.getProductRepo();
        return await repo.findOne({
            where: { barcode, isActive: true },
            relations: ["category"],
        });
    }

    async createProduct(data, userId = null) {
        const repo = this.getProductRepo();
        const invRepo = this.getInventoryLogRepo();

        const existingBarcode = await repo.findOne({ where: { barcode: data.barcode } });
        if (existingBarcode) {
            const err = new Error("الباركود مسجل بالفعل لصنف آخر (Barcode already exists)");
            err.statusCode = 400;
            throw err;
        }

        const initialStock = parseInt(data.stockQuantity, 10) || 0;

        const product = repo.create({
            name: data.name,
            barcode: data.barcode,
            description: data.description || "",
            categoryId: parseInt(data.categoryId, 10),
            unit: data.unit || "حبة",
            costPrice: parseFloat(data.costPrice) || 0,
            sellingPrice: parseFloat(data.sellingPrice) || 0,
            stockQuantity: initialStock,
            minStockThreshold: parseInt(data.minStockThreshold, 10) || 5,
            imageUrl: data.imageUrl || null,
            isActive: true,
        });

        const savedProduct = await repo.save(product);

        // Record initial inventory log
        if (initialStock > 0) {
            const log = invRepo.create({
                productId: savedProduct.id,
                changeType: "IN",
                quantityChange: initialStock,
                previousStock: 0,
                newStock: initialStock,
                reason: "رصيد افتتاحي عند إضافة الصنف الجديد",
                performedByUserId: userId,
            });
            await invRepo.save(log);
        }

        return await this.getProductById(savedProduct.id);
    }

    async updateProduct(id, data, userId = null) {
        const repo = this.getProductRepo();
        const invRepo = this.getInventoryLogRepo();

        const product = await repo.findOne({ where: { id: parseInt(id, 10) } });
        if (!product) return null;

        if (data.name) product.name = data.name;
        if (data.description !== undefined) product.description = data.description;
        if (data.categoryId) product.categoryId = parseInt(data.categoryId, 10);
        if (data.unit) product.unit = data.unit;
        if (data.costPrice !== undefined) product.costPrice = parseFloat(data.costPrice);
        if (data.sellingPrice !== undefined) product.sellingPrice = parseFloat(data.sellingPrice);
        if (data.minStockThreshold !== undefined) product.minStockThreshold = parseInt(data.minStockThreshold, 10);
        if (data.imageUrl !== undefined) product.imageUrl = data.imageUrl;
        if (data.isActive !== undefined) product.isActive = data.isActive;

        // Check if stock quantity explicitly adjusted via product update
        if (data.stockQuantity !== undefined && parseInt(data.stockQuantity, 10) !== product.stockQuantity) {
            const oldStock = product.stockQuantity;
            const newStock = parseInt(data.stockQuantity, 10);
            const diff = newStock - oldStock;

            product.stockQuantity = newStock;

            const log = invRepo.create({
                productId: product.id,
                changeType: "AUDIT_ADJUSTMENT",
                quantityChange: diff,
                previousStock: oldStock,
                newStock: newStock,
                reason: data.adjustmentReason || "تعديل كمية المخزون من بطاقة الصنف",
                performedByUserId: userId,
            });
            await invRepo.save(log);
        }

        await repo.save(product);
        return await this.getProductById(product.id);
    }

    async deleteProduct(id) {
        const repo = this.getProductRepo();
        const product = await repo.findOne({ where: { id: parseInt(id, 10) } });
        if (!product) return false;

        product.isActive = false;
        await repo.save(product);
        return true;
    }

    async getLowStockAlerts() {
        const repo = this.getProductRepo();
        return await repo.createQueryBuilder("product")
            .leftJoinAndSelect("product.category", "category")
            .where("product.isActive = :isActive", { isActive: true })
            .andWhere("product.stockQuantity <= product.minStockThreshold")
            .orderBy("product.stockQuantity", "ASC")
            .getMany();
    }
}

module.exports = new ProductService();
