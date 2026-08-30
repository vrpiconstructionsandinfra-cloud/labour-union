import dotenv from "dotenv";

// Load .env before anything else
dotenv.config();

console.log(
  "RESEND_API_KEY:",
  process.env.RESEND_API_KEY ? "Loaded" : "Missing"
);

import http from "http";
import "./config/mail";
import app from "./app";
import { initSocket } from "./socket/socket";
import { initAuditScheduler } from "./services/scheduler.service";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Initialize Saturday 6:00 PM Audit Scheduler
initAuditScheduler();

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log("================================");
  console.log(`Server Running on 0.0.0.0:${PORT} with Real-Time WebSockets`);
  console.log("================================");
});