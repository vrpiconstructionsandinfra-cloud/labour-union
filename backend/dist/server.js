"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env before anything else
dotenv_1.default.config();
console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "Loaded" : "Missing");
const http_1 = __importDefault(require("http"));
require("./config/mail");
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./socket/socket");
const scheduler_service_1 = require("./services/scheduler.service");
const PORT = process.env.PORT || 5000;
const server = http_1.default.createServer(app_1.default);
// Initialize Socket.io
(0, socket_1.initSocket)(server);
// Initialize Saturday 6:00 PM Audit Scheduler
(0, scheduler_service_1.initAuditScheduler)();
server.listen(Number(PORT), "0.0.0.0", () => {
    console.log("================================");
    console.log(`Server Running on 0.0.0.0:${PORT} with Real-Time WebSockets`);
    console.log("================================");
});
