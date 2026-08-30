"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveSchema = void 0;
const zod_1 = require("zod");
exports.leaveSchema = zod_1.z.object({
    fromDate: zod_1.z.string(),
    toDate: zod_1.z.string(),
    reason: zod_1.z.string().min(5),
});
