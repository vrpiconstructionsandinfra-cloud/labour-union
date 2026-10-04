"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insuranceSchema = void 0;
const zod_1 = require("zod");
const parseWorkerId = zod_1.z.preprocess((val) => {
    if (typeof val === "number")
        return val;
    if (typeof val === "string") {
        const digits = val.replace(/\D/g, "");
        if (digits)
            return Number(digits);
        return Number(val);
    }
    return val;
}, zod_1.z.number().positive());
const optionalTrimmedString = (minLen = 1) => zod_1.z.preprocess((val) => {
    if (typeof val === "string") {
        const trimmed = val.trim();
        return trimmed === "" ? undefined : trimmed;
    }
    return val === null ? undefined : val;
}, zod_1.z.string().min(minLen).optional());
const optionalNumeric = zod_1.z.preprocess((val) => {
    if (val === "" || val === null || val === undefined)
        return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
}, zod_1.z.number().positive().optional());
exports.insuranceSchema = zod_1.z.object({
    workerId: parseWorkerId,
    provider: optionalTrimmedString(2),
    policyNumber: optionalTrimmedString(2),
    coverageAmount: optionalNumeric,
    premiumAmount: optionalNumeric,
    startDate: optionalTrimmedString(1),
    endDate: optionalTrimmedString(1),
    status: zod_1.z.enum(["ACTIVE", "EXPIRED", "PENDING", "CANCELLED"]).optional(),
});
