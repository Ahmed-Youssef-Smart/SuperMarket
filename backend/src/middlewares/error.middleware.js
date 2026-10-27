const errorHandler = (err, req, res, next) => {
    console.error("Server Error:", err);

    const statusCode = err.statusCode || 500;
    const message = err.message || "حدث خطأ غير متوقع في الخادم (Internal Server Error)";

    res.status(statusCode).json({
        status: "error",
        message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};

module.exports = { errorHandler };
