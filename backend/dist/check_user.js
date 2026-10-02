"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = __importDefault(require("./config/prisma"));
async function main() {
    const count = await prisma_1.default.supportTicket.count();
    console.log(`Verified database support tickets count: ${count}`);
}
main().catch(console.error).finally(() => prisma_1.default.$disconnect());
