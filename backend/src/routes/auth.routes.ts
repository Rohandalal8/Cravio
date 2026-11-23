import { Router } from "express";

import admin from "../config/firebase.js";
import prisma from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/addresses", requireAuth, async (req, res, next) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    res.status(200).json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
});

router.post("/addresses", requireAuth, async (req, res, next) => {
  try {
    const fields = ["label", "fullAddress", "city", "state", "pincode"] as const;
    const values = fields.map((field) =>
      typeof req.body?.[field] === "string" ? req.body[field].trim() : "",
    );
    if (values.some((value) => !value)) {
      res.status(400).json({
        success: false,
        message: "Label, address, city, state and pincode are required.",
        code: "ADDRESS_REQUIRED",
      });
      return;
    }

    const [label, fullAddress, city, state, pincode] = values;
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    const address = await prisma.$transaction(async (transaction) => {
      const count = await transaction.address.count({ where: { userId: req.user!.id } });
      if (req.body?.isDefault === true || count === 0) {
        await transaction.address.updateMany({
          where: { userId: req.user!.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return transaction.address.create({
        data: {
          userId: req.user!.id,
          label,
          fullAddress,
          city,
          state,
          pincode,
          latitude: Number.isFinite(latitude) ? latitude : null,
          longitude: Number.isFinite(longitude) ? longitude : null,
          isDefault: req.body?.isDefault === true || count === 0,
        },
      });
    });
    res.status(201).json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
});

router.patch("/addresses/:id", requireAuth, async (req, res, next) => {
  try {
    const addressId =
      typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId: req.user!.id },
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Address not found.",
        code: "ADDRESS_NOT_FOUND",
      });
      return;
    }

    const data: {
      label?: string;
      fullAddress?: string;
      city?: string;
      state?: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
      isDefault?: boolean;
    } = {};
    for (const field of ["label", "fullAddress", "city", "state", "pincode"] as const) {
      if (typeof req.body?.[field] === "string") data[field] = req.body[field].trim();
    }
    if (Number.isFinite(Number(req.body?.latitude))) data.latitude = Number(req.body.latitude);
    if (Number.isFinite(Number(req.body?.longitude))) data.longitude = Number(req.body.longitude);

    const address = await prisma.$transaction(async (transaction) => {
      if (req.body?.isDefault === true) {
        await transaction.address.updateMany({
          where: { userId: req.user!.id, isDefault: true },
          data: { isDefault: false },
        });
        data.isDefault = true;
      }
      return transaction.address.update({
        where: { id: existing.id },
        data,
      });
    });
    res.status(200).json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
});

router.delete("/addresses/:id", requireAuth, async (req, res, next) => {
  try {
    const addressId =
      typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId: req.user!.id },
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: "Address not found.",
        code: "ADDRESS_NOT_FOUND",
      });
      return;
    }
    await prisma.address.delete({ where: { id: existing.id } });
    if (existing.isDefault) {
      const nextAddress = await prisma.address.findFirst({
        where: { userId: req.user!.id },
        orderBy: { updatedAt: "desc" },
      });
      if (nextAddress) {
        await prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }
    res.status(200).json({ success: true, data: { id: existing.id } });
  } catch (error) {
    next(error);
  }
});

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
    if (decodedToken.email && decodedToken.email_verified === false) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before continuing.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

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
