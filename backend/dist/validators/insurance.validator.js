"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insuranceSchema = void 0;
const zod_1 = require("zod");
exports.insuranceSchema = zod_1.z.object({
    workerId: zod_1.z.number().positive(),
    provider: zod_1.z.string().min(2),
    policyNumber: zod_1.z.string().min(3),
    coverageAmount: zod_1.z.number().positive(),
    premiumAmount: zod_1.z.number().positive(),
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string(),
});
