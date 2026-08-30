"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSiteSchema = void 0;
const zod_1 = require("zod");
exports.createSiteSchema = zod_1.z.object({
    siteCode: zod_1.z
        .string()
        .min(3, "Site code must be at least 3 characters")
        .max(20),
    siteName: zod_1.z
        .string()
        .min(3, "Site name is required"),
    companyName: zod_1.z
        .string()
        .min(3, "Company name is required"),
    address: zod_1.z
        .string()
        .min(5, "Address is required"),
    city: zod_1.z
        .string()
        .min(2),
    state: zod_1.z
        .string()
        .min(2),
    pincode: zod_1.z
        .string()
        .regex(/^[0-9]{6}$/, "Invalid pincode"),
    contactPerson: zod_1.z
        .string()
        .min(3),
    contactNumber: zod_1.z
        .string()
        .regex(/^[0-9]{10}$/, "Invalid phone number"),
    status: zod_1.z
        .string()
        .optional()
});
