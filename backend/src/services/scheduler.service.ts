import prisma from "../config/prisma";
import { createNotification } from "./notification.service";

/**
 * Triggers the Saturday Weekly Audit Excel Report Notification for Super Agents
 */
export const triggerSaturdayAuditNotification = async () => {
  return await createNotification({
    role: "SUPER_AGENT",
    title: "Saturday Weekly Audit Excel Report",
    message: "Saturday Weekly Audit Excel Report is ready for review and download.",
    type: "REPORT",
  });
};

/**
 * Initializes the automated Saturday 6:00 PM Cron/Scheduler check
 */
export const initAuditScheduler = () => {
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

        const existingNotif = await prisma.notification.findFirst({
          where: {
            role: "SUPER_AGENT",
            title: "Saturday Weekly Audit Excel Report",
            createdAt: { gte: startOfDay },
          },
        });

        if (!existingNotif) {
          console.log("⏰ Auto-triggering Saturday 6 PM Weekly Audit Excel Report Notification...");
          await triggerSaturdayAuditNotification();
        }
      }
    } catch (err) {
      console.error("[Scheduler Service Error]:", (err as Error).message);
    }
  }, 60000);
};
