"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentSchema = void 0;
const zod_1 = require("zod");
exports.createAgentSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    phone: zod_1.z.string().optional(),
    employeeCode: zod_1.z.string().min(2),
    designation: zod_1.z.string(),
    salary: zod_1.z.number(),
    siteId: zod_1.z.number().optional(),
    joiningDate: zod_1.z.string().optional(),
});
