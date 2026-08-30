"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = exports.resend = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const resend_1 = require("resend");
const resendApiKey = process.env.RESEND_API_KEY || "";
exports.resend = new resend_1.Resend(resendApiKey);
const emailUser = process.env.EMAIL_USER || "";
const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : "";
exports.transporter = nodemailer_1.default.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use SSL for port 465
    auth: {
        user: emailUser,
        pass: emailPass,
    },
    tls: {
        rejectUnauthorized: false, // Prevent TLS certificate rejection
    },
});
/*
 * Verify Connections
 */
console.log("✅ Resend API Client Initialized with API Key: " + resendApiKey.slice(0, 7) + "...");
exports.transporter.verify((error) => {
    if (error) {
        console.error("❌ Nodemailer Transport Verification Error:", error);
    }
    else {
        console.log("✅ Nodemailer SMTP Connected & Ready for:", emailUser);
    }
});
