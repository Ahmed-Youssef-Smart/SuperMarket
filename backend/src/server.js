require("dotenv").config();
require("reflect-metadata");
const express = require("express");
const cors = require("cors");
const path = require("path");
const AppDataSource = require("./config/database");
const apiRoutes = require("./routes");
const { errorHandler } = require("./middlewares/error.middleware");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse JSON and urlencoded payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets if accessed via backend
app.use(express.static(path.join(__dirname, "../../frontend")));

// Health Check API
app.get("/api/health", (req, res) => {
    res.json({
        status: "success",
        message: "Supermarket Management System API is running smoothly",
        database: AppDataSource.isInitialized ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
    });
});

// API Routes
app.use("/api/v1", apiRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

// Initialize TypeORM DataSource and Start Server
AppDataSource.initialize()
    .then(() => {
        console.log("=================================================");
        console.log("✅ TypeORM: Microsoft SQL Server connected successfully!");
        console.log("=================================================");
        app.listen(PORT, () => {
            console.log(`🚀 Supermarket Backend Server running on: http://localhost:${PORT}`);
            console.log(`📊 API Base URL: http://localhost:${PORT}/api/v1`);
            console.log(`🛒 Web Dashboard: http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("❌ Failed to connect to Microsoft SQL Server:", error.message);
        console.log("⚠️  Starting server in Offline/Mock mode for frontend testing...");
        app.listen(PORT, () => {
            console.log(`🚀 Server running in standalone mode on: http://localhost:${PORT}`);
            console.log("ℹ️  Note: Connect to MS SQL Server 2025 to enable persistent DB storage.");
        });
    });
