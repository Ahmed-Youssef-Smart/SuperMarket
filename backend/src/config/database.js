require("dotenv").config();
const { DataSource } = require("typeorm");
const { UserSchema } = require("../entities/User");
const { CategorySchema } = require("../entities/Category");
const { ProductSchema } = require("../entities/Product");
const { OrderSchema } = require("../entities/Order");
const { OrderItemSchema } = require("../entities/OrderItem");
const { CartItemSchema } = require("../entities/CartItem");
const { InventoryLogSchema } = require("../entities/InventoryLog");
const { SystemSettingSchema } = require("../entities/SystemSetting");

const AppDataSource = new DataSource({
    type: "mssql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    username: process.env.DB_USER || "sa",
    password: process.env.DB_PASSWORD || "YourStrongPassword!123",
    database: process.env.DB_NAME || "SupermarketDB",
    synchronize: false, // We already created tables with the SQL script, so disable auto-alter
    logging: false,
    options: {
        encrypt: false, // For local dev MSSQL
        trustServerCertificate: true, // Necessary for self-signed certificates in local SQL Server
        enableArithAbort: true,
    },
    entities: [
        UserSchema,
        CategorySchema,
        ProductSchema,
        OrderSchema,
        OrderItemSchema,
        CartItemSchema,
        InventoryLogSchema,
        SystemSettingSchema,
    ],
});

module.exports = AppDataSource;
