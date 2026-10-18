import { Router } from "express";

import prisma from "../config/prisma.js";
import { requireAuth, requireCustomer } from "../middleware/auth.js";
import { createOrder, previewCoupon } from "../services/order.service.js";

const router = Router();

router.get("/orders", requireAuth, requireCustomer, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { restaurant: true, items: true },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

router.get("/orders/:id", requireAuth, requireCustomer, async (req, res, next) => {
  try {
    const orderId = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user!.id },
      include: { restaurant: true, items: true, address: true, payment: true },
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found.", code: "ORDER_NOT_FOUND" });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

router.post("/orders", requireAuth, requireCustomer, async (req, res, next) => {
  try {
    const items = Array.isArray(req.body?.items)
      ? req.body.items.map((item: { id?: unknown; quantity?: unknown }) => ({
          menuItemId: typeof item.id === "string" ? item.id : "",
          quantity: Number(item.quantity),
        }))
      : [];
    const address = typeof req.body?.address === "string" ? req.body.address.trim() : "";
    const couponCode = typeof req.body?.couponCode === "string" ? req.body.couponCode : undefined;

    if (!address) {
      res.status(400).json({ success: false, message: "A delivery address is required.", code: "ADDRESS_REQUIRED" });
      return;
    }

    const order = await createOrder({ userId: req.user!.id, items, address, couponCode });

    res.status(201).json({
      success: true,
      data: {
        id: order.id,
        orderNumber: `LB-${order.id.slice(-6).toUpperCase()}`,
        restaurantName: order.restaurant.name,
        items: order.items,
        subtotal: order.subtotal,
        discount: order.discount,
        deliveryFee: order.deliveryFee,
        tax: order.tax,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/orders/coupon/validate", requireAuth, requireCustomer, async (req, res, next) => {
  try {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const subtotal = Number(req.body?.subtotal);
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      res.status(400).json({ success: false, message: "A valid order subtotal is required.", code: "INVALID_SUBTOTAL" });
      return;
    }
    const result = await previewCoupon(req.user!.id, code, subtotal);
    res.status(200).json({ success: true, data: { code: result.coupon.code, discount: result.discount, minimumOrder: result.coupon.minimumOrder } });
  } catch (error) {
    next(error);
  }
});

export default router;
