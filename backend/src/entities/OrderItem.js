const { EntitySchema } = require("typeorm");

const OrderItemSchema = new EntitySchema({
    name: "OrderItem",
    tableName: "OrderItems",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        orderId: {
            type: "int",
        },
        productId: {
            type: "int",
        },
        productName: {
            type: "nvarchar",
            length: 200,
        },
        quantity: {
            type: "int",
        },
        unitPrice: {
            type: "decimal",
            precision: 18,
            scale: 2,
        },
        itemDiscount: {
            type: "decimal",
            precision: 18,
            scale: 2,
            default: 0.0,
        },
        subtotal: {
            type: "decimal",
            precision: 18,
            scale: 2,
        },
        returnedQuantity: {
            type: "int",
            default: 0,
        },
    },
    relations: {
        order: {
            type: "many-to-one",
            target: "Order",
            joinColumn: { name: "orderId" },
            onDelete: "CASCADE",
        },
        product: {
            type: "many-to-one",
            target: "Product",
            joinColumn: { name: "productId" },
        },
    },
});

module.exports = { OrderItemSchema };
