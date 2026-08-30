"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveLoginToken = exports.checkApprovalStatus = exports.requestMobileApproval = exports.getUserProfile = exports.resetPassword = exports.forgotPassword = exports.loginUser = exports.registerUser = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const crypto_1 = __importDefault(require("crypto"));
const hash_1 = require("../utils/hash");
const jwt_1 = require("../utils/jwt");
const mail_service_1 = require("./mail.service");
/*
 * Register User (SUPER_AGENT, AGENT, WORKER)
 */
const registerUser = async (name, email, password, role, phone, designation, employeeCode, salary, siteId, avatar, extraDetails) => {
    const userEmail = email?.trim() ? email.trim().toLowerCase() : null;
    if (userEmail) {
        const exists = await prisma_1.default.user.findUnique({
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
    const existingCodeUser = await prisma_1.default.user.findFirst({
        where: { employeeCode: finalCode },
    });
    if (existingCodeUser) {
        throw new Error("Employee Code already exists. Please enter a unique Employee Code.");
    }
    const hashedPassword = await (0, hash_1.hashPassword)(password);
    let targetRole = role;
    if (role === 'SUPPORT_AGENT' || String(role).toUpperCase() === 'CUSTOMER_SUPPORT') {
        targetRole = 'CUSTOMER_SUPPORT';
    }
    let user;
    try {
        user = await prisma_1.default.user.create({
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
    }
    catch (createErr) {
        if (createErr?.message?.includes("Unknown argument") || createErr?.message?.includes("bankAccountNo")) {
            console.warn("⚠️ Prisma Client metadata mismatch detected. Executing resilient database fallback...");
            user = await prisma_1.default.user.create({
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
                await prisma_1.default.$executeRawUnsafe(`UPDATE "User" SET "bankAccountNo" = $1, "ifscCode" = $2, "address" = $3, "registrationAmount" = $4, "paymentMethod" = $5, "razorpayPaymentId" = $6, "razorpayOrderId" = $7, "upiTransactionId" = $8 WHERE "id" = $9`, extraDetails?.bankAccountNo || null, extraDetails?.ifscCode || null, extraDetails?.address || null, extraDetails?.registrationAmount ? Number(extraDetails.registrationAmount) : null, extraDetails?.paymentMethod || null, extraDetails?.razorpayPaymentId || null, extraDetails?.razorpayOrderId || null, extraDetails?.upiTransactionId || null, user.id);
            }
            catch (sqlErr) {
                console.warn("⚠️ Banking SQL update warning:", sqlErr.message);
            }
        }
        else {
            throw createErr;
        }
    }
    if (user.role === "WORKER" || user.role === "AGENT") {
        await prisma_1.default.wallet.create({
            data: {
                workerId: user.id,
                balance: 0,
            },
        }).catch(() => { });
    }
    return user;
};
exports.registerUser = registerUser;
/*
 * Login User
 */
const loginUser = async (email, password, portal) => {
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
    try {
        user = await prisma_1.default.user.findUnique({
            where: { email: cleanEmail },
            select: loginSelect,
        });
    }
    catch (err) {
        if (err.message?.includes("Connection terminated") ||
            err.message?.includes("closed") ||
            err.message?.includes("ECONNRESET")) {
            console.warn("Retrying user login query after transient pool disconnect...");
            user = await prisma_1.default.user.findUnique({
                where: { email: cleanEmail },
                select: loginSelect,
            });
        }
        else {
            throw err;
        }
    }
    if (!user) {
        throw new Error("Invalid credentials");
    }
    const validPassword = await (0, hash_1.comparePassword)(password, user.password);
    if (!validPassword) {
        throw new Error("Invalid credentials");
    }
    const roleStr = String(user.role);
    const designationStr = user.designation ? String(user.designation).toLowerCase() : '';
    const emailStr = user.email ? user.email.toLowerCase() : '';
    const isSupportUser = roleStr === 'SUPPORT_AGENT' || roleStr === 'CUSTOMER_SUPPORT' || designationStr.includes('support') || emailStr.includes('support');
    if (portal === 'MAIN' && isSupportUser) {
        throw new Error("Access Denied: Customer Support Agents must log in via the Customer Support Portal Login page.");
    }
    if (portal === 'SUPPORT' && !isSupportUser) {
        throw new Error("Access Denied: Super Agents, Field Agents, and Workers must log in via the Main System Login page.");
    }
    const token = (0, jwt_1.generateToken)(user.id, user.role);
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
exports.loginUser = loginUser;
/*
 * Forgot Password
 */
const forgotPassword = async (email) => {
    const user = await prisma_1.default.user.findUnique({
        where: {
            email: email.trim().toLowerCase(),
        },
    });
    if (!user) {
        throw new Error("No account found registered with this email address. Please check your email.");
    }
    const token = crypto_1.default.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    await prisma_1.default.user.update({
        where: {
            id: user.id,
        },
        data: {
            resetToken: token,
            resetTokenExpiry: expiry,
        },
    });
    if (user.email) {
        await (0, mail_service_1.sendResetPasswordEmail)(user.email, user.name, token);
    }
    return {
        message: "Password reset email sent successfully.",
    };
};
exports.forgotPassword = forgotPassword;
/*
 * Reset Password
 */
const resetPassword = async (token, password) => {
    const user = await prisma_1.default.user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpiry: {
                gt: new Date(),
            },
        },
    });
    if (!user) {
        throw new Error("Invalid or expired reset token");
    }
    const hashedPassword = await (0, hash_1.hashPassword)(password);
    await prisma_1.default.user.update({
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
        message: "Password reset successfully.",
    };
};
exports.resetPassword = resetPassword;
/*
 * Get Authenticated User Profile
 */
const getUserProfile = async (userId) => {
    const user = await prisma_1.default.user.findUnique({
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
exports.getUserProfile = getUserProfile;
/*
 * Mobile Email Approval Authentication Sessions
 */
const mobileAuthSessions = new Map();
const requestMobileApproval = async (email) => {
    const user = await prisma_1.default.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        include: { site: true, assignedAgent: true }
    });
    if (!user) {
        throw new Error("No registered account found with this email address");
    }
    const token = crypto_1.default.randomBytes(32).toString("hex");
    const authRequestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    await prisma_1.default.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry }
    });
    const sessionObj = {
        authRequestId,
        email: user.email || '',
        token,
        status: 'PENDING',
        createdAt: Date.now()
    };
    mobileAuthSessions.set(authRequestId, sessionObj);
    mobileAuthSessions.set(token, sessionObj);
    if (user.email) {
        await (0, mail_service_1.sendMobileLoginApprovalEmail)(user.email, user.name, token);
    }
    return {
        authRequestId,
        email: user.email || '',
        message: "Mobile approval authentication email sent successfully."
    };
};
exports.requestMobileApproval = requestMobileApproval;
const checkApprovalStatus = async (authRequestId) => {
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
exports.checkApprovalStatus = checkApprovalStatus;
const approveLoginToken = async (token) => {
    const user = await prisma_1.default.user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpiry: { gt: new Date() }
        },
        include: { site: true, assignedAgent: true }
    });
    if (!user) {
        throw new Error("Invalid or expired mobile login approval link");
    }
    const jwtToken = (0, jwt_1.generateToken)(user.id, user.role);
    const { password, resetToken, resetTokenExpiry, ...userWithoutPassword } = user;
    const session = mobileAuthSessions.get(token);
    if (session) {
        session.status = "APPROVED";
        session.jwtToken = jwtToken;
        session.user = userWithoutPassword;
    }
    await prisma_1.default.user.update({
        where: { id: user.id },
        data: { resetToken: null, resetTokenExpiry: null }
    });
    return {
        message: "Login approved successfully!",
        token: jwtToken,
        user: userWithoutPassword
    };
};
exports.approveLoginToken = approveLoginToken;
