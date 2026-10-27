const { EntitySchema } = require("typeorm");

const CategorySchema = new EntitySchema({
    name: "Category",
    tableName: "Categories",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        name: {
            type: "nvarchar",
            length: 100,
            unique: true,
        },
        description: {
            type: "nvarchar",
            length: 500,
            nullable: true,
        },
        icon: {
            type: "nvarchar",
            length: 50,
            default: "fa-shopping-basket",
        },
        displayOrder: {
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
    },
    relations: {
        products: {
            type: "one-to-many",
            target: "Product",
            inverseSide: "category",
        },
    },
});

module.exports = { CategorySchema };
