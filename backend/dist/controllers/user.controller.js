"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = findAll;
exports.findOne = findOne;
exports.getPublicWorker = getPublicWorker;
exports.update = update;
exports.remove = remove;
exports.workers = workers;
exports.agents = agents;
const prisma_1 = __importDefault(require("../config/prisma"));
const user_service_1 = require("../services/user.service");
/*
 * Get all users
 */
async function findAll(req, res) {
    try {
        const users = await (0, user_service_1.getAllUsers)();
        res.json({
            success: true,
            data: users,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Get user by ID
 */
async function findOne(req, res) {
    try {
        const id = Number(req.params.id);
        const user = await (0, user_service_1.getUserById)(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Public worker verification profile endpoint (No JWT required)
 */
async function getPublicWorker(req, res) {
    try {
        const id = Number(req.params.id);
        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: "Invalid worker ID" });
        }
        const worker = await prisma_1.default.user.findUnique({
            where: { id },
            include: {
                site: true,
                assignedAgent: true
            }
        });
        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker profile not found" });
        }
        res.json({
            success: true,
            data: {
                id: worker.id,
                name: worker.name,
                email: worker.email,
                phone: worker.phone,
                employeeCode: worker.employeeCode || `WRK-${String(worker.id).padStart(3, '0')}`,
                designation: worker.designation || 'General Worker',
                role: worker.role,
                avatar: worker.avatar || worker.profileImage,
                address: worker.address || 'Labor Union Registered Member',
                siteName: worker.site?.siteName || 'Assigned Site',
                siteCode: worker.site?.siteCode || 'SITE-001',
                city: worker.site?.city || 'Mumbai',
                state: worker.site?.state || 'Maharashtra',
                status: worker.active ? 'ACTIVE' : 'INACTIVE',
                joinedAt: worker.createdAt
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
/*
 * Update user
 */
async function update(req, res) {
    try {
        const id = Number(req.params.id);
        const user = await (0, user_service_1.updateUser)(id, req.body, req.user);
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Delete user
 */
async function remove(req, res) {
    try {
        const id = Number(req.params.id);
        await (0, user_service_1.deleteUser)(id, req.user);
        res.json({
            success: true,
            message: "User deleted successfully",
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Get workers filtered by logged-in user role
 */
async function workers(req, res) {
    try {
        const reqUser = req.user ? { id: req.user.id, role: req.user.role } : undefined;
        const users = await (0, user_service_1.getWorkers)(reqUser);
        res.json({
            success: true,
            data: users,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Get all agents
 */
async function agents(req, res) {
    try {
        const users = await (0, user_service_1.getAgents)();
        res.json({
            success: true,
            data: users,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
