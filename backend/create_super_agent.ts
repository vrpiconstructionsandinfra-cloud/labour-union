import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { UserRole, UserStatus } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment.");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Upserting Super Agent user...");

  const email = "satishgoudarcr@gmail.com";
  const rawPassword = "satish@123";
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const superAgent = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      password: hashedPassword,
      role: UserRole.SUPER_AGENT,
      name: "Satish Goud",
      status: UserStatus.ACTIVE,
    },
    create: {
      name: "Satish Goud",
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: "+91 9876543210",
      role: UserRole.SUPER_AGENT,
      employeeCode: "SA-001",
      status: UserStatus.ACTIVE,
    },
  });

  console.log("--------------------------------------------------");
  console.log("Super Agent created/updated successfully!");
  console.log(`ID:       ${superAgent.id}`);
  console.log(`Email:    ${superAgent.email}`);
  console.log(`Role:     ${superAgent.role}`);
  console.log("--------------------------------------------------");
}

main()
  .catch((err) => {
    console.error("Error creating super agent:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
