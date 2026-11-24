import { DeliveryTaskStatus, OrderStatus, VehicleType } from "@prisma/client";
import { Router } from "express";

import prisma from "../config/prisma.js";
import {
  requireAuth,
  requireCustomer,
  requireRider,
} from "../middleware/auth.js";

const router = Router();

const taskInclude = {
  order: {
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          latitude: true,
          longitude: true,
        },
      },
      address: true,
      items: true,
      user: { select: { id: true, name: true, phone: true } },
    },
  },
} as const;

async function getRider(userId: string) {
  const existing = await prisma.rider.findUnique({ where: { userId } });
  if (existing) return existing;

  const application = await prisma.riderApplication.findFirst({
    where: { applicantId: userId, status: "APPROVED" },
    orderBy: { updatedAt: "desc" },
  });
  if (!application || application.status !== "APPROVED") return null;

  return prisma.rider.upsert({
    where: { userId },
    update: {
      vehicleType: application.vehicleType,
      vehicleNumber: application.vehicleNumber,
      licenseNumber: application.licenseNumber,
    },
    create: {
      userId,
      vehicleType: application.vehicleType,
      vehicleNumber: application.vehicleNumber,
      licenseNumber: application.licenseNumber,
    },
  });
}

async function getRiderCity(userId: string) {
  const application = await prisma.riderApplication.findFirst({
    where: { applicantId: userId, status: "APPROVED" },
    orderBy: { updatedAt: "desc" },
  });
  return application?.city?.trim() || null;
}

function distanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(latitude2 - latitude1);
  const dLon = toRadians(longitude2 - longitude1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : value?.[0];
}

router.post("/apply", requireAuth, requireCustomer, async (req, res, next) => {
  try {
    const vehicleType = req.body?.vehicleType as VehicleType;
    const values = ["vehicleNumber", "licenseNumber", "phone", "address"].map(
      (key) =>
        typeof req.body?.[key] === "string" ? req.body[key].trim() : "",
    );
    if (
      !Object.values(VehicleType).includes(vehicleType) ||
      values.some((value) => !value)
    ) {
      res
        .status(400)
        .json({
          success: false,
          message: "Complete rider application details are required.",
          code: "INVALID_APPLICATION",
        });
      return;
    }
    const [vehicleNumber, licenseNumber, phone, address] = values;
    const existingApplication = await prisma.riderApplication.findFirst({
      where: {
        applicantId: req.user!.id,
        status: { in: ["PENDING", "APPROVED", "REJECTED"] },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (existingApplication?.status === "APPROVED") {
      res
        .status(409)
        .json({
          success: false,
          message: "Your rider application is already approved.",
          code: "APPLICATION_EXISTS",
        });
      return;
    }
    const application = existingApplication
      ? await prisma.riderApplication.update({
          where: { id: existingApplication.id },
          data: {
            vehicleType,
            vehicleNumber,
            licenseNumber,
            phone,
            address,
            status: "PENDING",
            rejectionReason: null,
            reviewedBy: null,
            reviewedAt: null,
          },
        })
      : await prisma.riderApplication.create({
          data: {
            applicantId: req.user!.id,
            vehicleType,
            vehicleNumber,
            licenseNumber,
            phone,
            address,
          },
        });
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, requireRider, async (req, res, next) => {
  try {
    const rider = await getRider(req.user!.id);
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
      },
    });
    const application = await prisma.riderApplication.findFirst({
      where: { applicantId: req.user!.id, status: "APPROVED" },
      orderBy: { updatedAt: "desc" },
    });
    if (!rider) {
      res
        .status(404)
        .json({
          success: false,
          message:
            "Rider profile is not provisioned. An administrator must approve the rider application first.",
          code: "RIDER_NOT_PROVISIONED",
        });
      return;
    }
    res.json({
      success: true,
      data: {
        ...rider,
        fullName: application?.fullName ?? user?.name ?? null,
        address: application?.address ?? null,
        city: application?.city ?? null,
        state: application?.state ?? null,
        pincode: application?.pincode ?? null,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/profile", requireAuth, requireRider, async (req, res, next) => {
  try {
    const name =
      typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
    const phone =
      typeof req.body?.phone === "string" ? req.body.phone.trim() : undefined;
    const address =
      typeof req.body?.address === "string" ? req.body.address.trim() : undefined;
    const city =
      typeof req.body?.city === "string" ? req.body.city.trim() : undefined;
    const state =
      typeof req.body?.state === "string" ? req.body.state.trim() : undefined;
    const pincode =
      typeof req.body?.pincode === "string" ? req.body.pincode.trim() : undefined;
    if (!name && !phone && !address && !city && !state && !pincode) {
      res
        .status(400)
        .json({
          success: false,
          message: "At least one profile field is required.",
          code: "INVALID_PROFILE",
        });
      return;
    }
    if (name && name.length < 2) {
      res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters.",
        code: "INVALID_PROFILE",
      });
      return;
    }
    const normalizedPhone = phone
      ? phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "")
      : "";
    if (phone && !/^[6-9]\d{9}$/.test(normalizedPhone)) {
      res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit mobile number.",
        code: "INVALID_PHONE",
      });
      return;
    }
    if ((address !== undefined && address.length < 5) ||
      (pincode !== undefined && pincode.length < 4)) {
      res.status(400).json({
        success: false,
        message: "Address and pincode must be valid.",
        code: "INVALID_ADDRESS",
      });
      return;
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: req.user!.id },
        data: {
          ...(name ? { name } : {}),
            ...(phone ? { phone: normalizedPhone } : {}),
        },
      });
      const application = await transaction.riderApplication.findFirst({
        where: { applicantId: req.user!.id, status: "APPROVED" },
        orderBy: { updatedAt: "desc" },
      });
      if (application) {
        await transaction.riderApplication.update({
          where: { id: application.id },
          data: {
            ...(name ? { fullName: name } : {}),
            ...(phone ? { phone: normalizedPhone } : {}),
            ...(address !== undefined ? { address } : {}),
            ...(city !== undefined ? { city } : {}),
            ...(state !== undefined ? { state } : {}),
            ...(pincode !== undefined ? { pincode } : {}),
          },
        });
      }
    });

    const rider = await getRider(req.user!.id);
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
      },
    });
    const application = await prisma.riderApplication.findFirst({
      where: { applicantId: req.user!.id, status: "APPROVED" },
      orderBy: { updatedAt: "desc" },
    });
    res.json({
      success: true,
      data: {
        ...rider,
        fullName: application?.fullName ?? user?.name ?? null,
        address: application?.address ?? null,
        city: application?.city ?? null,
        state: application?.state ?? null,
        pincode: application?.pincode ?? null,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard", requireAuth, requireRider, async (req, res, next) => {
  try {
    const rider = await getRider(req.user!.id);
    if (!rider)
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Rider profile is not provisioned. An administrator must approve the rider application first.",
          code: "RIDER_NOT_PROVISIONED",
        });
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [todayTasks, active, todayEarnings, weeklyEarnings] =
      await Promise.all([
        prisma.deliveryTask.count({
          where: { riderId: rider.id, createdAt: { gte: start } },
        }),
        prisma.deliveryTask.findFirst({
          where: {
            riderId: rider.id,
            status: {
              in: [
                DeliveryTaskStatus.RIDER_ASSIGNED,
                DeliveryTaskStatus.PICKED_UP,
                DeliveryTaskStatus.OUT_FOR_DELIVERY,
              ],
            },
          },
          include: taskInclude,
          orderBy: { assignedAt: "desc" },
        }),
        prisma.riderEarning.aggregate({
          where: { riderId: rider.id, createdAt: { gte: start } },
          _sum: { amount: true },
        }),
        prisma.riderEarning.aggregate({
          where: {
            riderId: rider.id,
            createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
          },
          _sum: { amount: true },
        }),
      ]);
    res.json({
      success: true,
      data: {
        rider,
        todayDeliveries: todayTasks,
        activeDelivery: active,
        todayEarnings: todayEarnings._sum.amount ?? 0,
        weeklyEarnings: weeklyEarnings._sum.amount ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/availability",
  requireAuth,
  requireRider,
  async (req, res, next) => {
    try {
      const isOnline = req.body?.isOnline === true;
      const rider = await prisma.rider.update({
        where: { userId: req.user!.id },
        data: { isOnline, isAvailable: isOnline },
        include: {
          user: {
            select: { name: true, email: true, phone: true, avatar: true },
          },
        },
      });
      res.json({ success: true, data: rider });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/deliveries", requireAuth, requireRider, async (req, res, next) => {
  try {
    const rider = await getRider(req.user!.id);
    if (!rider)
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Rider profile is not provisioned. An administrator must approve the rider application first.",
          code: "RIDER_NOT_PROVISIONED",
        });
    const tasks = await prisma.deliveryTask.findMany({
      where: {
        OR: [
          {
            riderId: rider.id,
            status: {
              in: [
                DeliveryTaskStatus.RIDER_ASSIGNED,
                DeliveryTaskStatus.PICKED_UP,
                DeliveryTaskStatus.OUT_FOR_DELIVERY,
              ],
            },
          },
          { riderId: null, status: DeliveryTaskStatus.SEARCHING_RIDER },
        ],
      },
      include: taskInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const riderCity = await getRiderCity(req.user!.id);
    const filteredTasks = tasks.filter((task) => {
      if (task.riderId === rider.id) return true;
      if (task.riderId) return false;
      const deliveryCity =
        task.order.address?.city?.trim() ||
        task.order.restaurant.address?.trim() ||
        "";
      if (riderCity && deliveryCity.toLowerCase().includes(riderCity.toLowerCase())) return true;
      if (
        rider.currentLatitude !== null &&
        rider.currentLongitude !== null &&
        task.deliveryLatitude !== null &&
        task.deliveryLongitude !== null
      ) {
        return distanceKm(
          rider.currentLatitude,
          rider.currentLongitude,
          task.deliveryLatitude,
          task.deliveryLongitude,
        ) <= 25;
      }
      return false;
    });
    res.json({ success: true, data: filteredTasks });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/deliveries/:id",
  requireAuth,
  requireRider,
  async (req, res, next) => {
    try {
      const rider = await getRider(req.user!.id);
      const taskId = routeParam(req.params.id);
      const task = taskId
        ? await prisma.deliveryTask.findUnique({
            where: { id: taskId },
            include: taskInclude,
          })
        : null;
      if (!task || (task.riderId && task.riderId !== rider?.id))
        return res
          .status(404)
          .json({
            success: false,
            message: "Delivery not found.",
            code: "DELIVERY_NOT_FOUND",
          });
      res.json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/deliveries/:id/accept",
  requireAuth,
  requireRider,
  async (req, res, next) => {
    try {
      const rider = await getRider(req.user!.id);
      if (!rider || !rider.isOnline || !rider.isAvailable)
        return res
          .status(409)
          .json({
            success: false,
            message: "Rider must be online and available.",
            code: "RIDER_UNAVAILABLE",
          });
      const task = await prisma.$transaction(async (transaction) => {
        const taskId = routeParam(req.params.id);
        const current = taskId
          ? await transaction.deliveryTask.findUnique({
              where: { id: taskId },
              include: { order: { include: { address: true, restaurant: true } } },
            })
          : null;
        if (
          !current ||
          current.status !== DeliveryTaskStatus.SEARCHING_RIDER ||
          current.riderId
        )
          return null;
        const riderCity = await getRiderCity(req.user!.id);
        const deliveryCity =
          current.order.address?.city?.trim() ||
          current.order.restaurant.city?.trim() ||
          "";
        if (
          riderCity &&
          deliveryCity &&
          !deliveryCity.toLowerCase().includes(riderCity.toLowerCase())
        ) {
          return null;
        }
        await transaction.rider.update({
          where: { id: rider.id },
          data: { isAvailable: false },
        });
        return transaction.deliveryTask.update({
          where: { id: current.id },
          data: {
            riderId: rider.id,
            status: DeliveryTaskStatus.RIDER_ASSIGNED,
            assignedAt: new Date(),
          },
          include: taskInclude,
        });
      });
      if (!task)
        return res
          .status(409)
          .json({
            success: false,
            message: "This delivery is no longer available.",
            code: "DELIVERY_TAKEN",
          });
      res.json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  },
);

const transitions: Record<
  string,
  { from: DeliveryTaskStatus[]; to: DeliveryTaskStatus }
> = {
  "arrived-restaurant": {
    from: [DeliveryTaskStatus.RIDER_ASSIGNED],
    to: DeliveryTaskStatus.RIDER_ASSIGNED,
  },
  pickup: {
    from: [DeliveryTaskStatus.RIDER_ASSIGNED],
    to: DeliveryTaskStatus.PICKED_UP,
  },
  start: {
    from: [DeliveryTaskStatus.PICKED_UP],
    to: DeliveryTaskStatus.OUT_FOR_DELIVERY,
  },
  "arrived-customer": {
    from: [DeliveryTaskStatus.OUT_FOR_DELIVERY],
    to: DeliveryTaskStatus.OUT_FOR_DELIVERY,
  },
  complete: {
    from: [DeliveryTaskStatus.OUT_FOR_DELIVERY],
    to: DeliveryTaskStatus.DELIVERED,
  },
};

for (const [action, transition] of Object.entries(transitions)) {
  router.post(
    `/deliveries/:id/${action}`,
    requireAuth,
    requireRider,
    async (req, res, next) => {
      try {
        const rider = await getRider(req.user!.id);
        const taskId = routeParam(req.params.id);
        const task = taskId
          ? await prisma.deliveryTask.findFirst({
              where: { id: taskId, riderId: rider?.id },
            })
          : null;
        if (!task || !transition.from.includes(task.status))
          return res
            .status(409)
            .json({
              success: false,
              message: "This delivery cannot be moved to that stage.",
              code: "INVALID_DELIVERY_TRANSITION",
            });
        if (action === "pickup") {
          const order = await prisma.order.findUnique({
            where: { id: task.orderId },
            select: { status: true },
          });
          if (order?.status !== OrderStatus.READY) {
            return res.status(409).json({
              success: false,
              message: "The restaurant has not marked this order ready yet.",
              code: "ORDER_NOT_READY",
            });
          }
        }
        const completed = action === "complete";
        const result = await prisma.$transaction(async (transaction) => {
          const updated = await transaction.deliveryTask.update({
            where: { id: task.id },
            data: {
              status: transition.to,
              ...(action === "pickup" ? { pickedUpAt: new Date() } : {}),
              ...(completed ? { deliveredAt: new Date() } : {}),
            },
            include: taskInclude,
          });
          if (completed) {
            await transaction.order.update({
              where: { id: task.orderId },
              data: { status: OrderStatus.DELIVERED },
            });
            await transaction.rider.update({
              where: { id: rider!.id },
              data: { isAvailable: true, totalDeliveries: { increment: 1 } },
            });
            await transaction.riderEarning.create({
              data: { riderId: rider!.id, deliveryTaskId: task.id, amount: 50 },
            });
          } else if (action === "start") {
            await transaction.order.update({
              where: { id: task.orderId },
              data: { status: OrderStatus.OUT_FOR_DELIVERY },
            });
          }
          return updated;
        });
        res.json({ success: true, data: result });
      } catch (error) {
        next(error);
      }
    },
  );
}

router.get("/history", requireAuth, requireRider, async (req, res, next) => {
  try {
    const rider = await getRider(req.user!.id);
    const page = Math.max(1, Number(req.query.page) || 1);
    const [data, total] = await Promise.all([
      prisma.deliveryTask.findMany({
        where: {
          riderId: rider?.id,
          status: {
            in: [DeliveryTaskStatus.DELIVERED, DeliveryTaskStatus.CANCELLED],
          },
        },
        include: taskInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * 20,
        take: 20,
      }),
      prisma.deliveryTask.count({
        where: {
          riderId: rider?.id,
          status: {
            in: [DeliveryTaskStatus.DELIVERED, DeliveryTaskStatus.CANCELLED],
          },
        },
      }),
    ]);
    res.json({
      success: true,
      data,
      pagination: { page, pageSize: 20, total, pages: Math.ceil(total / 20) },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/earnings", requireAuth, requireRider, async (req, res, next) => {
  try {
    const rider = await getRider(req.user!.id);
    const earnings = await prisma.riderEarning.findMany({
      where: { riderId: rider?.id },
      include: { rider: false },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ success: true, data: earnings });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/notifications",
  requireAuth,
  requireRider,
  async (req, res, next) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/notifications/:id/read",
  requireAuth,
  requireRider,
  async (req, res, next) => {
    try {
      const notificationId = routeParam(req.params.id);
      const notification = await prisma.notification.updateMany({
        where: { id: notificationId, userId: req.user!.id },
        data: { isRead: true },
      });
      res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/notifications/read-all",
  requireAuth,
  requireRider,
  async (req, res, next) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id, isRead: false },
        data: { isRead: true },
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
