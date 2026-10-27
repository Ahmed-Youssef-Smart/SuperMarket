const { EntitySchema } = require("typeorm");

const UserSchema = new EntitySchema({
    name: "User",
    tableName: "Users",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        name: {
            type: "nvarchar",
            length: 100,
        },
        email: {
            type: "nvarchar",
            length: 150,
            unique: true,
        },
        password: {
            type: "nvarchar",
            length: 255,
        },
        role: {
            type: "nvarchar",
            length: 20,
            default: "customer", // 'admin', 'cashier', 'customer'
        },
        phone: {
            type: "nvarchar",
            length: 20,
            nullable: true,
        },
        address: {
            type: "nvarchar",
            length: 255,
            nullable: true,
        },
        canAddProduct: {
            type: "bit",
            default: false,
        },
        canEditPrice: {
            type: "bit",
            default: false,
        },
        canDeleteProduct: {
            type: "bit",
            default: false,
        },
        canAuditInventory: {
            type: "bit",
            default: false,
        },
        canProcessReturns: {
            type: "bit",
            default: false,
        },
        canManageSettings: {
            type: "bit",
            default: false,
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
        orders: {
            type: "one-to-many",
            target: "Order",
            inverseSide: "customer",
        },
        cartItems: {
            type: "one-to-many",
            target: "CartItem",
            inverseSide: "customer",
        },
    },
});

module.exports = { UserSchema };
