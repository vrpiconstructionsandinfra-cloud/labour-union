"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitInsuranceUpdate = exports.emitPayrollUpdate = exports.emitWalletUpdate = exports.emitTicketComment = exports.emitTicketUpdate = exports.emitLeaveUpdate = exports.emitAttendanceUpdate = exports.getSocketIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io = null;
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
        // Join room based on user role or ID
        socket.on("join", (data) => {
            if (data?.role) {
                socket.join(`role:${data.role}`);
                console.log(`Socket ${socket.id} joined role:${data.role}`);
            }
            if (data?.userId) {
                socket.join(`user:${data.userId}`);
                console.log(`Socket ${socket.id} joined user:${data.userId}`);
            }
        });
        socket.on("disconnect", () => {
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
    }
};
exports.emitAttendanceUpdate = emitAttendanceUpdate;
const emitLeaveUpdate = (data) => {
    if (io) {
        io.emit("leave:updated", data);
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
