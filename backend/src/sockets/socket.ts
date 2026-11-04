import type { Server as HttpServer } from "node:http";

import { Server } from "socket.io";

import admin from "../config/firebase.js";
import prisma from "../config/prisma.js";
import { env } from "../config/env.js";

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        ...env.CLIENT_URL.split(","),
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
      ].map((origin) => origin.trim()).filter(Boolean),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : "";
      if (!token) return next(new Error("Authentication required"));
      const decoded = await admin.auth().verifyIdToken(token);
      const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
      if (!user || user.status === "SUSPENDED") return next(new Error("Access denied"));
      socket.data.userId = user.id;
      socket.data.role = user.role;
      return next();
    } catch {
      return next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    if (socket.data.role === "RIDER") {
      void prisma.rider.findUnique({ where: { userId }, select: { id: true } }).then((rider) => {
        if (rider) socket.join(`rider:${rider.id}`);
      });
    }

    socket.on("subscribe-order", async (orderId: unknown) => {
      if (typeof orderId !== "string") return;
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          OR: [
            { userId },
            { restaurant: { ownerId: userId } },
            { deliveryTask: { rider: { userId } } },
          ],
        },
        select: { id: true },
      });
      if (order) socket.join(`order:${order.id}`);
    });
  });

  return io;
}
