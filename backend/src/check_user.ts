import "dotenv/config";
import prisma from "./config/prisma";

async function main() {
  const users = await prisma.user.findMany({
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

main().catch(console.error).finally(() => prisma.$disconnect());
