"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportSchema = void 0;
const zod_1 = require("zod");
exports.supportSchema = zod_1.z.object({
    subject: zod_1.z.string().min(3),
    description: zod_1.z.string().min(10),
    priority: zod_1.z.enum([
        "LOW",
        "MEDIUM",
        "HIGH",
    ]),
});
