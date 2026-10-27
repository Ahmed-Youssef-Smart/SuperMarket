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
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false, // Tables are created via the SQL script, so disable auto-alter
    logging: false,
    options: {
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
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
