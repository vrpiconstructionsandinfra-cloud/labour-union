"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FALLBACK_FROM = exports.PRIMARY_FROM = exports.resend = void 0;
const resend_1 = require("resend");
const resendApiKey = process.env.RESEND_API_KEY || "";
exports.resend = new resend_1.Resend(resendApiKey);
exports.PRIMARY_FROM = process.env.RESEND_FROM_EMAIL || "Labor Union <noreply@my-dailywork.com>";
exports.FALLBACK_FROM = process.env.RESEND_FALLBACK_FROM || "Labor Union <onboarding@resend.dev>";
/*
 * Verification & Logging
 */
if (resendApiKey) {
    console.log("✅ Resend API Client Initialized with API Key: " + resendApiKey.slice(0, 7) + "...");
}
else {
    console.warn("⚠️ Warning: RESEND_API_KEY is not defined in environment variables.");
}
