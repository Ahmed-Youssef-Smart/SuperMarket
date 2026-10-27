const { EntitySchema } = require("typeorm");

const ProductSchema = new EntitySchema({
    name: "Product",
    tableName: "Products",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        name: {
            type: "nvarchar",
            length: 200,
        },
        barcode: {
            type: "nvarchar",
            length: 50,
            unique: true,
        },
        description: {
            type: "nvarchar",
            length: "MAX",
            nullable: true,
        },
        categoryId: {
            type: "int",
        },
        unit: {
            type: "nvarchar",
            length: 30,
            default: "حبة",
        },
        costPrice: {
            type: "decimal",
            precision: 18,
            scale: 2,
            default: 0.0,
        },
        sellingPrice: {
            type: "decimal",
            precision: 18,
            scale: 2,
            default: 0.0,
        },
        stockQuantity: {
            type: "int",
            default: 0,
        },
        minStockThreshold: {
            type: "int",
            default: 5,
        },
        imageUrl: {
            type: "nvarchar",
            length: 500,
            nullable: true,
        },
        isPopular: {
            type: "bit",
            default: false,
        },
        salesCount: {
            type: "int",
            default: 0,
        },
        isActive: {
            type: "bit",
            default: true,
        },
        createdAt: {
            type: "datetime2",
            createDate: true,
        },
        updatedAt: {
            type: "datetime2",
            updateDate: true,
        },
    },
    relations: {
        category: {
            type: "many-to-one",
            target: "Category",
            joinColumn: { name: "categoryId" },
            onDelete: "CASCADE",
        },
        orderItems: {
            type: "one-to-many",
            target: "OrderItem",
            inverseSide: "product",
        },
        inventoryLogs: {
            type: "one-to-many",
            target: "InventoryLog",
            inverseSide: "product",
        },
    },
});

module.exports = { ProductSchema };
