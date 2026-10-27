const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                status: "error",
                message: "يرجى تسجيل الدخول أولاً - التوكن مفقود (Authentication token is missing)",
            });
        }

        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET || "supermarket_super_secret_jwt_key_2026";
        const decoded = jwt.verify(token, secret);

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            status: "error",
            message: "جلسة الدخول غير صالحة أو منتهية الصلاحية (Invalid or expired token)",
        });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                status: "error",
                message: "ليس لديك صلاحية للوصول إلى هذه الميزة (Access forbidden: insufficient permissions)",
            });
        }
        next();
    };
};

module.exports = { authMiddleware, authorizeRoles };
