"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAuditScheduler = exports.triggerSaturdayAuditNotification = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const notification_service_1 = require("./notification.service");
/**
 * Triggers the Saturday Weekly Audit Excel Report Notification for Super Agents
 */
const triggerSaturdayAuditNotification = async () => {
    return await (0, notification_service_1.createNotification)({
        role: "SUPER_AGENT",
        title: "Saturday Weekly Audit Excel Report",
        message: "Saturday Weekly Audit Excel Report is ready for review and download.",
        type: "REPORT",
    });
};
exports.triggerSaturdayAuditNotification = triggerSaturdayAuditNotification;
/**
 * Initializes the automated Saturday 6:00 PM Cron/Scheduler check
 */
const initAuditScheduler = () => {
    console.log("📅 Saturday Weekly Audit Scheduler initialized (Runs Saturday 6:00 PM).");
    // Run periodic check every 60 seconds
    setInterval(async () => {
        try {
            const now = new Date();
            const isSaturday = now.getDay() === 6; // 6 = Saturday
            const currentHour = now.getHours(); // 18 = 6 PM
            const currentMinute = now.getMinutes();
            // Trigger at 6:00 PM on Saturdays (18:00 - 18:05 window)
            if (isSaturday && currentHour === 18 && currentMinute < 5) {
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);
                const existingNotif = await prisma_1.default.notification.findFirst({
                    where: {
                        role: "SUPER_AGENT",
                        title: "Saturday Weekly Audit Excel Report",
                        createdAt: { gte: startOfDay },
                    },
                });
                if (!existingNotif) {
                    console.log("⏰ Auto-triggering Saturday 6 PM Weekly Audit Excel Report Notification...");
                    await (0, exports.triggerSaturdayAuditNotification)();
                }
            }
        }
        catch (err) {
            console.error("[Scheduler Service Error]:", err.message);
        }
    }, 60000);
};
exports.initAuditScheduler = initAuditScheduler;
