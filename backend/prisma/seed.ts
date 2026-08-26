import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in .env");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com") || connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database cleanly with sole Super Agent account...");

  // Clean existing data
  await prisma.supportTicketComment.deleteMany().catch(() => {});
  await prisma.supportTicket.deleteMany().catch(() => {});
  await prisma.insurance.deleteMany().catch(() => {});
  await prisma.walletTransaction.deleteMany().catch(() => {});
  await prisma.wallet.deleteMany().catch(() => {});
  await prisma.payment.deleteMany().catch(() => {});
  await prisma.leave.deleteMany().catch(() => {});
  await prisma.attendance.deleteMany().catch(() => {});
  await prisma.notification.deleteMany().catch(() => {});
  await prisma.disbursementRequest.deleteMany().catch(() => {});
  await prisma.user.updateMany({ data: { siteId: null, assignedAgentId: null } }).catch(() => {});
  await prisma.site.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});

  const hashedPassword = await bcrypt.hash("satish@123", 10);

  // Create single clean Super Agent account
  const superAgent = await prisma.user.create({
    data: {
      name: "Satish Goud",
      email: "satishgoudarcr@gmail.com",
      password: hashedPassword,
      phone: "+91 9876543210",
      role: UserRole.SUPER_AGENT,
      employeeCode: "SA-001",
      designation: "Super Admin",
      salary: 150000,
    },
  });

  console.log("Database seeded successfully!");
  console.log("-----------------------------------------");
  console.log("Super Agent Account:");
  console.log(`Email: ${superAgent.email}`);
  console.log("Password: satish@123");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
