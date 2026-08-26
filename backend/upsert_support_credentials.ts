import "dotenv/config";
import prisma from "./src/config/prisma";
import bcrypt from "bcryptjs";
import { UserRole, TicketStatus } from "@prisma/client";

async function upsertSupportUser() {
  console.log("Upserting Customer Support Agent credentials...");

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // 1. Create or update Support Agent user: support@union.com
  const supportUser = await prisma.user.upsert({
    where: { email: "support@union.com" },
    update: {
      password: hashedPassword,
      role: UserRole.AGENT,
      name: "Support Agent",
      designation: "Customer Support Specialist",
      status: "ACTIVE",
    },
    create: {
      name: "Support Agent",
      email: "support@union.com",
      password: hashedPassword,
      phone: "+91 9876500000",
      role: UserRole.AGENT,
      employeeCode: "SUP-001",
      designation: "Customer Support Specialist",
      status: "ACTIVE",
    },
  });

  console.log("Support Agent Created/Updated:", supportUser.email);

  // 2. Ensure test workers exist
  let worker1 = await prisma.user.findFirst({ where: { role: "WORKER" } });
  if (!worker1) {
    worker1 = await prisma.user.create({
      data: {
        name: "Ramesh Kumar",
        email: "ramesh.kumar@worker.com",
        password: hashedPassword,
        phone: "+91 9876543211",
        role: UserRole.WORKER,
        employeeCode: "WRK-2501",
        status: "ACTIVE",
      },
    });
  }

  let worker2 = await prisma.user.findFirst({ where: { role: "WORKER", NOT: { id: worker1.id } } });
  if (!worker2) {
    worker2 = await prisma.user.create({
      data: {
        name: "Suresh Patel",
        email: "suresh.patel@worker.com",
        password: hashedPassword,
        phone: "+91 9876543212",
        role: UserRole.WORKER,
        employeeCode: "WRK-2500",
        status: "ACTIVE",
      },
    });
  }

  let worker3 = await prisma.user.findFirst({ where: { role: "WORKER", NOT: { id: { in: [worker1.id, worker2.id] } } } });
  if (!worker3) {
    worker3 = await prisma.user.create({
      data: {
        name: "Amit Singh",
        email: "amit.singh@worker.com",
        password: hashedPassword,
        phone: "+91 9876543213",
        role: UserRole.WORKER,
        employeeCode: "WRK-2499",
        status: "ACTIVE",
      },
    });
  }

  let worker4 = await prisma.user.findFirst({ where: { role: "WORKER", NOT: { id: { in: [worker1.id, worker2.id, worker3.id] } } } });
  if (!worker4) {
    worker4 = await prisma.user.create({
      data: {
        name: "Priya Sharma",
        email: "priya.sharma@worker.com",
        password: hashedPassword,
        phone: "+91 9876543214",
        role: UserRole.WORKER,
        employeeCode: "WRK-2498",
        status: "ACTIVE",
      },
    });
  }

  let worker5 = await prisma.user.findFirst({ where: { role: "WORKER", NOT: { id: { in: [worker1.id, worker2.id, worker3.id, worker4.id] } } } });
  if (!worker5) {
    worker5 = await prisma.user.create({
      data: {
        name: "Vikram Shah",
        email: "vikram.shah@worker.com",
        password: hashedPassword,
        phone: "+91 9876543215",
        role: UserRole.WORKER,
        employeeCode: "WRK-2497",
        status: "ACTIVE",
      },
    });
  }

  // 3. Upsert representative tickets matching mockup screenshot
  const ticketsToCreate = [
    {
      subject: "Payment not credited",
      description: "My weekly salary for May week 2 was not credited to my registered bank account.",
      workerId: worker1.id,
      priority: "HIGH",
      status: TicketStatus.OPEN,
      handledById: supportUser.id,
    },
    {
      subject: "How to apply for leave?",
      description: "Need guidance on submitting sick leave application for next Monday.",
      workerId: worker2.id,
      priority: "MEDIUM",
      status: TicketStatus.IN_PROGRESS,
      handledById: supportUser.id,
    },
    {
      subject: "ESI card not generated",
      description: "Medical insurance ESI card is pending approval from regional office.",
      workerId: worker3.id,
      priority: "HIGH",
      status: TicketStatus.IN_PROGRESS,
      handledById: supportUser.id,
    },
    {
      subject: "Mobile number update",
      description: "Please update my primary mobile contact number in official union profile.",
      workerId: worker4.id,
      priority: "LOW",
      status: TicketStatus.CLOSED,
      handledById: supportUser.id,
    },
    {
      subject: "Salary slip incorrect",
      description: "Overtime hours missing from current month payslip statement.",
      workerId: worker5.id,
      priority: "MEDIUM",
      status: TicketStatus.OPEN,
      handledById: supportUser.id,
    },
  ];

  for (const t of ticketsToCreate) {
    const existing = await prisma.supportTicket.findFirst({
      where: { subject: t.subject, workerId: t.workerId },
    });
    if (!existing) {
      await prisma.supportTicket.create({
        data: t,
      });
    }
  }

  console.log("Successfully created/updated support tickets in backend PostgreSQL database!");
}

upsertSupportUser()
  .catch((err) => {
    console.error("Error upserting support user:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
