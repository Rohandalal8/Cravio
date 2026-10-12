import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import applicationsRoutes from "./routes/applications.routes.js";
import healthRoutes from "./routes/health.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import restaurantRoutes from "./routes/restaurant.routes.js";
import riderRoutes from "./routes/rider.routes.js";
import restaurantsRoutes from "./routes/restaurants.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";

const app = express();

const allowedOrigins = env.CLIENT_URL.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === "production" ? 200 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "cravio-api",
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/api", healthRoutes);
app.use("/api", restaurantsRoutes);
app.use("/api", ordersRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/restaurant", restaurantRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/rider", riderRoutes);
app.use("/api/uploads", uploadsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
