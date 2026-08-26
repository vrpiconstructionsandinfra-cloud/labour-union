import "dotenv/config";
import prisma from "./src/config/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

async function main() {
  console.log("Upserting Satish Field Agent credentials...");

  const hashedPassword = await bcrypt.hash("Satish@12345", 10);
  const email = "satishgoudarcr@gmail.com";

  // 1. Get or create site
  let site = await prisma.site.findFirst();
  if (!site) {
    let superAdmin = await prisma.user.findFirst({ where: { role: "SUPER_AGENT" } });
    if (!superAdmin) {
      superAdmin = await prisma.user.create({
        data: {
          name: "Super Admin",
          email: "superagent@laborunion.com",
          password: hashedPassword,
          role: "SUPER_AGENT",
          employeeCode: "SA-001"
        }
      });
    }

    site = await prisma.site.create({
      data: {
        siteCode: "SITE-101",
        siteName: "Metro Line 3 Construction",
        companyName: "L&T Infrastructure Ltd",
        address: "Bandra Kurla Complex",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400051",
        contactPerson: "Vikram Sharma",
        contactNumber: "+91 9988776655",
        createdById: superAdmin.id,
      }
    });
  }

  // 2. Upsert satishgoudarcr@gmail.com user
  const agentUser = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      password: hashedPassword,
      role: UserRole.AGENT,
      name: "Satish (Field Agent)",
      designation: "Field Supervisor",
      status: "ACTIVE",
      siteId: site.id
    },
    create: {
      name: "Satish (Field Agent)",
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: "+91 9876543210",
      role: UserRole.AGENT,
      employeeCode: "AGT-777",
      designation: "Field Supervisor",
      status: "ACTIVE",
      siteId: site.id
    }
  });

  // Clean up any typo record if exists
  await prisma.user.deleteMany({
    where: { email: "satisgoudarcr@gmail.com" }
  }).catch(() => {});

  console.log("Field Agent created/updated successfully:", agentUser.email);

  // 3. Assign workers to Satish agent account
  const workers = await prisma.user.findMany({
    where: { role: UserRole.WORKER }
  });

  if (workers.length > 0) {
    for (const w of workers) {
      await prisma.user.update({
        where: { id: w.id },
        data: {
          assignedAgentId: agentUser.id,
          siteId: site.id
        }
      });
    }
    console.log(`Assigned ${workers.length} workers to ${agentUser.name} (${agentUser.email})`);
  }

  console.log("--------------------------------------------------");
  console.log("Login Credentials Ready:");
  console.log(`Email:    ${agentUser.email}`);
  console.log("Password: Satish@12345");
  console.log("Role:     Field Agent");
  console.log("--------------------------------------------------");
}

main()
  .catch((err) => {
    console.error("Error upserting Satish agent credentials:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
