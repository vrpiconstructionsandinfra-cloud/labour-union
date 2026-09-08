"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSiteSchema = void 0;
const zod_1 = require("zod");
exports.createSiteSchema = zod_1.z.object({
    siteCode: zod_1.z
        .string()
        .min(1, "Site code is required")
        .max(50)
        .optional()
        .or(zod_1.z.literal("")),
    siteName: zod_1.z
        .string()
        .min(1, "Site name is required"),
    companyName: zod_1.z
        .string()
        .optional()
        .default("Labor Union Org"),
    address: zod_1.z
        .string()
        .optional()
        .default("Site Location"),
    city: zod_1.z
        .string()
        .optional()
        .default("Mumbai"),
    state: zod_1.z
        .string()
        .optional()
        .default("Maharashtra"),
    pincode: zod_1.z
        .string()
        .optional()
        .default("400001"),
    contactPerson: zod_1.z
        .string()
        .optional()
        .default("Site Supervisor"),
    contactNumber: zod_1.z
        .string()
        .optional()
        .default("9876543210"),
    status: zod_1.z
        .string()
        .optional()
        .default("ACTIVE")
});
