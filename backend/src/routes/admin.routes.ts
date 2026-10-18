import { ApplicationStatus, CouponDiscountType, OrderStatus, PaymentStatus, UserRole, UserStatus } from "@prisma/client";
import { Router } from "express";

import prisma from "../config/prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();

const pageOptions = (query: Record<string, unknown>) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const searchFilter = (value: unknown) => typeof value === "string" && value.trim() ? { contains: value.trim(), mode: "insensitive" as const } : undefined;

router.get("/dashboard", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [users, restaurants, riders, orders, activeDeliveries, restaurantApplications, riderApplications, recentOrders, recentUsers, orderGroups] = await Promise.all([
      prisma.user.count(),
      prisma.restaurant.count(),
      prisma.rider.count(),
      prisma.order.count(),
      prisma.deliveryTask.count({ where: { status: { in: ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"] } } }),
      prisma.restaurantApplication.count({ where: { status: "PENDING" } }),
      prisma.riderApplication.count({ where: { status: "PENDING" } }),
      prisma.order.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } }, restaurant: { select: { name: true } }, payment: true } }),
      prisma.user.findMany({ take: 8, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, status: true, createdAt: true } }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    return res.json({ success: true, data: { counts: { users, restaurants, riders, orders, activeDeliveries, pendingApplications: restaurantApplications + riderApplications }, recentOrders, recentUsers, orderStatus: orderGroups } });
  } catch (error) {
    return next(error);
  }
});

router.get("/applications", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [restaurants, riders] = await Promise.all([
      prisma.restaurantApplication.findMany({ include: { applicant: true, restaurant: true }, orderBy: { createdAt: "desc" } }),
      prisma.riderApplication.findMany({ include: { applicant: true }, orderBy: { createdAt: "desc" } }),
    ]);
    res.status(200).json({ success: true, data: { restaurants, riders } });
  } catch (error) {
    next(error);
  }
});

router.patch("/rider-applications/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = req.body?.status as ApplicationStatus;
    if (status !== ApplicationStatus.APPROVED && status !== ApplicationStatus.REJECTED) {
      res.status(400).json({ success: false, message: "Approval status is required.", code: "INVALID_STATUS" });
      return;
    }
    const rejectionReason = typeof req.body?.rejectionReason === "string" ? req.body.rejectionReason.trim() : "";
    if (status === ApplicationStatus.REJECTED && !rejectionReason) {
      res.status(422).json({ success: false, message: "A rejection reason is required.", code: "REJECTION_REASON_REQUIRED" });
      return;
    }
    const applicationId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const result = await prisma.$transaction(async (transaction) => {
      const application = await transaction.riderApplication.findUnique({ where: { id: applicationId } });
      if (!application) return null;
      if (application.status !== ApplicationStatus.PENDING) throw new Error("APPLICATION_NOT_PENDING");
      await transaction.riderApplication.update({
        where: { id: application.id },
        data: {
          status,
          rejectionReason: status === ApplicationStatus.REJECTED ? rejectionReason : null,
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
        },
      });
      if (status === ApplicationStatus.APPROVED) {
        const applicant = await transaction.user.findUnique({ where: { id: application.applicantId }, select: { role: true } });
        if (applicant?.role === UserRole.RESTAURANT_OWNER) throw new Error("PARTNER_ROLE_CONFLICT");
        await transaction.userRoleAssignment.deleteMany({ where: { userId: application.applicantId, role: UserRole.RESTAURANT_OWNER } });
        await transaction.userRoleAssignment.upsert({
          where: { userId_role: { userId: application.applicantId, role: UserRole.RIDER } },
          update: {},
          create: { userId: application.applicantId, role: UserRole.RIDER },
        });
        await transaction.user.update({ where: { id: application.applicantId }, data: { role: UserRole.RIDER } });
        await transaction.rider.upsert({
          where: { userId: application.applicantId },
          update: { vehicleType: application.vehicleType, vehicleNumber: application.vehicleNumber, licenseNumber: application.licenseNumber },
          create: { userId: application.applicantId, vehicleType: application.vehicleType, vehicleNumber: application.vehicleNumber, licenseNumber: application.licenseNumber },
        });
      }
      await transaction.notification.create({
        data: {
          userId: application.applicantId,
          title: status === ApplicationStatus.APPROVED ? "Rider application approved" : "Rider application not approved",
          message: status === ApplicationStatus.APPROVED ? "Your rider application has been approved." : `Your rider application was not approved. Reason: ${rejectionReason}`,
        },
      });
      return application;
    });
    if (!result) {
      res.status(404).json({ success: false, message: "Rider application not found.", code: "APPLICATION_NOT_FOUND" });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "APPLICATION_NOT_PENDING") {
      res.status(409).json({ success: false, message: "Only pending applications can be reviewed.", code: "APPLICATION_NOT_PENDING" });
      return;
    }
    if (error instanceof Error && error.message === "PARTNER_ROLE_CONFLICT") {
      res.status(409).json({ success: false, message: "This user already has the other partner role.", code: "PARTNER_ROLE_CONFLICT" });
      return;
    }
    next(error);
  }
});

router.patch("/restaurant-applications/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = req.body?.status as ApplicationStatus;
    if (status !== ApplicationStatus.APPROVED && status !== ApplicationStatus.REJECTED) {
      res.status(400).json({ success: false, message: "Approval status is required.", code: "INVALID_STATUS" });
      return;
    }
    const rejectionReason = typeof req.body?.rejectionReason === "string" ? req.body.rejectionReason.trim() : "";
    if (status === ApplicationStatus.REJECTED && !rejectionReason) {
      res.status(422).json({ success: false, message: "A rejection reason is required.", code: "REJECTION_REASON_REQUIRED" });
      return;
    }
    const applicationId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const result = await prisma.$transaction(async (transaction) => {
      const application = await transaction.restaurantApplication.findUnique({ where: { id: applicationId } });
      if (!application) return null;
      if (application.status !== ApplicationStatus.PENDING) throw new Error("APPLICATION_NOT_PENDING");
      const updated = await transaction.restaurantApplication.update({
        where: { id: application.id },
        data: {
          status,
          rejectionReason: status === ApplicationStatus.REJECTED ? rejectionReason : null,
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
        },
      });
      if (status === ApplicationStatus.APPROVED) {
        const slug = `${application.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${application.id.slice(-6)}`;
        const applicant = await transaction.user.findUnique({ where: { id: application.applicantId }, select: { role: true } });
        if (applicant?.role === UserRole.RIDER) throw new Error("PARTNER_ROLE_CONFLICT");
        await transaction.userRoleAssignment.deleteMany({ where: { userId: application.applicantId, role: UserRole.RIDER } });
        const restaurant = await transaction.restaurant.create({
          data: {
            ownerId: application.applicantId,
            name: application.name,
            slug,
            description: application.restaurantDescription,
            phone: application.phone,
            email: application.email,
            address: application.address,
            city: application.city,
            state: application.state,
            pincode: application.pincode,
            latitude: application.latitude,
            longitude: application.longitude,
            logo: application.logo,
            coverImage: application.coverImage,
            minimumOrder: application.minimumOrder ?? undefined,
            deliveryTime: application.preparationTime ? `${application.preparationTime} min` : undefined,
          },
        });
        await transaction.restaurantApplication.update({ where: { id: application.id }, data: { restaurantId: restaurant.id } });
        await transaction.userRoleAssignment.upsert({
          where: { userId_role: { userId: application.applicantId, role: UserRole.RESTAURANT_OWNER } },
          update: {},
          create: { userId: application.applicantId, role: UserRole.RESTAURANT_OWNER },
        });
        await transaction.user.update({ where: { id: application.applicantId }, data: { role: UserRole.RESTAURANT_OWNER } });
      }
      await transaction.notification.create({
        data: {
          userId: application.applicantId,
          title: status === ApplicationStatus.APPROVED ? "Restaurant owner application approved" : "Restaurant owner application not approved",
          message: status === ApplicationStatus.APPROVED ? "Your restaurant owner application has been approved." : `Your application was not approved. Reason: ${rejectionReason}`,
        },
      });
      return updated;
    });
    if (!result) {
      res.status(404).json({ success: false, message: "Restaurant application not found.", code: "APPLICATION_NOT_FOUND" });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "APPLICATION_NOT_PENDING") {
      res.status(409).json({ success: false, message: "Only pending applications can be reviewed.", code: "APPLICATION_NOT_PENDING" });
      return;
    }
    if (error instanceof Error && error.message === "PARTNER_ROLE_CONFLICT") {
      res.status(409).json({ success: false, message: "This user already has the other partner role.", code: "PARTNER_ROLE_CONFLICT" });
      return;
    }
    next(error);
  }
});

router.get("/users", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { page, limit, skip } = pageOptions(_req.query);
    const search = searchFilter(_req.query.search);
    const where = { ...(search ? { OR: [{ name: search }, { email: search }, { phone: search }] } : {}), ...(_req.query.role && Object.values(UserRole).includes(_req.query.role as UserRole) ? { role: _req.query.role as UserRole } : {}), ...(_req.query.status && Object.values(UserStatus).includes(_req.query.status as UserStatus) ? { status: _req.query.status as UserStatus } : {}) };
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take: limit, select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true, _count: { select: { orders: true, reviews: true } } }, orderBy: { createdAt: "desc" } }),
      prisma.user.count({ where }),
    ]);
    res.status(200).json({ success: true, data: users, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

router.get("/restaurants", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, skip } = pageOptions(req.query);
    const search = searchFilter(req.query.search);
    const where = { ...(search ? { OR: [{ name: search }, { city: search }, { email: search }] } : {}), ...(req.query.status === "ACTIVE" ? { isActive: true } : req.query.status === "SUSPENDED" ? { isActive: false } : {}) };
    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({ where, skip, take: limit, include: { owner: { select: { name: true, email: true } }, cuisines: { include: { cuisine: true } }, _count: { select: { orders: true, reviews: true } } }, orderBy: { createdAt: "desc" } }),
      prisma.restaurant.count({ where }),
    ]);
    return res.json({ success: true, data: restaurants, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

router.patch("/restaurants/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (req.body?.status !== "ACTIVE" && req.body?.status !== "SUSPENDED") return res.status(400).json({ success: false, message: "A valid restaurant status is required.", code: "INVALID_STATUS" });
    const restaurant = await prisma.restaurant.update({ where: { id: req.params.id as string }, data: { isActive: req.body.status === "ACTIVE" } });
    return res.json({ success: true, data: restaurant });
  } catch (error) { return next(error); }
});

router.get("/riders", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, skip } = pageOptions(req.query);
    const search = searchFilter(req.query.search);
    const where = search ? { user: { OR: [{ name: search }, { email: search }, { phone: search }] } } : {};
    const [riders, total] = await Promise.all([
      prisma.rider.findMany({ where, skip, take: limit, include: { user: { select: { id: true, name: true, email: true, phone: true, status: true } } }, orderBy: { createdAt: "desc" } }),
      prisma.rider.count({ where }),
    ]);
    return res.json({ success: true, data: riders, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

router.patch("/riders/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (req.body?.status !== "ACTIVE" && req.body?.status !== "SUSPENDED") return res.status(400).json({ success: false, message: "A valid rider status is required.", code: "INVALID_STATUS" });
    const rider = await prisma.rider.update({ where: { id: req.params.id as string }, data: { user: { update: { status: req.body.status } } } });
    return res.json({ success: true, data: rider });
  } catch (error) { return next(error); }
});

router.get("/orders", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, skip } = pageOptions(req.query);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const where = { ...(search ? { OR: [{ id: { contains: search, mode: "insensitive" as const } }, { user: { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } }, { restaurant: { name: { contains: search, mode: "insensitive" as const } } }] } : {}), ...(Object.values(OrderStatus).includes(req.query.status as OrderStatus) ? { status: req.query.status as OrderStatus } : {}) };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, skip, take: limit, include: { user: { select: { name: true, email: true } }, restaurant: { select: { name: true } }, payment: true, deliveryTask: { include: { rider: { include: { user: { select: { name: true } } } } } } }, orderBy: { createdAt: "desc" } }),
      prisma.order.count({ where }),
    ]);
    return res.json({ success: true, data: orders, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

router.patch("/orders/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!Object.values(OrderStatus).includes(req.body?.status)) return res.status(400).json({ success: false, message: "A valid order status is required.", code: "INVALID_STATUS" });
    const order = await prisma.order.update({ where: { id: req.params.id as string }, data: { status: req.body.status } });
    return res.json({ success: true, data: order });
  } catch (error) { return next(error); }
});

router.get("/payments", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { page, limit, skip } = pageOptions(req.query);
    const where = Object.values(PaymentStatus).includes(req.query.status as PaymentStatus) ? { status: req.query.status as PaymentStatus } : {};
    const [payments, total] = await Promise.all([prisma.payment.findMany({ where, skip, take: limit, include: { order: { include: { user: { select: { name: true, email: true } }, restaurant: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } }), prisma.payment.count({ where })]);
    return res.json({ success: true, data: payments, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
});

router.get("/reviews", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({ include: { user: { select: { name: true, email: true } }, restaurant: { select: { name: true } } }, orderBy: { createdAt: "desc" } });
    return res.json({ success: true, data: reviews });
  } catch (error) { return next(error); }
});

router.delete("/reviews/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try { await prisma.review.delete({ where: { id: req.params.id as string } }); return res.json({ success: true, data: null }); } catch (error) { return next(error); }
});

router.get("/coupons", requireAuth, requireAdmin, async (_req, res, next) => {
  try { const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }); return res.json({ success: true, data: coupons }); } catch (error) { return next(error); }
});

router.post("/coupons", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { code, discountType, discountValue, minimumOrder, maximumDiscount, usageLimit, expiresAt } = req.body ?? {};
    const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";
    const value = Number(discountValue);
    const minimum = Number(minimumOrder ?? 0);
    const maximum = maximumDiscount == null || maximumDiscount === "" ? null : Number(maximumDiscount);
    const limit = usageLimit == null || usageLimit === "" ? null : Number(usageLimit);
    const expiry = expiresAt ? new Date(expiresAt) : null;
    if (!/^[A-Z0-9_-]{3,30}$/.test(normalizedCode) || !Object.values(CouponDiscountType).includes(discountType) || !Number.isFinite(value) || value <= 0 || (discountType === CouponDiscountType.PERCENTAGE && value > 100) || !Number.isFinite(minimum) || minimum < 0 || (maximum !== null && (!Number.isFinite(maximum) || maximum <= 0)) || (limit !== null && (!Number.isInteger(limit) || limit < 1)) || (expiry && Number.isNaN(expiry.getTime()))) {
      return res.status(400).json({ success: false, message: "Enter valid coupon details.", code: "INVALID_COUPON" });
    }
    if (await prisma.coupon.findUnique({ where: { code: normalizedCode } })) return res.status(409).json({ success: false, message: "A coupon with this code already exists.", code: "COUPON_EXISTS" });
    const coupon = await prisma.coupon.create({ data: { code: normalizedCode, discountType, discountValue: value, minimumOrder: minimum, maximumDiscount: maximum, usageLimit: limit, expiresAt: expiry } });
    return res.status(201).json({ success: true, data: coupon });
  } catch (error) { return next(error); }
});

router.patch("/coupons/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try { const coupon = await prisma.coupon.update({ where: { id: req.params.id as string }, data: { isActive: Boolean(req.body?.isActive) } }); return res.json({ success: true, data: coupon }); } catch (error) { return next(error); }
});

router.delete("/coupons/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try { await prisma.coupon.delete({ where: { id: req.params.id as string } }); return res.json({ success: true, data: null }); } catch (error) { return next(error); }
});

router.get("/cuisines", requireAuth, requireAdmin, async (_req, res, next) => {
  try { const cuisines = await prisma.cuisine.findMany({ include: { _count: { select: { restaurants: true } } }, orderBy: { name: "asc" } }); return res.json({ success: true, data: cuisines }); } catch (error) { return next(error); }
});

router.post("/cuisines", requireAuth, requireAdmin, async (req, res, next) => {
  try { if (typeof req.body?.name !== "string" || !req.body.name.trim()) return res.status(400).json({ success: false, message: "Cuisine name is required.", code: "INVALID_CUISINE" }); const cuisine = await prisma.cuisine.create({ data: { name: req.body.name.trim() } }); return res.status(201).json({ success: true, data: cuisine }); } catch (error) { return next(error); }
});

router.delete("/cuisines/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try { const count = await prisma.restaurantCuisine.count({ where: { cuisineId: req.params.id as string } }); if (count) return res.status(409).json({ success: false, message: "Cuisine is still used by restaurants.", code: "CUISINE_IN_USE" }); await prisma.cuisine.delete({ where: { id: req.params.id as string } }); return res.json({ success: true, data: null }); } catch (error) { return next(error); }
});

router.patch("/users/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const userId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    if (userId === req.user!.id) {
      res.status(400).json({ success: false, message: "You cannot change your own account status.", code: "SELF_STATUS_CHANGE" });
      return;
    }
    const status = req.body?.status === "SUSPENDED" ? "SUSPENDED" : req.body?.status === "ACTIVE" ? "ACTIVE" : null;
    if (!status) {
      res.status(400).json({ success: false, message: "A valid account status is required.", code: "INVALID_STATUS" });
      return;
    }
    const user = await prisma.user.update({ where: { id: userId }, data: { status } });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export default router;
