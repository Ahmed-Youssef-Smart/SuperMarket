const { EntitySchema } = require("typeorm");

const SystemSettingSchema = new EntitySchema({
    name: "SystemSetting",
    tableName: "SystemSettings",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        supermarketName: {
            type: "nvarchar",
            length: 150,
            default: "سوبرماركت السعادة الحديث",
        },
        logoUrl: {
            type: "nvarchar",
            length: 500,
            nullable: true,
        },
        defaultLanguage: {
            type: "nvarchar",
            length: 10,
            default: "ar", // 'ar', 'en', 'fr'
        },
        currency: {
            type: "nvarchar",
            length: 20,
            default: "ج.م",
        },
        taxRate: {
            type: "decimal",
            precision: 5,
            scale: 2,
            default: 15.0,
        },
        taxNumber: {
            type: "nvarchar",
            length: 50,
            nullable: true,
            default: "300123456700003",
        },
        address: {
            type: "nvarchar",
            length: 255,
            nullable: true,
        },
        phone: {
            type: "nvarchar",
            length: 50,
            nullable: true,
        },
        updatedAt: {
            type: "datetime2",
            updateDate: true,
        },
    },
});

module.exports = { SystemSettingSchema };
