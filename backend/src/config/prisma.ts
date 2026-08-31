import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  ssl: connectionString.includes("render.com") || connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err) => {
  // Gracefully log background idle connection teardowns without crashing
  console.warn("Database pool idle connection reset handled:", err.message);
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["warn", "error"],
});

export default prisma;