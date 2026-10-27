const AppDataSource = require("../config/database");

class InventoryService {
    constructor() {
        this.logRepo = null;
        this.productRepo = null;
    }

    getRepositories() {
        if (!this.logRepo) {
            this.logRepo = AppDataSource.getRepository("InventoryLog");
            this.productRepo = AppDataSource.getRepository("Product");
        }
        return {
            logRepo: this.logRepo,
            productRepo: this.productRepo,
        };
    }

    async getInventoryLogs(filters = {}) {
        const { logRepo } = this.getRepositories();
        const query = logRepo.createQueryBuilder("log")
            .leftJoinAndSelect("log.product", "product")
            .leftJoinAndSelect("log.performedByUser", "user")
            .orderBy("log.id", "DESC");

        if (filters.productId) {
            query.andWhere("log.productId = :pId", { pId: parseInt(filters.productId, 10) });
        }

        if (filters.changeType) {
            query.andWhere("log.changeType = :cType", { cType: filters.changeType });
        }

        return await query.getMany();
    }

    async adjustStock(productId, actualCount, reason = "تسوية جرد دوري", userId = null) {
        const { logRepo, productRepo } = this.getRepositories();
        const product = await productRepo.findOne({ where: { id: parseInt(productId, 10) } });
        if (!product) {
            const err = new Error("الصنف غير موجود");
            err.statusCode = 404;
            throw err;
        }

        const newCount = parseInt(actualCount, 10);
        const oldCount = product.stockQuantity;
        const diff = newCount - oldCount;

        product.stockQuantity = newCount;
        await productRepo.save(product);

        const log = logRepo.create({
            productId: product.id,
            changeType: diff >= 0 ? "IN" : "AUDIT_ADJUSTMENT",
            quantityChange: diff,
            previousStock: oldCount,
            newStock: newCount,
            reason: reason || "تسوية جرد دوري بالمخزن",
            performedByUserId: userId,
        });

        await logRepo.save(log);

        return {
            product,
            auditLog: log,
            difference: diff,
        };
    }

    async getInventoryAuditSummary() {
        const { productRepo } = this.getRepositories();
        const products = await productRepo.find({
            where: { isActive: true },
            relations: ["category"],
            order: { stockQuantity: "ASC" },
        });

        const totalItemsCount = products.length;
        let totalStockUnits = 0;
        let totalInventoryCostValue = 0;
        let totalInventoryRetailValue = 0;
        const lowStockItems = [];

        products.forEach(p => {
            const qty = p.stockQuantity || 0;
            totalStockUnits += qty;
            totalInventoryCostValue += (parseFloat(p.costPrice) || 0) * qty;
            totalInventoryRetailValue += (parseFloat(p.sellingPrice) || 0) * qty;

            if (qty <= (p.minStockThreshold || 5)) {
                lowStockItems.push(p);
            }
        });

        return {
            totalItemsCount,
            totalStockUnits,
            totalInventoryCostValue: parseFloat(totalInventoryCostValue.toFixed(2)),
            totalInventoryRetailValue: parseFloat(totalInventoryRetailValue.toFixed(2)),
            lowStockCount: lowStockItems.length,
            lowStockItems,
            allProducts: products,
        };
    }
}

module.exports = new InventoryService();
