import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("Password123!", 10);
  const user = await prisma.user.upsert({
    where: { email: "vineeth@gmail.com" },
    update: { password: hashedPassword },
    create: {
      name: "Vineeth",
      email: "vineeth@gmail.com",
      password: hashedPassword,
      phone: "+91 9855555555",
      role: "WORKER",
      employeeCode: "WRK-005",
      designation: "Site Technician",
      salary: 28000
    }
  });
  console.log("SUCCESS_UPSERT_USER:", user.email);
}

main()
  .catch((err) => {
    console.error("UPSERT_ERROR:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
