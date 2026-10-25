import { createServer } from "node:http";

import app from "./app.js";
import { env } from "./config/env.js";
import prisma from "./config/prisma.js";
import { createSocketServer } from "./sockets/socket.js";

const httpServer = createServer(app);
createSocketServer(httpServer);

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Prisma connected successfully.");
  } catch (error) {
    console.warn(
      "Database is unavailable; continuing in local demo mode. Install PostgreSQL and set DATABASE_URL to enable full persistence.",
      error instanceof Error ? error.message : error,
    );
  }

  httpServer.listen(env.PORT, () => {
    console.log(`Cravio API is running on http://localhost:${env.PORT}`);
  });
}

void startServer();
