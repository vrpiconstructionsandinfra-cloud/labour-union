import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
export const resend = new Resend(resendApiKey);

export const PRIMARY_FROM = process.env.RESEND_FROM_EMAIL || "Labor Union <noreply@my-dailywork.com>";
export const FALLBACK_FROM = process.env.RESEND_FALLBACK_FROM || "Labor Union <onboarding@resend.dev>";

/*
 * Verification & Logging
 */
if (resendApiKey) {
  console.log("✅ Resend API Client Initialized with API Key: " + resendApiKey.slice(0, 7) + "...");
} else {
  console.warn("⚠️ Warning: RESEND_API_KEY is not defined in environment variables.");
}
