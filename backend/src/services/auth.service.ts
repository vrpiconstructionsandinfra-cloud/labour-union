import prisma from "../config/prisma";
import { UserRole } from "@prisma/client";
import crypto from "crypto";
import { hashPassword, comparePassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import { sendResetPasswordEmail, sendMobileLoginApprovalEmail } from "./mail.service";

/*
 * Register User (SUPER_AGENT, AGENT, WORKER)
 */
export const registerUser = async (
  name: string,
  email: string | undefined,
  password: string,
  role: "SUPER_AGENT" | "AGENT" | "WORKER",
  phone?: string,
  designation?: string,
  employeeCode?: string,
  salary?: number,
  siteId?: number,
  avatar?: string,
  extraDetails?: {
    bankAccountNo?: string;
    ifscCode?: string;
    address?: string;
    registrationAmount?: number;
    paymentMethod?: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    upiTransactionId?: string;
  }
) => {
  const userEmail = email?.trim() ? email.trim().toLowerCase() : null;

  if (userEmail) {
    const exists = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
    });

    if (exists) {
      throw new Error("Email already exists");
    }
  }

  // Ensure unique employee code to prevent Prisma unique constraint errors
  const prefix = role === "WORKER" ? "WRK" : role === "AGENT" ? "AGT" : "SUP";
  let finalCode = employeeCode?.trim();

  if (!finalCode) {
    throw new Error("Employee Code is required");
  }

  const existingCodeUser = await prisma.user.findFirst({
    where: { employeeCode: finalCode },
  });

  if (existingCodeUser) {
    throw new Error("Employee Code already exists. Please enter a unique Employee Code.");
  }

  const hashedPassword = await hashPassword(password);

  let targetRole: UserRole = role;
  if ((role as string) === 'SUPPORT_AGENT' || String(role).toUpperCase() === 'CUSTOMER_SUPPORT') {
    targetRole = 'CUSTOMER_SUPPORT' as UserRole;
  }

  let user: any;
  try {
    user = await prisma.user.create({
      data: {
        name,
        email: userEmail,
        password: hashedPassword,
        role: targetRole,
        phone,
        designation: designation || (targetRole === "WORKER" ? "Mason / Carpenter" : targetRole === "CUSTOMER_SUPPORT" ? "Customer Support Agent" : "Field Supervisor"),
        employeeCode: finalCode,
        salary: salary || (targetRole === "WORKER" ? 25500 : 45000),
        siteId: siteId || undefined,
        profileImage: avatar || undefined,
        bankAccountNo: extraDetails?.bankAccountNo || undefined,
        ifscCode: extraDetails?.ifscCode || undefined,
        address: extraDetails?.address || undefined,
        registrationAmount: extraDetails?.registrationAmount ? Number(extraDetails.registrationAmount) : undefined,
        paymentMethod: extraDetails?.paymentMethod || undefined,
        razorpayPaymentId: extraDetails?.razorpayPaymentId || undefined,
        razorpayOrderId: extraDetails?.razorpayOrderId || undefined,
        upiTransactionId: extraDetails?.upiTransactionId || undefined,
      },
    });
  } catch (createErr: any) {
    if (createErr?.message?.includes("Unknown argument") || createErr?.message?.includes("bankAccountNo")) {
      console.warn("⚠️ Prisma Client metadata mismatch detected. Executing resilient database fallback...");
      user = await prisma.user.create({
        data: {
          name,
          email: userEmail,
          password: hashedPassword,
          role: targetRole,
          phone,
          designation: designation || (targetRole === "WORKER" ? "Mason / Carpenter" : targetRole === "CUSTOMER_SUPPORT" ? "Customer Support Agent" : "Field Supervisor"),
          employeeCode: finalCode,
          salary: salary || (targetRole === "WORKER" ? 25500 : 45000),
          siteId: siteId || undefined,
          profileImage: avatar || undefined,
        },
      });

      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET "bankAccountNo" = $1, "ifscCode" = $2, "address" = $3, "registrationAmount" = $4, "paymentMethod" = $5, "razorpayPaymentId" = $6, "razorpayOrderId" = $7, "upiTransactionId" = $8 WHERE "id" = $9`,
          extraDetails?.bankAccountNo || null,
          extraDetails?.ifscCode || null,
          extraDetails?.address || null,
          extraDetails?.registrationAmount ? Number(extraDetails.registrationAmount) : null,
          extraDetails?.paymentMethod || null,
          extraDetails?.razorpayPaymentId || null,
          extraDetails?.razorpayOrderId || null,
          extraDetails?.upiTransactionId || null,
          user.id
        );
      } catch (sqlErr: any) {
        console.warn("⚠️ Banking SQL update warning:", sqlErr.message);
      }
    } else {
      throw createErr;
    }
  }

  if (user.role === "WORKER" || user.role === "AGENT") {
    await prisma.wallet.create({
      data: {
        workerId: user.id,
        balance: 0,
      },
    }).catch(() => {});
  }

  return user;
};

/*
 * Login User
 */
export const loginUser = async (
  email: string,
  password: string,
  portal?: 'MAIN' | 'SUPPORT'
) => {
  const cleanEmail = email.trim().toLowerCase();
  let user;

  const loginSelect = {
    id: true,
    name: true,
    email: true,
    password: true,
    phone: true,
    role: true,
    status: true,
    siteId: true,
    site: true,
    assignedAgentId: true,
    assignedAgent: {
      select: {
        id: true,
        name: true,
        email: true,
        employeeCode: true,
        phone: true,
      },
    },
    employeeCode: true,
    designation: true,
    joiningDate: true,
    salary: true,
    profileImage: true,
    active: true,
    resetToken: true,
    resetTokenExpiry: true,
    createdAt: true,
    updatedAt: true,
  };

  let lastErr: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        select: loginSelect,
      });
      lastErr = null;
      break;
    } catch (err: any) {
      lastErr = err;
      if (
        attempt < 3 &&
        (err.message?.includes("Connection terminated") ||
         err.message?.includes("closed") ||
         err.message?.includes("ECONNRESET") ||
         err.message?.includes("connection"))
      ) {
        console.warn(`Transient pool disconnect on login attempt ${attempt}. Retrying in ${attempt * 300}ms...`);
        await new Promise((r) => setTimeout(r, attempt * 300));
      } else {
        break;
      }
    }
  }

  if (lastErr && !user) {
    if (
      lastErr.message?.includes("Connection terminated") ||
      lastErr.message?.includes("closed") ||
      lastErr.message?.includes("ECONNRESET") ||
      lastErr.message?.includes("connection")
    ) {
      throw new Error("Database server is currently busy or resuming. Please try signing in again.");
    }
    throw lastErr;
  }

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const validPassword = await comparePassword(
    password,
    user.password
  );

  if (!validPassword) {
    throw new Error("Invalid credentials");
  }

  const roleStr = String(user.role);
  const designationStr = (user as any).designation ? String((user as any).designation).toLowerCase() : '';
  const emailStr = user.email ? user.email.toLowerCase() : '';
  
  const isSupportUser = roleStr === 'SUPPORT_AGENT' || roleStr === 'CUSTOMER_SUPPORT' || designationStr.includes('support') || emailStr.includes('support');

  if (portal === 'MAIN' && isSupportUser) {
    throw new Error("Access Denied: Customer Support Agents must log in via the Customer Support Portal Login page.");
  }

  if (portal === 'SUPPORT' && !isSupportUser) {
    throw new Error("Access Denied: Super Agents, Field Agents, and Workers must log in via the Main System Login page.");
  }

  const token = generateToken(
    user.id,
    user.role
  );

  const { password: _, resetToken, resetTokenExpiry, ...userWithoutPassword } = user;
  const formattedUser = {
    ...userWithoutPassword,
    siteName: user.site?.siteName || null,
    siteCode: user.site?.siteCode || null,
    siteAddress: user.site?.address || null,
    assignedAgentName: user.assignedAgent?.name || null,
  };

  return {
    token,
    user: formattedUser,
  };
};

/*
 * Forgot Password
 */
export const forgotPassword = async (
  email: string
) => {
  const user = await prisma.user.findUnique({
    where: {
      email: email.trim().toLowerCase(),
    },
  });

  if (!user) {
    throw new Error("No account found registered with this email address. Please check your email.");
  }

  const token = crypto.randomBytes(32).toString("hex");

  const expiry = new Date(
    Date.now() + 15 * 60 * 1000
  );

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      resetToken: token,
      resetTokenExpiry: expiry,
    },
  });

  if (user.email) {
    await sendResetPasswordEmail(
      user.email,
      user.name,
      token
    );
  }

  return {
    message:
      "Password reset email sent successfully.",
  };
};

/*
 * Reset Password
 */
export const resetPassword = async (
  token: string,
  password: string
) => {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error(
      "Invalid or expired reset token"
    );
  }

  const hashedPassword = await hashPassword(
    password
  );

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return {
    message:
      "Password reset successfully.",
  };
};

/*
 * Get Authenticated User Profile
 */
export const getUserProfile = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      siteId: true,
      site: true,
      assignedAgentId: true,
      assignedAgent: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeCode: true,
          phone: true,
        },
      },
      employeeCode: true,
      designation: true,
      joiningDate: true,
      salary: true,
      profileImage: true,
      active: true,
      bankAccountNo: true,
      ifscCode: true,
      address: true,
      password: true,
      resetToken: true,
      resetTokenExpiry: true,
      wallet: true,
      insurance: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("User session not found");
  }

  const { password, resetToken, resetTokenExpiry, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    siteName: user.site?.siteName || null,
    siteCode: user.site?.siteCode || null,
    siteAddress: user.site?.address || null,
    assignedAgentName: user.assignedAgent?.name || null,
    assignedAgentCode: user.assignedAgent?.employeeCode || null,
    assignedAgentEmail: user.assignedAgent?.email || null,
    assignedAgentPhone: user.assignedAgent?.phone || null,
    assignedSite: user.site?.siteName || null,
    dailyWage: user.salary ? Math.round(user.salary / 30) : 850,
  };
};

/*
 * Mobile Email Approval Authentication Sessions
 */
const mobileAuthSessions = new Map<string, {
  authRequestId: string;
  email: string;
  token: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  jwtToken?: string;
  user?: any;
  createdAt: number;
}>();

export const requestMobileApproval = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { site: true, assignedAgent: true }
  });

  if (!user) {
    throw new Error("No registered account found with this email address");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const authRequestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry }
  });

  const sessionObj = {
    authRequestId,
    email: user.email || '',
    token,
    status: 'PENDING' as const,
    createdAt: Date.now()
  };

  mobileAuthSessions.set(authRequestId, sessionObj);
  mobileAuthSessions.set(token, sessionObj);

  if (user.email) {
    await sendMobileLoginApprovalEmail(user.email, user.name, token);
  }

  return {
    authRequestId,
    email: user.email || '',
    message: "Mobile approval authentication email sent successfully."
  };
};

export const checkApprovalStatus = async (authRequestId: string) => {
  const session = mobileAuthSessions.get(authRequestId);
  if (!session) {
    return { status: "PENDING" };
  }
  if (session.status === "APPROVED") {
    return {
      status: "APPROVED",
      token: session.jwtToken,
      user: session.user
    };
  }
  return { status: session.status };
};

export const approveLoginToken = async (token: string) => {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() }
    },
    include: { site: true, assignedAgent: true }
  });

  if (!user) {
    throw new Error("Invalid or expired mobile login approval link");
  }

  const jwtToken = generateToken(user.id, user.role);
  const { password, resetToken, resetTokenExpiry, ...userWithoutPassword } = user;

  const session = mobileAuthSessions.get(token);
  if (session) {
    session.status = "APPROVED";
    session.jwtToken = jwtToken;
    session.user = userWithoutPassword;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: null, resetTokenExpiry: null }
  });

  return {
    message: "Login approved successfully!",
    token: jwtToken,
    user: userWithoutPassword
  };
};