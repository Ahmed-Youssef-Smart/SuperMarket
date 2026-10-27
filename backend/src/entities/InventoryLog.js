const { EntitySchema } = require("typeorm");

const InventoryLogSchema = new EntitySchema({
    name: "InventoryLog",
    tableName: "InventoryLogs",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        productId: {
            type: "int",
        },
        changeType: {
            type: "nvarchar",
            length: 30, // 'IN', 'OUT', 'AUDIT_ADJUSTMENT', 'SALE', 'RETURN'
        },
        quantityChange: {
            type: "int",
        },
        previousStock: {
            type: "int",
        },
        newStock: {
            type: "int",
        },
        reason: {
            type: "nvarchar",
            length: 255,
            nullable: true,
        },
        performedByUserId: {
            type: "int",
            nullable: true,
        },
        createdAt: {
            type: "datetime2",
            createDate: true,
        },
    },
    relations: {
        product: {
            type: "many-to-one",
            target: "Product",
            joinColumn: { name: "productId" },
            onDelete: "CASCADE",
        },
        performedByUser: {
            type: "many-to-one",
            target: "User",
            joinColumn: { name: "performedByUserId" },
            nullable: true,
        },
    },
});

module.exports = { InventoryLogSchema };
