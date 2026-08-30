"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceSchema = void 0;
const zod_1 = require("zod");
exports.attendanceSchema = zod_1.z.object({
    workerId: zod_1.z.number(),
    date: zod_1.z.string(),
    status: zod_1.z.enum([
        "PRESENT",
        "ABSENT",
        "HALF_DAY",
        "HOLIDAY",
    ]),
    statusCode: zod_1.z.number().optional(),
    checkInTime: zod_1.z.string().optional().nullable(),
    checkOutTime: zod_1.z.string().optional().nullable(),
    checkInPhoto: zod_1.z.string().optional().nullable(),
    checkOutPhoto: zod_1.z.string().optional().nullable(),
    siteId: zod_1.z.number().optional().nullable(),
    dailyPay: zod_1.z.number().optional().nullable(),
    overtimeHours: zod_1.z.number().optional().default(0),
    remarks: zod_1.z.string().optional().nullable(),
});
