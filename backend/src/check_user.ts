import "dotenv/config";
import prisma from "./config/prisma";

async function main() {
  const count = await prisma.supportTicket.count();
  console.log(`Verified database support tickets count: ${count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
