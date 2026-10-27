const { EntitySchema } = require("typeorm");

const CartItemSchema = new EntitySchema({
    name: "CartItem",
    tableName: "CartItems",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        customerId: {
            type: "int",
        },
        productId: {
            type: "int",
        },
        quantity: {
            type: "int",
            default: 1,
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
            onDelete: "CASCADE",
        },
        product: {
            type: "many-to-one",
            target: "Product",
            joinColumn: { name: "productId" },
            onDelete: "CASCADE",
        },
    },
});

module.exports = { CartItemSchema };
