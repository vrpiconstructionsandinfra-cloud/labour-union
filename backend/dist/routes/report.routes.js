"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const client_1 = require("@prisma/client");
const report_service_1 = require("../services/report.service");
const router = (0, express_1.Router)();
// GET /api/reports/saturday-weekly-status
router.get('/saturday-weekly-status', auth_middleware_1.authenticate, (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT), (req, res) => {
    try {
        const demo = req.query.demo === 'true';
        const status = (0, report_service_1.checkSaturdayWindowStatus)();
        if (demo) {
            status.active = true;
            status.message = 'Saturday Weekly Audit Report is AVAILABLE (Demo Mode Forced)';
        }
        return res.json(status);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// GET /api/reports/saturday-weekly-data
router.get('/saturday-weekly-data', auth_middleware_1.authenticate, (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT), async (req, res) => {
    try {
        const { rows, weekDays } = await (0, report_service_1.generateSaturdayWeeklyReportData)();
        return res.json({ success: true, count: rows.length, data: rows, weekDays });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// GET /api/reports/saturday-weekly-excel (Download CSV/Excel)
router.get('/saturday-weekly-excel', auth_middleware_1.authenticate, (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT), async (req, res) => {
    try {
        const demo = req.query.demo === 'true';
        const status = (0, report_service_1.checkSaturdayWindowStatus)();
        if (!status.active && !demo) {
            return res.status(403).json({
                error: 'Saturday Weekly Audit Excel Report is only available from Saturday 6:00 PM to Monday 9:00 AM.'
            });
        }
        const csvContent = await (0, report_service_1.generateSaturdayWeeklyCsv)();
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `Saturday_Weekly_Audit_Report_${dateStr}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.send(csvContent);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// POST /api/reports/send-saturday-email
router.post('/send-saturday-email', auth_middleware_1.authenticate, (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT), async (req, res) => {
    try {
        const reqUser = req.user;
        const targetEmail = req.body.email || reqUser?.email || 'superagent@laborunion.com';
        const result = await (0, report_service_1.sendSaturdayWeeklyReportEmail)(targetEmail);
        return res.json({
            success: true,
            message: `Weekly Saturday Excel Report email sent successfully to ${targetEmail}!`,
            details: result
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
