"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletTransactionSchema = exports.walletIdSchema = void 0;
const zod_1 = require("zod");
exports.walletIdSchema = zod_1.z.object({
    workerId: zod_1.z.coerce.number().positive(),
});
exports.walletTransactionSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    description: zod_1.z.string().optional(),
});
