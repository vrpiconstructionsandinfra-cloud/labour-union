"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const dashboardService = __importStar(require("../services/dashboard.service"));
const getDashboardStats = async (req, res) => {
    try {
        const reqUser = req.user ? { id: req.user.id, role: req.user.role } : undefined;
        const { startDate, endDate } = req.query;
        const statsData = await dashboardService.getDashboardStats(reqUser, startDate ? String(startDate) : undefined, endDate ? String(endDate) : undefined);
        res.json({
            success: true,
            data: {
                cards: statsData.cards,
                stats: statsData.stats,
                attendance: statsData.attendance,
                payroll: statsData.payroll,
                leave: statsData.leave,
                recentActivities: statsData.recentActivities,
                agents: statsData.agents
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to load dashboard statistics",
        });
    }
};
exports.getDashboardStats = getDashboardStats;
