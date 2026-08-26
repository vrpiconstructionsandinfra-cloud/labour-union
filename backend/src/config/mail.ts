import nodemailer from "nodemailer";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
export const resend = new Resend(resendApiKey);

const emailUser = process.env.EMAIL_USER || "";
const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : "";

export const transporter = nodemailer.createTransport({
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
transporter.verify((error) => {
  if (error) {
    console.error("❌ Nodemailer Transport Verification Error:", error);
  } else {
    console.log("✅ Nodemailer SMTP Connected & Ready for:", emailUser);
  }
});
