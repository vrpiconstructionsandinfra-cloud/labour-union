import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

let formattedConnectionString = connectionString;
if (formattedConnectionString.includes("render.com") && !formattedConnectionString.includes("sslmode=")) {
  formattedConnectionString += (formattedConnectionString.includes("?") ? "&" : "?") + "sslmode=require";
}

const pool = new Pool({
  connectionString: formattedConnectionString,
  max: 20,
  idleTimeoutMillis: 300000, // 5 minutes: keeps connection pool warm and avoids frequent TLS handshakes
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  ssl: formattedConnectionString.includes("render.com") || formattedConnectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on("error", (err) => {
  // Gracefully log background idle connection teardowns without crashing
  console.warn("Database pool background connection event:", err.message);
});

// Periodic lightweight keep-alive ping (every 3 minutes) to keep connections warm and prevent Render DB sleep
const keepAliveTimer = setInterval(async () => {
  try {
    await pool.query("SELECT 1");
  } catch {
    // Non-fatal, ignore transient ping issues
  }
}, 3 * 60 * 1000);

if (keepAliveTimer.unref) {
  keepAliveTimer.unref();
}

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["warn", "error"],
});

export default prisma;