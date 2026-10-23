import { Router } from "express";

import admin from "../config/firebase.js";
import prisma from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        code: "USER_NOT_FOUND",
      });
    }

    const roles = [user.role];
    return res.status(200).json({ success: true, data: { ...user, roles } });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/me", requireAuth, async (req, res, next) => {
  try {
    if (req.user!.role !== "ADMIN") {
      return res
        .status(403)
        .json({
          success: false,
          message: "An administrator account is required.",
          code: "ADMIN_REQUIRED",
        });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Admin profile not found.",
          code: "USER_NOT_FOUND",
        });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return next(error);
  }
});

router.post("/sync", async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required.",
      code: "UNAUTHORIZED",
    });
  }

  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const decodedToken = await admin.auth().verifyIdToken(token);

    const userPayload = {
      firebaseUid: decodedToken.uid,
      name: req.body.name ?? decodedToken.name ?? null,
      email: req.body.email ?? decodedToken.email ?? null,
      phone: req.body.phone ?? decodedToken.phone_number ?? null,
      avatar: req.body.avatar ?? decodedToken.picture ?? null,
    };

    const existingByFirebaseUid = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });
    const existingByEmail =
      !existingByFirebaseUid && userPayload.email
        ? await prisma.user.findUnique({ where: { email: userPayload.email } })
        : null;
    const existingUser = existingByFirebaseUid ?? existingByEmail;

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firebaseUid: userPayload.firebaseUid,
            name: userPayload.name,
            email: userPayload.email,
            phone: userPayload.phone,
            avatar: userPayload.avatar,
          },
        })
      : await prisma.user.create({ data: userPayload });

    const roles = [user.role];
    return res.status(200).json({ success: true, data: { ...user, roles } });
  } catch (error) {
    return next(error);
  }
});

export default router;
