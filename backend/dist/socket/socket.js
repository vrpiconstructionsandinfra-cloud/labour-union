"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitWorkerRegistration = exports.emitIncentiveUpdate = exports.emitSitePaymentUpdate = exports.emitSupportMessage = exports.emitInsuranceUpdate = exports.emitPayrollUpdate = exports.emitWalletUpdate = exports.emitTicketComment = exports.emitTicketUpdate = exports.emitLeaveUpdate = exports.emitAttendanceUpdate = exports.getSocketIO = exports.initSocket = exports.getOnlineUserIds = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const socketUserMap = new Map();
const userSocketsMap = new Map();
const getOnlineUserIds = () => {
    return Array.from(userSocketsMap.keys());
};
exports.getOnlineUserIds = getOnlineUserIds;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: true,
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id}`);
        // Send current online user IDs immediately to connected socket
        socket.emit("users:online", Array.from(userSocketsMap.keys()));
        // Join room based on user role or ID
        socket.on("join", (data) => {
            if (data?.role) {
                socket.join(`role:${data.role}`);
                console.log(`Socket ${socket.id} joined role:${data.role}`);
            }
            if (data?.userId) {
                const uid = Number(data.userId);
                if (!isNaN(uid)) {
                    socket.join(`user:${uid}`);
                    socketUserMap.set(socket.id, uid);
                    if (!userSocketsMap.has(uid)) {
                        userSocketsMap.set(uid, new Set());
                    }
                    userSocketsMap.get(uid).add(socket.id);
                    console.log(`Socket ${socket.id} joined user:${uid}`);
                    io?.emit("users:online", Array.from(userSocketsMap.keys()));
                    io?.emit("user:status:changed", { userId: uid, isOnline: true });
                }
            }
        });
        socket.on("get:online_users", () => {
            socket.emit("users:online", Array.from(userSocketsMap.keys()));
        });
        socket.on("disconnect", () => {
            const uid = socketUserMap.get(socket.id);
            if (uid !== undefined) {
                socketUserMap.delete(socket.id);
                const userSockets = userSocketsMap.get(uid);
                if (userSockets) {
                    userSockets.delete(socket.id);
                    if (userSockets.size === 0) {
                        userSocketsMap.delete(uid);
                        io?.emit("users:online", Array.from(userSocketsMap.keys()));
                        io?.emit("user:status:changed", { userId: uid, isOnline: false });
                    }
                }
            }
            console.log(`[Socket.io] Client disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getSocketIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
exports.getSocketIO = getSocketIO;
// Helper emitters
const emitAttendanceUpdate = (data) => {
    if (io) {
        io.emit("attendance:updated", data);
        // Also broadcast staff-level event so the Super Agent dashboard panel refreshes
        io.emit("attendance:staff:updated", { userId: data.workerId, timestamp: Date.now() });
    }
};
exports.emitAttendanceUpdate = emitAttendanceUpdate;
const emitLeaveUpdate = (data) => {
    if (io) {
        io.emit("leave:updated", data);
        // Also broadcast staff-level event so attendance panel reflects leave status change
        io.emit("leave:staff:updated", { userId: data.workerId, status: data.status, timestamp: Date.now() });
        if (data.workerId) {
            io.to(`user:${data.workerId}`).emit("notification", {
                title: "Leave Status Updated",
                message: `Your leave request status is now ${data.status}`,
                timestamp: new Date().toISOString(),
            });
        }
    }
};
exports.emitLeaveUpdate = emitLeaveUpdate;
const emitTicketUpdate = (data) => {
    if (io) {
        io.emit("ticket:updated", data);
        io.emit("ticket:created", data);
        if (data.workerId) {
            io.to(`user:${data.workerId}`).emit("ticket:reply", data);
        }
    }
};
exports.emitTicketUpdate = emitTicketUpdate;
const emitTicketComment = (data) => {
    if (io) {
        io.emit("ticket:comment", data);
        if (data.ticketId) {
            io.emit(`ticket:${data.ticketId}:comment`, data);
        }
    }
};
exports.emitTicketComment = emitTicketComment;
const emitWalletUpdate = (data) => {
    if (io) {
        if (data.workerId) {
            io.to(`user:${data.workerId}`).emit("wallet:updated", data);
            io.to(`user:${data.workerId}`).emit("notification", {
                title: "Wallet Transaction",
                message: `${data.type}: ₹${data.amount} - ${data.description || ""}`,
                timestamp: new Date().toISOString(),
            });
        }
    }
};
exports.emitWalletUpdate = emitWalletUpdate;
const emitPayrollUpdate = (data) => {
    if (io) {
        io.emit("payroll:updated", data);
    }
};
exports.emitPayrollUpdate = emitPayrollUpdate;
const emitInsuranceUpdate = (data) => {
    if (io) {
        io.emit("insurance:updated", data);
    }
};
exports.emitInsuranceUpdate = emitInsuranceUpdate;
const emitSupportMessage = (data) => {
    if (io) {
        io.emit("support_message", data);
    }
};
exports.emitSupportMessage = emitSupportMessage;
const emitSitePaymentUpdate = (data) => {
    if (io) {
        io.emit("sitePayment:created", data);
        io.emit("sitePayment:updated", data);
    }
};
exports.emitSitePaymentUpdate = emitSitePaymentUpdate;
const emitIncentiveUpdate = (data) => {
    if (io) {
        io.emit("incentive:credited", data);
        io.emit("incentive:updated", data);
        if (data.agentId) {
            io.to(`user:${data.agentId}`).emit("notification", {
                title: "Worker Registration Incentive Credited",
                message: `₹${data.amount || 25} Worker Registration Incentive credited for registering ${data.workerName || "new worker"} (${data.employeeCode || ""})`,
                timestamp: new Date().toISOString(),
            });
        }
    }
};
exports.emitIncentiveUpdate = emitIncentiveUpdate;
const emitWorkerRegistration = (data) => {
    if (io) {
        io.emit("worker:registered", data);
        io.emit("workers:updated", data);
    }
};
exports.emitWorkerRegistration = emitWorkerRegistration;
