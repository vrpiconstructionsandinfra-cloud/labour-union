"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = __importDefault(require("./config/prisma"));
async function main() {
    const users = await prisma_1.default.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeCode: true
        }
    });
    console.log("ALL USERS IN DB:");
    console.log(JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => prisma_1.default.$disconnect());
