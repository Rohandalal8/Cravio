import { OrderStatus, Prisma } from "@prisma/client";
import crypto from "node:crypto";
import Razorpay from "razorpay";

import { env } from "../config/env.js";
import prisma from "../config/prisma.js";

type CheckoutItem = {
  menuItemId: string;
  quantity: number;
};

type CreateOrderInput = {
  userId: string;
  items: CheckoutItem[];
  address: string;
  couponCode?: string;
};

type VerifyPaymentInput = {
  userId: string;
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

function getRazorpayClient() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw Object.assign(new Error("Razorpay is not configured on the server."), {
      statusCode: 503,
      code: "RAZORPAY_NOT_CONFIGURED",
    });
  }

  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

function couponError(message: string, code: string) {
  return Object.assign(new Error(message), { statusCode: 400, code });
}

async function findUsableCoupon(transaction: Prisma.TransactionClient, userId: string, code: string, subtotal: number) {
  const coupon = await transaction.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.isActive) throw couponError("This coupon is invalid or inactive.", "INVALID_COUPON");
  if (coupon.expiresAt && coupon.expiresAt <= new Date()) throw couponError("This coupon has expired.", "COUPON_EXPIRED");
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw couponError("This coupon has reached its usage limit.", "COUPON_LIMIT_REACHED");
  if (subtotal < coupon.minimumOrder) throw couponError(`This coupon requires a minimum order of ₹${coupon.minimumOrder}.`, "MINIMUM_ORDER_NOT_MET");
  if (await transaction.couponUsage.findFirst({ where: { couponId: coupon.id, userId } })) {
    throw couponError("You have already used this coupon.", "COUPON_ALREADY_USED");
  }
  const rawDiscount = coupon.discountType === "PERCENTAGE" ? subtotal * coupon.discountValue / 100 : coupon.discountValue;
  const discount = Math.min(subtotal, coupon.maximumDiscount === null ? rawDiscount : Math.min(rawDiscount, coupon.maximumDiscount));
  return { coupon, discount: Math.round(discount * 100) / 100 };
}

export async function previewCoupon(userId: string, code: string, subtotal: number) {
  if (!code.trim()) throw couponError("Enter a coupon code.", "COUPON_REQUIRED");
  return findUsableCoupon(prisma, userId, code, subtotal);
}

export async function createOrder(input: CreateOrderInput) {
  if (!input.items.length) {
    throw Object.assign(new Error("Cart is empty."), { statusCode: 400, code: "EMPTY_CART" });
  }

  const quantities = new Map<string, number>();
  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw Object.assign(new Error("Each item quantity must be between 1 and 50."), { statusCode: 400, code: "INVALID_QUANTITY" });
    }
    quantities.set(item.menuItemId, (quantities.get(item.menuItemId) ?? 0) + item.quantity);
  }

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: [...quantities.keys()] }, isAvailable: true },
    include: { restaurant: true },
  });

  if (menuItems.length !== quantities.size) {
    throw Object.assign(new Error("One or more menu items are unavailable."), { statusCode: 409, code: "ITEM_UNAVAILABLE" });
  }

  const restaurantIds = new Set(menuItems.map((item) => item.restaurantId));
  if (restaurantIds.size !== 1) {
    throw Object.assign(new Error("An order can contain items from one restaurant only."), { statusCode: 400, code: "MULTIPLE_RESTAURANTS" });
  }

  const restaurant = menuItems[0].restaurant;
  if (!restaurant.isActive || !restaurant.isOpen) {
    throw Object.assign(new Error("This restaurant is currently unavailable."), { statusCode: 409, code: "RESTAURANT_UNAVAILABLE" });
  }

  const subtotal = menuItems.reduce((sum, item) => {
    const unitPrice = item.discountPrice ?? item.price;
    return sum + unitPrice * (quantities.get(item.id) ?? 0);
  }, 0);
  const deliveryFee = 49;
  const couponCode = typeof input.couponCode === "string" ? input.couponCode.trim() : "";

  return prisma.$transaction(async (transaction) => {
    const appliedCoupon = couponCode ? await findUsableCoupon(transaction, input.userId, couponCode, subtotal) : null;
    const discount = appliedCoupon?.discount ?? 0;
    const tax = Math.round((subtotal - discount) * 0.05 * 100) / 100;
    const total = Math.max(0, subtotal - discount + deliveryFee + tax);
    const address = await transaction.address.create({
      data: {
        userId: input.userId,
        label: "Checkout address",
        fullAddress: input.address.trim(),
        city: restaurant.city ?? "Unknown",
        state: restaurant.state ?? "Unknown",
        pincode: restaurant.pincode ?? "000000",
      },
    });

    const order = await transaction.order.create({
      data: {
        userId: input.userId,
        restaurantId: restaurant.id,
        addressId: address.id,
        subtotal,
        discount,
        deliveryFee,
        tax,
        total,
        status: OrderStatus.PLACED,
        payment: {
          create: {
            amount: total,
            currency: "INR",
          },
        },
        items: {
          create: menuItems.map((item) => {
            const quantity = quantities.get(item.id) ?? 0;
            const price = item.discountPrice ?? item.price;
            return {
              menuItemId: item.id,
              name: item.name,
              price,
              quantity,
              subtotal: price * quantity,
            };
          }),
        },
      },
      include: { restaurant: true, items: true, address: true },
    });
    if (appliedCoupon) {
      const updated = await transaction.coupon.updateMany({
        where: {
          id: appliedCoupon.coupon.id,
          isActive: true,
          ...(appliedCoupon.coupon.usageLimit === null ? {} : { usedCount: { lt: appliedCoupon.coupon.usageLimit } }),
        },
        data: { usedCount: { increment: 1 } },
      });
      if (updated.count !== 1) throw couponError("This coupon is no longer available.", "COUPON_LIMIT_REACHED");
      await transaction.couponUsage.create({ data: { couponId: appliedCoupon.coupon.id, userId: input.userId, orderId: order.id } });
    }
    return order;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createRazorpayOrder(input: CreateOrderInput) {
  const razorpay = getRazorpayClient();
  const order = await createOrder(input);
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(order.total * 100),
    currency: "INR",
    receipt: order.id,
    notes: {
      cravioOrderId: order.id,
      userId: input.userId,
    },
  });

  await prisma.payment.update({
    where: { orderId: order.id },
    data: { razorpayOrderId: razorpayOrder.id },
  });

  return { order, razorpayOrder };
}

export async function verifyPayment(input: VerifyPaymentInput) {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw Object.assign(new Error("Razorpay is not configured on the server."), {
      statusCode: 503,
      code: "RAZORPAY_NOT_CONFIGURED",
    });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      orderId: input.orderId,
      order: { userId: input.userId },
    },
    include: { order: true },
  });

  if (!payment || payment.razorpayOrderId !== input.razorpayOrderId) {
    throw Object.assign(new Error("Payment order does not match this checkout."), {
      statusCode: 400,
      code: "PAYMENT_ORDER_MISMATCH",
    });
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");
  const signaturesMatch =
    expectedSignature.length === input.razorpaySignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(input.razorpaySignature),
    );

  if (!signaturesMatch) {
    throw Object.assign(new Error("Unable to verify Razorpay payment."), {
      statusCode: 400,
      code: "PAYMENT_SIGNATURE_INVALID",
    });
  }

  const updatedOrder = await prisma.$transaction(async (transaction) => {
    await transaction.payment.update({
      where: { orderId: input.orderId },
      data: {
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
        status: "PAID",
      },
    });

    return transaction.order.update({
      where: { id: input.orderId },
      data: { paymentStatus: "PAID" },
      include: { restaurant: true, items: true, payment: true },
    });
  });

  return updatedOrder;
}
