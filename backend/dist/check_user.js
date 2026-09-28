"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = __importDefault(require("./config/prisma"));
async function main() {
    const deletedComments = await prisma_1.default.supportTicketComment.deleteMany({});
    const deletedTickets = await prisma_1.default.supportTicket.deleteMany({});
    console.log(`Deleted ${deletedComments.count} comments and ${deletedTickets.count} tickets from backend database.`);
    const remaining = await prisma_1.default.supportTicket.count();
    console.log(`Remaining tickets in database: ${remaining}`);
}
main().catch(console.error).finally(() => prisma_1.default.$disconnect());
