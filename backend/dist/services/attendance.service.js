"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayStaffAttendanceStatus = exports.agentCheckOut = exports.agentCheckIn = exports.getTodayAgentAttendance = exports.deleteAttendance = exports.updateAttendance = exports.getAttendanceByWorker = exports.getAttendance = exports.markAttendance = exports.parseTimeStringToDate = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const client_1 = require("@prisma/client");
const socket_1 = require("../socket/socket");
const notification_service_1 = require("./notification.service");
const parseTimeStringToDate = (baseDateStr, timeStr) => {
    if (!timeStr)
        return null;
    // 1. Direct ISO Date parse check (e.g. 2026-08-13T14:00:00.000Z)
    const directDate = new Date(timeStr);
    if (!isNaN(directDate.getTime()) && timeStr.includes('T')) {
        return directDate;
    }
    // 2. Parse 12-hour or 24-hour formatted time e.g., "01:51 PM", "08:00 AM", "13:45"
    try {
        const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
            const ampm = timeMatch[4] ? timeMatch[4].toUpperCase() : null;
            if (ampm === "PM" && hours < 12)
                hours += 12;
            if (ampm === "AM" && hours === 12)
                hours = 0;
            const dateParts = baseDateStr.split('-').map(Number);
            if (dateParts.length === 3) {
                return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hours, minutes, seconds, 0);
            }
        }
    }
    catch (err) {
        console.error("Error parsing time string:", err);
    }
    return null;
};
exports.parseTimeStringToDate = parseTimeStringToDate;
const markAttendance = async (workerId, markedById, dateStr, status, overtimeHours, remarks, extraData) => {
    const loggedInUser = await prisma_1.default.user.findUnique({
        where: { id: markedById },
    });
    if (!loggedInUser) {
        throw new Error("User not found");
    }
    const worker = await prisma_1.default.user.findUnique({
        where: { id: workerId },
    });
    if (!worker) {
        throw new Error("Worker not found");
    }
    // Enforce strict assigned agent restriction for AGENT role users
    if (loggedInUser.role === client_1.UserRole.AGENT && worker.assignedAgentId !== markedById) {
        throw new Error(`Access Denied: Worker ${worker.name} is unassigned or assigned to another agent. Only the currently assigned agent can scan or mark attendance for this worker.`);
    }
    // Use UTC normalization for dateObj to prevent local server timezone offset drift
    const dateParts = dateStr.split('-').map(Number);
    const dateObj = dateParts.length === 3
        ? new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0))
        : new Date(dateStr);
    const calculatedStatusCode = extraData?.statusCode !== undefined
        ? extraData.statusCode
        : (status === "HALF_DAY" ? 1 : status === "ABSENT" ? 0 : 2);
    const parsedCheckInTime = (0, exports.parseTimeStringToDate)(dateStr, extraData?.checkInTime);
    const parsedCheckOutTime = (0, exports.parseTimeStringToDate)(dateStr, extraData?.checkOutTime);
    const attendance = await prisma_1.default.attendance.upsert({
        where: {
            workerId_date: {
                workerId,
                date: dateObj,
            },
        },
        update: {
            status,
            statusCode: calculatedStatusCode,
            checkInTime: parsedCheckInTime !== null ? parsedCheckInTime : (extraData?.checkInTime ? undefined : new Date()),
            checkOutTime: parsedCheckOutTime !== null ? parsedCheckOutTime : undefined,
            checkInPhoto: extraData?.checkInPhoto !== undefined ? extraData.checkInPhoto : undefined,
            checkOutPhoto: extraData?.checkOutPhoto !== undefined ? extraData.checkOutPhoto : undefined,
            siteId: extraData?.siteId !== undefined ? extraData.siteId : undefined,
            dailyPay: extraData?.dailyPay !== undefined ? extraData.dailyPay : undefined,
            overtimeHours,
            remarks,
            markedById,
        },
        create: {
            workerId,
            markedById,
            date: dateObj,
            status,
            statusCode: calculatedStatusCode,
            checkInTime: parsedCheckInTime !== null ? parsedCheckInTime : new Date(),
            checkOutTime: parsedCheckOutTime !== null ? parsedCheckOutTime : null,
            checkInPhoto: extraData?.checkInPhoto || null,
            checkOutPhoto: extraData?.checkOutPhoto || null,
            siteId: extraData?.siteId || null,
            dailyPay: extraData?.dailyPay || null,
            overtimeHours,
            remarks,
        },
        include: {
            worker: { select: { id: true, name: true, employeeCode: true } },
            site: { select: { id: true, siteName: true, siteCode: true } },
        },
    });
    // Real-time broadcast
    (0, socket_1.emitAttendanceUpdate)(attendance);
    const isCheckOut = Boolean(parsedCheckOutTime || extraData?.checkOutTime);
    const actionType = isCheckOut ? "Check-Out" : "Check-In";
    (0, notification_service_1.createNotification)({
        userId: workerId,
        title: `Today's Attendance ${actionType} Recorded`,
        message: `Your attendance for ${dateStr} was recorded as ${status} (${actionType}).`,
        type: "ATTENDANCE"
    }).catch(() => { });
    return attendance;
};
exports.markAttendance = markAttendance;
const getAttendance = async () => {
    return prisma_1.default.attendance.findMany({
        orderBy: { date: "desc" },
        include: {
            worker: { select: { id: true, name: true, employeeCode: true, designation: true } },
            markedBy: { select: { id: true, name: true, employeeCode: true } },
            site: { select: { id: true, siteName: true, siteCode: true } },
        },
    });
};
exports.getAttendance = getAttendance;
const getAttendanceByWorker = async (workerId) => {
    return prisma_1.default.attendance.findMany({
        where: { workerId },
        orderBy: { date: "desc" },
        include: {
            site: { select: { id: true, siteName: true, siteCode: true } },
            markedBy: { select: { id: true, name: true, employeeCode: true } },
        },
    });
};
exports.getAttendanceByWorker = getAttendanceByWorker;
const updateAttendance = async (id, data) => {
    const existing = await prisma_1.default.attendance.findUnique({
        where: { id },
    });
    if (!existing) {
        throw new Error("Attendance record not found");
    }
    const baseDateStr = existing.date.toISOString().split("T")[0];
    const parsedCheckInTime = data.checkInTime ? (0, exports.parseTimeStringToDate)(baseDateStr, data.checkInTime) : undefined;
    const parsedCheckOutTime = data.checkOutTime ? (0, exports.parseTimeStringToDate)(baseDateStr, data.checkOutTime) : undefined;
    const attendance = await prisma_1.default.attendance.update({
        where: { id },
        data: {
            ...(data.status ? { status: data.status } : {}),
            ...(data.statusCode !== undefined ? { statusCode: data.statusCode } : {}),
            ...(parsedCheckInTime ? { checkInTime: parsedCheckInTime } : {}),
            ...(parsedCheckOutTime ? { checkOutTime: parsedCheckOutTime } : {}),
            ...(data.checkInPhoto !== undefined ? { checkInPhoto: data.checkInPhoto } : {}),
            ...(data.checkOutPhoto !== undefined ? { checkOutPhoto: data.checkOutPhoto } : {}),
            ...(data.siteId !== undefined ? { siteId: data.siteId } : {}),
            ...(data.dailyPay !== undefined ? { dailyPay: data.dailyPay } : {}),
            ...(data.overtimeHours !== undefined ? { overtimeHours: data.overtimeHours } : {}),
            ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
        },
        include: {
            worker: { select: { id: true, name: true, employeeCode: true } },
            site: { select: { id: true, siteName: true, siteCode: true } },
        },
    });
    (0, socket_1.emitAttendanceUpdate)(attendance);
    return attendance;
};
exports.updateAttendance = updateAttendance;
const deleteAttendance = async (id) => {
    return prisma_1.default.attendance.delete({
        where: { id },
    });
};
exports.deleteAttendance = deleteAttendance;
const getTodayAgentAttendance = async (userId) => {
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));
    return prisma_1.default.attendance.findFirst({
        where: {
            workerId: userId,
            date: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
        include: {
            worker: { select: { id: true, name: true, employeeCode: true } },
        },
    });
};
exports.getTodayAgentAttendance = getTodayAgentAttendance;
const agentCheckIn = async (userId) => {
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
    let existing = await (0, exports.getTodayAgentAttendance)(userId);
    if (existing) {
        existing = await prisma_1.default.attendance.update({
            where: { id: existing.id },
            data: {
                checkInTime: new Date(),
                status: "PRESENT",
            },
            include: {
                worker: { select: { id: true, name: true, employeeCode: true } },
            },
        });
    }
    else {
        existing = await prisma_1.default.attendance.create({
            data: {
                workerId: userId,
                markedById: userId,
                date: startOfDay,
                status: "PRESENT",
                checkInTime: new Date(),
            },
            include: {
                worker: { select: { id: true, name: true, employeeCode: true } },
            },
        });
    }
    (0, socket_1.emitAttendanceUpdate)(existing);
    return existing;
};
exports.agentCheckIn = agentCheckIn;
const agentCheckOut = async (userId) => {
    const existing = await (0, exports.getTodayAgentAttendance)(userId);
    if (!existing) {
        throw new Error("No check-in record found for today");
    }
    const updated = await prisma_1.default.attendance.update({
        where: { id: existing.id },
        data: {
            checkOutTime: new Date(),
        },
        include: {
            worker: { select: { id: true, name: true, employeeCode: true } },
        },
    });
    (0, socket_1.emitAttendanceUpdate)(updated);
    return updated;
};
exports.agentCheckOut = agentCheckOut;
/**
 * getTodayStaffAttendanceStatus
 * Returns a computed real-time attendance status list for ALL active Field Agents
 * and Customer Support Agents. Status priority:
 *   1. PRESENT      — checked in today, not yet checked out
 *   2. COMPLETED    — checked in AND checked out today
 *   3. ON_LEAVE     — has APPROVED leave covering today (regardless of attendance record)
 *   4. ABSENT       — no check-in, no approved leave, server time > 10:00 AM
 *   5. NOT_CHECKED_IN — no check-in, no approved leave, server time <= 10:00 AM
 */
const getTodayStaffAttendanceStatus = async () => {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    // Server-local hour for absent threshold (10:00 AM)
    const localHour = now.getHours();
    const isAfterAbsentCutoff = localHour >= 10;
    // 1. Fetch all active agents + support agents
    const staffUsers = await prisma_1.default.user.findMany({
        where: {
            role: { in: ["AGENT", "CUSTOMER_SUPPORT"] },
            status: "ACTIVE",
        },
        select: {
            id: true,
            name: true,
            employeeCode: true,
            role: true,
            designation: true,
            profileImage: true,
            site: { select: { id: true, siteName: true } },
        },
    });
    const staffIds = staffUsers.map((u) => u.id);
    // 2. Fetch today's attendance records for these staff
    const todayAttendance = await prisma_1.default.attendance.findMany({
        where: {
            workerId: { in: staffIds },
            date: { gte: todayStart, lte: todayEnd },
        },
    });
    // 3. Fetch all APPROVED leaves covering today for these staff
    const approvedLeaves = await prisma_1.default.leave.findMany({
        where: {
            workerId: { in: staffIds },
            status: "APPROVED",
            fromDate: { lte: todayEnd },
            toDate: { gte: todayStart },
        },
    });
    // Build lookup maps
    const attendanceByUserId = new Map();
    todayAttendance.forEach((a) => attendanceByUserId.set(a.workerId, a));
    const leaveByUserId = new Map();
    approvedLeaves.forEach((l) => leaveByUserId.set(l.workerId, l));
    // 4. Compute per-user status
    const result = staffUsers.map((user) => {
        const att = attendanceByUserId.get(user.id);
        const leave = leaveByUserId.get(user.id);
        const isAgent = user.role === "AGENT";
        let computedStatus;
        let checkInTime = null;
        let checkOutTime = null;
        if (att && att.checkInTime) {
            checkInTime = att.checkInTime.toISOString();
            if (att.checkOutTime) {
                checkOutTime = att.checkOutTime.toISOString();
                computedStatus = "COMPLETED";
            }
            else {
                computedStatus = "PRESENT";
            }
        }
        else if (leave) {
            computedStatus = "ON_LEAVE";
        }
        else if (isAfterAbsentCutoff) {
            computedStatus = "ABSENT";
        }
        else {
            computedStatus = "NOT_CHECKED_IN";
        }
        return {
            userId: user.id,
            name: user.name,
            employeeCode: user.employeeCode || (isAgent ? `AGT-${user.id}` : `CSA-${user.id}`),
            role: user.role,
            category: isAgent ? "FIELD_AGENT" : "SUPPORT_AGENT",
            designation: user.designation || (isAgent ? "Field Agent" : "Support Agent"),
            siteName: user.site?.siteName || null,
            profileImage: user.profileImage || null,
            status: computedStatus,
            checkInTime,
            checkOutTime,
            leaveReason: leave?.reason || null,
            leaveType: leave?.leaveType || null,
        };
    });
    return result;
};
exports.getTodayStaffAttendanceStatus = getTodayStaffAttendanceStatus;
