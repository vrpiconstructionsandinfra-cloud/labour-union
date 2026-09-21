import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server | null = null;
const socketUserMap = new Map<string, number>();
const userSocketsMap = new Map<number, Set<string>>();

export const getOnlineUserIds = (): number[] => {
  return Array.from(userSocketsMap.keys());
};

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Send current online user IDs immediately to connected socket
    socket.emit("users:online", Array.from(userSocketsMap.keys()));

    // Join room based on user role or ID
    socket.on("join", (data: { userId: number; role: string }) => {
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
          userSocketsMap.get(uid)!.add(socket.id);

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

export const getSocketIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Helper emitters
export const emitAttendanceUpdate = (data: any) => {
  if (io) {
    io.emit("attendance:updated", data);
    // Also broadcast staff-level event so the Super Agent dashboard panel refreshes
    io.emit("attendance:staff:updated", { userId: data.workerId, timestamp: Date.now() });
  }
};

export const emitLeaveUpdate = (data: any) => {
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

export const emitTicketUpdate = (data: any) => {
  if (io) {
    io.emit("ticket:updated", data);
    io.emit("ticket:created", data);
    if (data.workerId) {
      io.to(`user:${data.workerId}`).emit("ticket:reply", data);
    }
  }
};

export const emitTicketComment = (data: any) => {
  if (io) {
    io.emit("ticket:comment", data);
    if (data.ticketId) {
      io.emit(`ticket:${data.ticketId}:comment`, data);
    }
  }
};

export const emitWalletUpdate = (data: any) => {
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

export const emitPayrollUpdate = (data: any) => {
  if (io) {
    io.emit("payroll:updated", data);
  }
};

export const emitInsuranceUpdate = (data: any) => {
  if (io) {
    io.emit("insurance:updated", data);
  }
};

export const emitSupportMessage = (data: any) => {
  if (io) {
    io.emit("support_message", data);
  }
};

export const emitSitePaymentUpdate = (data: any) => {
  if (io) {
    io.emit("sitePayment:created", data);
    io.emit("sitePayment:updated", data);
  }
};

export const emitIncentiveUpdate = (data: any) => {
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

export const emitWorkerRegistration = (data: any) => {
  if (io) {
    io.emit("worker:registered", data);
    io.emit("workers:updated", data);
  }
};



