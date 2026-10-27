const bcrypt = require("bcryptjs");
const AppDataSource = require("../config/database");

class UserService {
    constructor() {
        this.userRepo = null;
    }

    getUserRepository() {
        if (!this.userRepo) {
            this.userRepo = AppDataSource.getRepository("User");
        }
        return this.userRepo;
    }

    async getAllUsers() {
        const repo = this.getUserRepository();
        return await repo.find({
            select: ["id", "name", "email", "role", "phone", "address", "isActive", "createdAt"],
            order: { id: "DESC" },
        });
    }

    async getUserById(id) {
        const repo = this.getUserRepository();
        return await repo.findOne({
            where: { id: parseInt(id, 10) },
            select: ["id", "name", "email", "role", "phone", "address", "isActive", "createdAt"],
        });
    }

    async createUser(data) {
        const repo = this.getUserRepository();
        const existing = await repo.findOne({ where: { email: data.email } });
        if (existing) {
            const err = new Error("البريد الإلكتروني مستخدم بالفعل");
            err.statusCode = 400;
            throw err;
        }

        const hashedPassword = await bcrypt.hash(data.password || "123456", 10);
        const user = repo.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: data.role || "customer",
            phone: data.phone || null,
            address: data.address || null,
        });

        const saved = await repo.save(user);
        const { password, ...safeUser } = saved;
        return safeUser;
    }

    async updateUser(id, data) {
        const repo = this.getUserRepository();
        const user = await repo.findOne({ where: { id: parseInt(id, 10) } });
        if (!user) return null;

        if (data.name) user.name = data.name;
        if (data.phone !== undefined) user.phone = data.phone;
        if (data.address !== undefined) user.address = data.address;
        if (data.role) user.role = data.role;
        if (data.isActive !== undefined) user.isActive = data.isActive;

        if (data.password) {
            user.password = await bcrypt.hash(data.password, 10);
        }

        const updated = await repo.save(user);
        const { password, ...safeUser } = updated;
        return safeUser;
    }

    async deleteUser(id) {
        const repo = this.getUserRepository();
        const user = await repo.findOne({ where: { id: parseInt(id, 10) } });
        if (!user) return false;

        // Soft delete or deactivate
        user.isActive = false;
        await repo.save(user);
        return true;
    }
}

module.exports = new UserService();
