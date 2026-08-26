import { z } from "zod";

export const attendanceSchema = z.object({
  workerId: z.number(),
  date: z.string(),
  status: z.enum([
    "PRESENT",
    "ABSENT",
    "HALF_DAY",
    "HOLIDAY",
  ]),
  statusCode: z.number().optional(),
  checkInTime: z.string().optional().nullable(),
  checkOutTime: z.string().optional().nullable(),
  checkInPhoto: z.string().optional().nullable(),
  checkOutPhoto: z.string().optional().nullable(),
  siteId: z.number().optional().nullable(),
  dailyPay: z.number().optional().nullable(),
  overtimeHours: z.number().optional().default(0),
  remarks: z.string().optional().nullable(),
});