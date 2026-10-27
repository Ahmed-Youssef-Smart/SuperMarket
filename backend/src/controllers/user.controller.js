const userService = require("../services/user.service");

class UserController {
    constructor() {
        this.userService = userService;
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async getAll(req, res) {
        try {
            const users = await this.userService.getAllUsers();
            res.json({ status: "success", data: users });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const user = await this.userService.getUserById(req.params.id);
            if (!user) {
                return res.status(404).json({ status: "error", message: "المستخدم غير موجود" });
            }
            res.json({ status: "success", data: user });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }

    async create(req, res) {
        try {
            const newUser = await this.userService.createUser(req.body);
            res.status(201).json({ status: "success", data: newUser });
        } catch (error) {
            res.status(error.statusCode || 400).json({ status: "error", message: error.message });
        }
    }

    async update(req, res) {
        try {
            if (req.user.id !== parseInt(req.params.id, 10) && req.user.role !== "admin") {
                return res.status(403).json({ status: "error", message: "غير مصرح لك بتعديل بيانات هذا المستخدم" });
            }

            const updatedUser = await this.userService.updateUser(req.params.id, req.body);
            if (!updatedUser) {
                return res.status(404).json({ status: "error", message: "المستخدم غير موجود" });
            }
            res.json({ status: "success", data: updatedUser });
        } catch (error) {
            res.status(400).json({ status: "error", message: error.message });
        }
    }

    async delete(req, res) {
        try {
            if (req.user.role !== "admin") {
                return res.status(403).json({ status: "error", message: "صلاحية الحذف مخصصة للمدير فقط" });
            }

            const deleted = await this.userService.deleteUser(req.params.id);
            if (!deleted) {
                return res.status(404).json({ status: "error", message: "المستخدم غير موجود" });
            }
            res.json({ status: "success", message: "تم تعطيل/حذف المستخدم بنجاح" });
        } catch (error) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }
}

module.exports = new UserController();
