import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server | null = null;

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

    // Join room based on user role or ID
    socket.on("join", (data: { userId: number; role: string }) => {
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
  }
};

export const emitLeaveUpdate = (data: any) => {
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
