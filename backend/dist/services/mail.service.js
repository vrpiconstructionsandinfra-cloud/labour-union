"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResetPasswordEmail = sendResetPasswordEmail;
exports.sendMobileLoginApprovalEmail = sendMobileLoginApprovalEmail;
exports.sendWorkerEmailVerificationOtp = sendWorkerEmailVerificationOtp;
exports.sendWorkerWelcomeCredentialsEmail = sendWorkerWelcomeCredentialsEmail;
exports.sendVerificationCodeEmail = sendVerificationCodeEmail;
exports.sendAgentCredentialsEmail = sendAgentCredentialsEmail;
const mail_1 = require("../config/mail");
const network_util_1 = require("../utils/network.util");
/*
 * Safe Resend Delivery Helper with Automatic Domain Fallback
 */
async function sendResendEmail(options) {
    const { to, subject, html, text } = options;
    console.log(`✉️ Attempting Resend API email delivery to: ${to} (Subject: "${subject}")`);
    try {
        // 1. Try Resend with primary domain (noreply@my-dailywork.com)
        const result = await mail_1.resend.emails.send({
            from: mail_1.PRIMARY_FROM,
            to: [to],
            subject,
            html,
            text
        });
        if (result.error) {
            console.warn(`⚠️ Resend Primary Domain (${mail_1.PRIMARY_FROM}) notice: ${result.error.message}. Retrying via Resend Fallback Domain (${mail_1.FALLBACK_FROM})...`);
            // 2. Try Resend with fallback domain (onboarding@resend.dev)
            const fallbackResult = await mail_1.resend.emails.send({
                from: mail_1.FALLBACK_FROM,
                to: [to],
                subject,
                html,
                text
            });
            if (fallbackResult.error) {
                console.error(`❌ Resend Fallback Domain Error:`, fallbackResult.error.message);
                return { id: "delivery-error", error: fallbackResult.error.message };
            }
            console.log(`✅ Resend Email sent successfully via Fallback Domain (${mail_1.FALLBACK_FROM})! ID: ${fallbackResult.data?.id}`);
            return fallbackResult.data;
        }
        console.log(`✅ Resend Email sent successfully via Primary Domain (${mail_1.PRIMARY_FROM})! ID: ${result.data?.id}`);
        return result.data;
    }
    catch (err) {
        console.error(`❌ Resend API Exception: ${err.message}`);
        return { id: "delivery-error", error: err.message };
    }
}
/*
 * 1. Forgot Password Email (Resend API)
 */
async function sendResetPasswordEmail(email, name, token) {
    const frontendUrl = (0, network_util_1.getLocalIpAddress)();
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    console.log(`✉️ Sending Password Reset Email via Resend API to: ${email}`);
    console.log(`🔗 Reset Password Link: ${resetLink}`);
    const subject = "Reset Your Password - Labor Union Management (my-dailywork.com)";
    const text = `Hello ${name},\n\nYou requested a password reset for your Labor Union account.\nClick here to reset your password: ${resetLink}\n\nThis link expires in 15 minutes.\n\nIf you did not request this, please ignore this email.`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #2563EB; margin: 0;">my-dailywork.com</h2>
        <p style="color: #64748B; font-size: 13px; margin-top: 4px;">Labor Union Management — Password Reset Request</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin-bottom: 20px;" />
      <h3 style="color: #0F172A;">Hello ${name},</h3>
      <p style="font-size: 14.5px; color: #334155; line-height: 1.6;">
        We received a request to reset your password for your Labor Union account. Click the button below to set a new password:
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a
          href="${resetLink}"
          style="background-color: #2563EB; color: #FFFFFF; padding: 13px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 14px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);"
        >
          Reset My Password
        </a>
      </div>
      <p style="font-size: 13px; color: #64748B; line-height: 1.5;">
        Or copy and paste this direct link into your browser:<br />
        <a href="${resetLink}" style="color: #2563EB; word-break: break-all;">${resetLink}</a>
      </p>
      <p style="font-size: 12px; color: #94A3B8; margin-top: 24px;">
        This reset link will expire in <strong>15 minutes</strong> for security reasons. If you did not request a password reset, you can safely ignore this message.
      </p>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0 16px 0;" />
      <p style="font-size: 11px; color: #94A3B8; text-align: center;">
        © 2025 my-dailywork.com | Labor Union Management System. All rights reserved.
      </p>
    </div>
  `;
    return sendResendEmail({ to: email, subject, html, text });
}
/*
 * 2. Mobile Login Approval Email (Resend API)
 */
async function sendMobileLoginApprovalEmail(email, name, token) {
    const frontendUrl = (0, network_util_1.getLocalIpAddress)();
    const approveLink = `${frontendUrl}/approve-login?token=${token}`;
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    console.log(`✉️ Sending Mobile Login Approval Email via Resend API to: ${email}`);
    const subject = "📱 Approve Windows Login Request - Labor Union (my-dailywork.com)";
    const text = `Hello ${name},\n\nA login request was initiated for your account on a Windows device.\n\nTap here on your mobile device to APPROVE LOGIN: ${approveLink}\n\nAlternatively, to reset your password click: ${resetLink}\n\nThis approval link expires in 15 minutes.`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #2563EB; margin: 0;">my-dailywork.com</h2>
        <p style="color: #64748B; font-size: 13px; margin-top: 4px;">Mobile Email Authentication & Login Approval</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin-bottom: 20px;" />
      <h3 style="color: #0F172A;">Hello ${name},</h3>
      <p style="font-size: 14.5px; color: #334155; line-height: 1.6;">
        A login request was initiated for your Labor Union account on a Windows device. Tap the green button below on your smartphone to approve and automatically log in your Windows browser:
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a
          href="${approveLink}"
          style="background-color: #059669; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); margin-bottom: 12px;"
        >
          ✓ APPROVE LOGIN ON WINDOWS
        </a>
      </div>
      <p style="font-size: 13px; color: #64748B; text-align: center; margin-top: 10px;">
        Need to change your password instead? <a href="${resetLink}" style="color: #2563EB; font-weight: 600;">Reset Password Here</a>
      </p>
      <p style="font-size: 12px; color: #94A3B8; margin-top: 24px;">
        This security link will expire in <strong>15 minutes</strong>. If you did not request this login, please ignore this email.
      </p>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0 16px 0;" />
      <p style="font-size: 11px; color: #94A3B8; text-align: center;">
        © 2025 my-dailywork.com | Labor Union Management System. All rights reserved.
      </p>
    </div>
  `;
    return sendResendEmail({ to: email, subject, html, text });
}
/*
 * 3. Register New Worker - Email Verification OTP (Resend API)
 */
async function sendWorkerEmailVerificationOtp(email, name, otp) {
    console.log(`✉️ Sending Worker Email Verification OTP via Resend API to: ${email} (OTP: ${otp})`);
    const subject = "🔒 Worker Registration Email Verification Code - my-dailywork.com";
    const text = `Hello ${name || 'Worker'},\n\nYour 6-digit email verification code for Labor Union registration is: ${otp}\n\nThis code expires in 10 minutes. Enter this code in the registration form to verify your email address.`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #2563EB; margin: 0;">my-dailywork.com</h2>
        <p style="color: #64748B; font-size: 13px; margin-top: 4px;">Worker Email Address Verification</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin-bottom: 20px;" />
      <h3 style="color: #0F172A;">Hello ${name || 'Worker'},</h3>
      <p style="font-size: 14.5px; color: #334155; line-height: 1.6;">
        Please use the 6-digit verification code below to complete your registration in the Labor Union Management System:
      </p>
      <div style="margin: 24px 0; text-align: center;">
        <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #2563EB; background-color: #EFF6FF; padding: 12px 24px; border-radius: 10px; border: 2px dashed #BFDBFE; display: inline-block;">
          ${otp}
        </span>
      </div>
      <p style="font-size: 12px; color: #94A3B8; margin-top: 24px; text-align: center;">
        This code will expire in <strong>10 minutes</strong>. If you did not request this, please contact your Field Agent.
      </p>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0 16px 0;" />
      <p style="font-size: 11px; color: #94A3B8; text-align: center;">
        © 2025 my-dailywork.com | Labor Union Management System. All rights reserved.
      </p>
    </div>
  `;
    return sendResendEmail({ to: email, subject, html, text });
}
/*
 * 4. Register New Worker - Welcome Credentials Email (Resend API)
 */
async function sendWorkerWelcomeCredentialsEmail(email, name, employeeCode, password) {
    const frontendUrl = (0, network_util_1.getLocalIpAddress)();
    console.log(`✉️ Sending Worker Welcome Credentials via Resend API to: ${email}`);
    const subject = "🎉 Welcome to Labor Union System - Your Worker Login Credentials (my-dailywork.com)";
    const text = `Hello ${name},\n\nWelcome to Labor Union Management System!\n\nYour account has been registered successfully.\n\nLogin Page: ${frontendUrl}\nWorker ID: ${employeeCode}\nEmail: ${email}\nPassword: ${password}\n\nPlease log in and update your profile settings.`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 580px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 14px; background-color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #2563EB; margin: 0;">my-dailywork.com</h2>
        <p style="color: #059669; font-size: 13px; font-weight: 700; margin-top: 4px;">OFFICIAL WORKER REGISTRATION CONFIRMED ✓</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin-bottom: 20px;" />
      <h3 style="color: #0F172A;">Welcome, ${name}!</h3>
      <p style="font-size: 14.5px; color: #334155; line-height: 1.6;">
        Your official worker account has been registered by your assigned Field Agent. Below are your login credentials to access the Worker Portal:
      </p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748B; font-weight: 700; width: 140px;">Worker ID:</td>
            <td style="padding: 8px 0; color: #2563EB; font-weight: 800;">${employeeCode}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748B; font-weight: 700;">Email Address:</td>
            <td style="padding: 8px 0; color: #0F172A; font-weight: 700;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748B; font-weight: 700;">Login Password:</td>
            <td style="padding: 8px 0; color: #D97706; font-weight: 800;">${password}</td>
          </tr>
        </table>
      </div>

      <div style="margin: 28px 0; text-align: center;">
        <a
          href="${frontendUrl}"
          style="background-color: #2563EB; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 800; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);"
        >
          🚀 Click Here to Log In to Worker Portal
        </a>
      </div>

      <p style="font-size: 13px; color: #64748B; text-align: center; margin-top: 10px;">
        Direct Web Link: <a href="${frontendUrl}" style="color: #2563EB; word-break: break-all;">${frontendUrl}</a>
      </p>

      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0 16px 0;" />
      <p style="font-size: 11px; color: #94A3B8; text-align: center;">
        © 2025 my-dailywork.com | Labor Union Management System. All rights reserved.
      </p>
    </div>
  `;
    return sendResendEmail({ to: email, subject, html, text });
}
/*
 * 5. Add Agent & Add Support Agent - Mail Verification OTP (Resend API)
 */
async function sendVerificationCodeEmail(email, code) {
    console.log(`✉️ Sending Email Verification Code via Resend API to: ${email} (OTP: ${code})`);
    const subject = "🔑 Email Verification Code - Agent / Support Agent Registration (my-dailywork.com)";
    const text = `Your email verification code for Agent / Support Agent Registration is: ${code}. It expires in 10 minutes.`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 500px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 16px;">
        <h2 style="color: #2563EB; margin: 0;">my-dailywork.com</h2>
        <p style="color: #64748B; font-size: 13px; margin-top: 4px;">Agent & Support Agent Registration Verification</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin-bottom: 20px;" />
      <h3 style="color: #0F172A; text-align: center;">Your Verification Code</h3>
      <div style="background-color: #EFF6FF; border: 2px dashed #3B82F6; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1D4ED8;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #64748B; text-align: center;">
        This verification code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
      </p>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0 16px 0;" />
      <p style="font-size: 11px; color: #94A3B8; text-align: center;">
        © 2025 my-dailywork.com | Labor Union Management System. All rights reserved.
      </p>
    </div>
  `;
    return sendResendEmail({ to: email, subject, html, text });
}
/*
 * 6. Add Agent & Add Support Agent - Welcome Credentials Email (Resend API)
 */
async function sendAgentCredentialsEmail(email, name, employeeCode, password) {
    const frontendUrl = (0, network_util_1.getLocalIpAddress)();
    console.log(`✉️ Sending Agent / Support Agent Credentials via Resend API to: ${email}`);
    const isSupportAgent = employeeCode.startsWith('CSA') || employeeCode.startsWith('CSA-');
    const roleTitle = isSupportAgent ? 'Customer Support Agent' : 'Field Agent';
    const subject = `🎉 Welcome to Labor Union System - Your ${roleTitle} Credentials (my-dailywork.com)`;
    const text = `Hello ${name},\n\nYou have been registered as a ${roleTitle}.\nEmployee ID: ${employeeCode}\nEmail: ${email}\nTemporary Password: ${password}\n\nLogin here: ${frontendUrl}`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 550px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #2563EB; margin: 0;">my-dailywork.com</h2>
        <p style="color: #64748B; font-size: 13px; margin-top: 4px;">${roleTitle} Account Created Successfully</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin-bottom: 20px;" />
      <h3 style="color: #0F172A;">Welcome, ${name}! 🎉</h3>
      <p style="font-size: 14.5px; color: #334155; line-height: 1.6;">
        Your ${roleTitle} account has been registered in the Labor Union Management System. Below are your account login credentials:
      </p>
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748B; font-weight: 700; width: 140px;">Employee Code:</td>
            <td style="padding: 8px 0; color: #2563EB; font-weight: 800;">${employeeCode}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748B; font-weight: 700;">Login Email:</td>
            <td style="padding: 8px 0; color: #0F172A; font-weight: 700;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748B; font-weight: 700;">Temp Password:</td>
            <td style="padding: 8px 0; color: #D97706; font-weight: 800;">${password}</td>
          </tr>
        </table>
      </div>
      <div style="margin: 28px 0; text-align: center;">
        <a
          href="${frontendUrl}"
          style="background-color: #2563EB; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 800; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);"
        >
          🚀 Click Here to Log In
        </a>
      </div>
      <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 24px 0 16px 0;" />
      <p style="font-size: 11px; color: #94A3B8; text-align: center;">
        © 2025 my-dailywork.com | Labor Union Management System. All rights reserved.
      </p>
    </div>
  `;
    return sendResendEmail({ to: email, subject, html, text });
}
