import { ApplicationStatus, OrderStatus, UserRole } from "@prisma/client";
import { Router } from "express";

import prisma from "../config/prisma.js";
import { requireAuth, requireRestaurantOwner } from "../middleware/auth.js";
import { requireCustomer } from "../middleware/auth.js";

const router = Router();
const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PLACED: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY],
};

async function ownedRestaurant(ownerId: string) {
  return prisma.restaurant.findFirst({
    where: { ownerId },
    include: { menuItems: { orderBy: { createdAt: "desc" } } },
  });
}

router.get(
  "/profile",
  requireAuth,
  requireRestaurantOwner,
  async (req, res, next) => {
    try {
      const restaurant = await ownedRestaurant(req.user!.id);
      if (!restaurant) {
        res
          .status(404)
          .json({
            success: false,
            message: "No restaurant is linked to this owner.",
            code: "RESTAURANT_NOT_FOUND",
          });
        return;
      }
      res.status(200).json({ success: true, data: restaurant });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/profile",
  requireAuth,
  requireRestaurantOwner,
  async (req, res, next) => {
    try {
      const restaurant = await prisma.restaurant.findFirst({
        where: { ownerId: req.user!.id },
      });
      if (!restaurant) {
        res
          .status(404)
          .json({
            success: false,
            message: "No restaurant is linked to this owner.",
            code: "RESTAURANT_NOT_FOUND",
          });
        return;
      }
      const allowed = [
        "name",
        "description",
        "phone",
        "email",
        "address",
        "city",
        "state",
        "pincode",
        "deliveryTime",
        "minimumOrder",
        "isOpen",
        "coverImage",
      ] as const;
      const data = Object.fromEntries(
        allowed
          .filter((key) => req.body?.[key] !== undefined)
          .map((key) => [key, req.body[key]]),
      );
      const updated = await prisma.restaurant.update({
        where: { id: restaurant.id },
        data,
      });
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/menu-items",
  requireAuth,
  requireRestaurantOwner,
  async (req, res, next) => {
    try {
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const description =
        typeof req.body?.description === "string"
          ? req.body.description.trim()
          : "";
      const categoryName =
        typeof req.body?.category === "string"
          ? req.body.category.trim()
          : "General";
      const price = Number(req.body?.price);
      const image =
        typeof req.body?.image === "string" ? req.body.image.trim() : "";
      const isVeg = req.body?.isVeg !== false;
      if (!name || !Number.isFinite(price) || price < 0 || !categoryName) {
        res
          .status(400)
          .json({
            success: false,
            message: "Dish name, category, and a valid price are required.",
            code: "INVALID_MENU_ITEM",
          });
        return;
      }
      const restaurant = await prisma.restaurant.findFirst({
        where: { ownerId: req.user!.id },
        select: { id: true },
      });
      if (!restaurant) {
        res
          .status(404)
          .json({
            success: false,
            message: "No restaurant is linked to this owner.",
            code: "RESTAURANT_NOT_FOUND",
          });
        return;
      }
      const category = await prisma.menuCategory.upsert({
        where: {
          restaurantId_name: {
            restaurantId: restaurant.id,
            name: categoryName,
          },
        },
        update: {},
        create: {
          restaurantId: restaurant.id,
          name: categoryName,
          displayOrder: 0,
        },
      });
      const item = await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name,
          description: description || null,
          price,
          image: image || null,
          isVeg,
        },
      });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/reviews",
  requireAuth,
  requireRestaurantOwner,
  async (req, res, next) => {
    try {
      const reviews = await prisma.review.findMany({
        where: { restaurant: { ownerId: req.user!.id } },
        include: { user: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.status(200).json({ success: true, data: reviews });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/analytics",
  requireAuth,
  requireRestaurantOwner,
  async (req, res, next) => {
    try {
      const restaurant = await prisma.restaurant.findFirst({
        where: { ownerId: req.user!.id },
        select: { id: true, rating: true, reviewCount: true },
      });
      if (!restaurant) {
        res
          .status(404)
          .json({
            success: false,
            message: "No restaurant is linked to this owner.",
            code: "RESTAURANT_NOT_FOUND",
          });
        return;
      }
      const [orders, revenue, popularItems] = await Promise.all([
        prisma.order.count({ where: { restaurantId: restaurant.id } }),
        prisma.order.aggregate({
          where: {
            restaurantId: restaurant.id,
            status: { not: OrderStatus.CANCELLED },
          },
          _sum: { total: true },
        }),
        prisma.orderItem.groupBy({
          by: ["menuItemId", "name"],
          where: { order: { restaurantId: restaurant.id } },
          _sum: { quantity: true, subtotal: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 5,
        }),
      ]);
      res
        .status(200)
        .json({
          success: true,
          data: {
            orders,
            revenue: revenue._sum.total ?? 0,
            rating: restaurant.rating,
            reviewCount: restaurant.reviewCount,
            popularItems,
          },
        });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/notifications",
  requireAuth,
  requireRestaurantOwner,
  async (req, res, next) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { restaurant: { ownerId: req.user!.id } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      res.status(200).json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/notifications/read-all",
  requireAuth,
  requireRestaurantOwner,
  async (req, res, next) => {
    try {
      await prisma.notification.updateMany({
        where: { restaurant: { ownerId: req.user!.id }, isRead: false },
        data: { isRead: true },
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

router.post("/apply", requireAuth, requireCustomer, async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const phone =
      typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const address =
      typeof req.body?.address === "string" ? req.body.address.trim() : "";
    if (!name || !phone || !email || !address) {
      res
        .status(400)
        .json({
          success: false,
          message: "Complete restaurant application details are required.",
          code: "INVALID_APPLICATION",
        });
      return;
    }
    const existing = await prisma.restaurantApplication.findFirst({
      where: {
        applicantId: req.user!.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });
    if (existing) {
      res
        .status(409)
        .json({
          success: false,
          message:
            existing.status === "APPROVED"
              ? "Your restaurant owner application is already approved."
              : "You already have an application under review.",
          code: "APPLICATION_EXISTS",
        });
      return;
    }
    const application = await prisma.restaurantApplication.create({
      data: { applicantId: req.user!.id, name, phone, email, address },
    });
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/orders",
  requireAuth,
  requireRestaurantOwner,
  async (req, res, next) => {
    try {
      const orders = await prisma.order.findMany({
        where: { restaurant: { ownerId: req.user!.id } },
        include: { restaurant: true, items: true, address: true },
        orderBy: { createdAt: "desc" },
      });
      res.status(200).json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/orders/:id/status",
  requireAuth,
  requireRestaurantOwner,
  async (req, res, next) => {
    try {
      const orderId =
        typeof req.params.id === "string" ? req.params.id : req.params.id[0];
      const status = req.body?.status as OrderStatus;
      if (!Object.values(OrderStatus).includes(status)) {
        res
          .status(400)
          .json({
            success: false,
            message: "Invalid order status.",
            code: "INVALID_STATUS",
          });
        return;
      }

      const order = await prisma.order.findFirst({
        where: { id: orderId, restaurant: { ownerId: req.user!.id } },
      });
      if (!order) {
        res
          .status(404)
          .json({
            success: false,
            message: "Order not found.",
            code: "ORDER_NOT_FOUND",
          });
        return;
      }

      if (!transitions[order.status]?.includes(status)) {
        res
          .status(409)
          .json({
            success: false,
            message: `Cannot move an order from ${order.status} to ${status}.`,
            code: "INVALID_STATUS_TRANSITION",
          });
        return;
      }

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status },
      });
      res.status(200).json({ success: true, data: updatedOrder });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
