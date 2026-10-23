import { Router } from "express";

import prisma from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return res.json({ success: true, data: notifications });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const notificationId =
      typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const updated = await prisma.notification.updateMany({
      where: { id: notificationId, userId: req.user!.id },
      data: { isRead: true },
    });
    if (updated.count === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Notification not found.",
          code: "NOTIFICATION_NOT_FOUND",
        });
    }
    return res.json({
      success: true,
      data: { id: notificationId, isRead: true },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/read-all", requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
