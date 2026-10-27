const { EntitySchema } = require("typeorm");

const OrderSchema = new EntitySchema({
    name: "Order",
    tableName: "Orders",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        invoiceNumber: {
            type: "nvarchar",
            length: 50,
            unique: true,
        },
        customerId: {
            type: "int",
            nullable: true,
        },
        customerName: {
            type: "nvarchar",
            length: 100,
            nullable: true,
        },
        cashierId: {
            type: "int",
            nullable: true,
        },
        cashierName: {
            type: "nvarchar",
            length: 100,
            nullable: true,
        },
        shiftType: {
            type: "nvarchar",
            length: 20,
            default: "day", // 'day', 'night'
        },
        subtotal: {
            type: "decimal",
            precision: 18,
            scale: 2,
            default: 0.0,
        },
        itemDiscountsTotal: {
            type: "decimal",
            precision: 18,
            scale: 2,
            default: 0.0,
        },
        taxAmount: {
            type: "decimal",
            precision: 18,
            scale: 2,
            default: 0.0,
        },
        discountAmount: {
            type: "decimal",
            precision: 18,
            scale: 2,
            default: 0.0,
        },
        totalAmount: {
            type: "decimal",
            precision: 18,
            scale: 2,
            default: 0.0,
        },
        refundedAmount: {
            type: "decimal",
            precision: 18,
            scale: 2,
            default: 0.0,
        },
        paymentMethod: {
            type: "nvarchar",
            length: 30,
            default: "cash", // 'cash', 'card', 'online'
        },
        paymentStatus: {
            type: "nvarchar",
            length: 30,
            default: "paid", // 'paid', 'pending', 'refunded', 'partial_refund'
        },
        notes: {
            type: "nvarchar",
            length: 500,
            nullable: true,
        },
        createdAt: {
            type: "datetime2",
            createDate: true,
        },
    },
    relations: {
        customer: {
            type: "many-to-one",
            target: "User",
            joinColumn: { name: "customerId" },
            nullable: true,
        },
        cashier: {
            type: "many-to-one",
            target: "User",
            joinColumn: { name: "cashierId" },
            nullable: true,
        },
        items: {
            type: "one-to-many",
            target: "OrderItem",
            inverseSide: "order",
            cascade: true,
        },
    },
});

module.exports = { OrderSchema };
