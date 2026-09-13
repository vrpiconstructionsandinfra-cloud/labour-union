"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentCheckOut = exports.agentCheckIn = exports.getTodayAttendanceOverview = exports.getTodayAgentAttendance = exports.deleteAttendance = exports.updateAttendance = exports.getAttendanceByWorker = exports.getAttendance = exports.markAttendance = exports.parseTimeStringToDate = void 0;
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
const getTodayAttendanceOverview = async (roleFilter) => {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    // 1. Fetch all active Field Agents & Customer Support staff
    const targetRoles = roleFilter
        ? [roleFilter]
        : [client_1.UserRole.AGENT, client_1.UserRole.CUSTOMER_SUPPORT];
    const users = await prisma_1.default.user.findMany({
        where: {
            role: { in: targetRoles },
        },
        select: {
            id: true,
            name: true,
            employeeCode: true,
            designation: true,
            role: true,
            profileImage: true,
            phone: true,
            email: true,
            active: true,
            status: true,
            siteId: true,
            site: {
                select: {
                    id: true,
                    siteName: true,
                    siteCode: true,
                },
            },
            handledTickets: {
                where: {
                    status: { in: ["OPEN", "IN_PROGRESS"] },
                },
                select: {
                    id: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    // 2. Fetch today's Attendance records
    const todayAttendances = await prisma_1.default.attendance.findMany({
        where: {
            date: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
        include: {
            site: { select: { id: true, siteName: true, siteCode: true } },
        },
    });
    // 3. Fetch today's Leaves
    const todayLeaves = await prisma_1.default.leave.findMany({
        where: {
            fromDate: { lte: endOfDay },
            toDate: { gte: startOfDay },
        },
        include: {
            worker: { select: { id: true, name: true, employeeCode: true, role: true } },
        },
    });
    const attendanceMap = new Map();
    todayAttendances.forEach((att) => {
        attendanceMap.set(att.workerId, att);
    });
    const leaveMap = new Map();
    todayLeaves.forEach((lv) => {
        const existing = leaveMap.get(lv.workerId);
        if (!existing || (existing.status !== "APPROVED" && lv.status === "APPROVED")) {
            leaveMap.set(lv.workerId, lv);
        }
    });
    const localHour = now.getHours();
    const isPastNoon = localHour >= 12;
    const staffRoster = users.map((user) => {
        const isSupport = user.role === client_1.UserRole.CUSTOMER_SUPPORT ||
            (user.employeeCode && user.employeeCode.toUpperCase().startsWith("CSA")) ||
            (user.designation && user.designation.toLowerCase().includes("support"));
        const category = isSupport ? "SUPPORT_AGENT" : "FIELD_AGENT";
        const empCode = user.employeeCode || (isSupport ? `CSA-00${user.id}` : `AGT-00${user.id}`);
        const siteName = user.site?.siteName || (isSupport ? "HQ Support Center" : "Metro Construction Block A");
        const activeTicketsCount = user.handledTickets ? user.handledTickets.length : 0;
        const department = isSupport
            ? activeTicketsCount > 0
                ? `HQ Support (${activeTicketsCount} Active)`
                : "HQ Support Center"
            : siteName;
        const att = attendanceMap.get(user.id);
        const leave = leaveMap.get(user.id);
        let computedStatus = "NOT_CHECKED_IN";
        let checkInTime = null;
        let checkOutTime = null;
        let durationStr = "—";
        let leaveType = null;
        let leaveReason = null;
        if (att) {
            if (att.checkInTime) {
                const cIn = new Date(att.checkInTime);
                checkInTime = cIn.toISOString();
                if (att.checkOutTime) {
                    computedStatus = "COMPLETED";
                    const cOut = new Date(att.checkOutTime);
                    checkOutTime = cOut.toISOString();
                    const diffMs = Math.max(0, cOut.getTime() - cIn.getTime());
                    const h = Math.floor(diffMs / 3600000);
                    const m = Math.floor((diffMs % 3600000) / 60000);
                    durationStr = `${h}h ${m}m`;
                }
                else {
                    computedStatus = "PRESENT";
                    const diffMs = Math.max(0, now.getTime() - cIn.getTime());
                    const h = Math.floor(diffMs / 3600000);
                    const m = Math.floor((diffMs % 3600000) / 60000);
                    durationStr = `${h}h ${m}m`;
                }
            }
            else if (att.status === "ABSENT") {
                computedStatus = "ABSENT";
            }
        }
        else if (leave && leave.status === "APPROVED") {
            computedStatus = "ON_LEAVE";
            leaveType = leave.leaveType || "Approved Leave";
            leaveReason = leave.reason;
            durationStr = leave.reason || "Casual Leave";
        }
        else if (leave && leave.status === "REJECTED") {
            computedStatus = "ABSENT";
            leaveReason = "Leave Rejected";
        }
        else {
            if (isPastNoon) {
                computedStatus = "ABSENT";
            }
            else {
                computedStatus = "NOT_CHECKED_IN";
            }
        }
        return {
            id: user.id,
            userId: user.id,
            name: user.name,
            employeeCode: empCode,
            avatar: user.profileImage,
            category,
            role: user.role,
            designation: user.designation,
            phone: user.phone,
            email: user.email,
            assignedSite: siteName,
            department,
            activeTicketsCount,
            status: computedStatus,
            checkInTime,
            checkOutTime,
            duration: durationStr,
            leaveType,
            leaveReason,
            isOnline: computedStatus === "PRESENT",
        };
    });
    const summary = {
        totalStaff: staffRoster.length,
        fieldAgentsCount: staffRoster.filter((s) => s.category === "FIELD_AGENT").length,
        supportAgentsCount: staffRoster.filter((s) => s.category === "SUPPORT_AGENT").length,
        presentCount: staffRoster.filter((s) => s.status === "PRESENT").length,
        onLeaveCount: staffRoster.filter((s) => s.status === "ON_LEAVE").length,
        completedCount: staffRoster.filter((s) => s.status === "COMPLETED").length,
        notCheckedInCount: staffRoster.filter((s) => s.status === "NOT_CHECKED_IN").length,
        absentCount: staffRoster.filter((s) => s.status === "ABSENT").length,
    };
    return {
        summary,
        staff: staffRoster,
    };
};
exports.getTodayAttendanceOverview = getTodayAttendanceOverview;
const agentCheckIn = async (userId) => {
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
    let existing = await (0, exports.getTodayAgentAttendance)(userId);
    if (existing) {
        existing = await prisma_1.default.attendance.update({
            where: { id: existing.id },
            data: {
                checkInTime: new Date(),
                checkOutTime: null,
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
