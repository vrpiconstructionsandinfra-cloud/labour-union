"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentSchema = void 0;
const zod_1 = require("zod");
exports.paymentSchema = zod_1.z.object({
    workerId: zod_1.z.number(),
    weekStart: zod_1.z.string().datetime(),
    weekEnd: zod_1.z.string().datetime(),
    basicAmount: zod_1.z.number().positive(),
    overtimeAmount: zod_1.z.number().default(0),
    bonus: zod_1.z.number().default(0),
    deduction: zod_1.z.number().default(0),
    insuranceDeduction: zod_1.z.number().default(0),
});
