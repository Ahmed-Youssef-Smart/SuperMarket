const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AppDataSource = require("../config/database");

class AuthService {
    constructor() {
        this.userRepo = null;
    }

    getUserRepository() {
        if (!this.userRepo) {
            this.userRepo = AppDataSource.getRepository("User");
        }
        return this.userRepo;
    }

    async register(userData) {
        const repo = this.getUserRepository();
        const existing = await repo.findOne({ where: { email: userData.email } });
        if (existing) {
            const error = new Error("البريد الإلكتروني مسجل بالفعل (Email already registered)");
            error.statusCode = 400;
            throw error;
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = repo.create({
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role || "customer",
            phone: userData.phone || null,
            address: userData.address || null,
        });

        const savedUser = await repo.save(newUser);
        const { password, ...safeUser } = savedUser;
        return safeUser;
    }

    async login(email, plainPassword) {
        const repo = this.getUserRepository();
        const user = await repo.findOne({ where: { email, isActive: true } });
        if (!user) {
            const error = new Error("بيانات الدخول غير صحيحة (Invalid email or password)");
            error.statusCode = 401;
            throw error;
        }

        const isMatch = await bcrypt.compare(plainPassword, user.password);
        if (!isMatch) {
            const error = new Error("بيانات الدخول غير صحيحة (Invalid email or password)");
            error.statusCode = 401;
            throw error;
        }

        const secret = process.env.JWT_SECRET || "supermarket_super_secret_jwt_key_2026";
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            secret,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        const { password, ...safeUser } = user;
        return { user: safeUser, token };
    }
}

module.exports = new AuthService();
