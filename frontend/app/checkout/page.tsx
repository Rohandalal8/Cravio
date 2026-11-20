"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email?: string;
    contact?: string;
  };
  theme: { color: string };
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  modal: { ondismiss: () => void };
};

const orderSteps = [
  ["PLACED", "Order placed", "We have received your order."],
  ["CONFIRMED", "Order accepted", "The restaurant has accepted your order."],
  ["PREPARING", "Being prepared", "Your food is being prepared fresh."],
  ["READY", "Ready for pickup", "Your order is ready."],
  ["RIDER_ASSIGNED", "Rider accepted", "A rider is assigned to your order."],
  ["PICKED_UP", "Picked up", "The rider has collected your order."],
  ["OUT_FOR_DELIVERY", "Out for delivery", "Your order is on the way."],
  ["DELIVERED", "Delivered", "Enjoy your meal!"],
] as const;

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpayScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

function CheckoutPageContent() {
  const { items, subtotal, deliveryFee, clearCart } = useCart();
  const { firebaseUser } = useAuth();
  const [customerName, setCustomerName] = useState("Guest user");
  const [address, setAddress] = useState("12 Garden Avenue, Bengaluru");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [trackedStatus, setTrackedStatus] = useState("PLACED");
  const [trackedDeliveryStatus, setTrackedDeliveryStatus] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const discountedSubtotal = Math.max(0, subtotal - (appliedCoupon?.discount ?? 0));
  const estimatedTax = Math.round(discountedSubtotal * 0.05 * 100) / 100;
  const estimatedTotal = discountedSubtotal + deliveryFee + estimatedTax;

  useEffect(() => {
    if (!orderId || !firebaseUser) return;
    let cancelled = false;

    const loadOrderStatus = async () => {
      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"}/orders/${orderId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const payload = (await response.json().catch(() => null)) as {
          data?: { status?: string; deliveryTask?: { status?: string } | null };
          message?: string;
        } | null;
        if (!response.ok) {
          throw new Error(payload?.message ?? "Unable to update order status.");
        }
        if (!cancelled) {
          setTrackedStatus(payload?.data?.status ?? "PLACED");
          setTrackedDeliveryStatus(payload?.data?.deliveryTask?.status ?? null);
          setTrackingError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setTrackingError(
            cause instanceof Error
              ? cause.message
              : "Unable to update order status.",
          );
        }
      }
    };

    void loadOrderStatus();
    const interval = window.setInterval(() => void loadOrderStatus(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [firebaseUser, orderId]);

  const handleApplyCoupon = async () => {
    if (!firebaseUser || !couponCode.trim()) {
      setError("Enter a coupon code.");
      return;
    }
    setIsApplyingCoupon(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"}/orders/coupon/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `****** firebaseUser.getIdToken()}` },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.message ?? "Unable to apply coupon.");
      setAppliedCoupon(payload.data);
      setCouponCode(payload.data.code);
    } catch (applyError) {
      setAppliedCoupon(null);
      setError(applyError instanceof Error ? applyError.message : "Unable to apply coupon.");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  if (!items.length && !orderNumber) {
    return (
      <main className="min-h-screen bg-[#fff8f1] px-5 py-10 text-[#252126] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[700px] rounded-2xl border border-[#eae3e5] bg-white p-10 text-center shadow-[0_16px_40px_rgba(37,33,38,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e85d4a]">Checkout</p>
          <h1 className="mt-4 font-serif text-4xl tracking-[-0.04em]">Your cart is empty.</h1>
          <Link href="/restaurants" className="mt-8 inline-flex rounded-full bg-[#8b1e3f] px-5 py-3 text-sm font-semibold text-white">
            Start shopping
          </Link>
        </div>
      </main>
    );
  }

  const handleSubmit = async () => {
    if (!items.length) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (!firebaseUser) {
        throw new Error("Please sign in before placing an order.");
      }

      const token = await firebaseUser.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"}/orders/payment/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
          address,
          couponCode: appliedCoupon?.code,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message ?? "Unable to place order.");
      }

      await loadRazorpayScript();
      const Razorpay = window.Razorpay;
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!Razorpay || !razorpayKey) {
        throw new Error("Razorpay is not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID to frontend/.env.local.");
      }

      await new Promise<void>((resolve, reject) => {
        const checkout = new Razorpay({
          key: razorpayKey,
          amount: payload.data.amount,
          currency: payload.data.currency,
          name: "Cravio",
          description: `Food order ${payload.data.orderNumber}`,
          order_id: payload.data.razorpayOrderId,
          prefill: {
            name: customerName,
            email: firebaseUser.email ?? undefined,
            contact: firebaseUser.phoneNumber ?? undefined,
          },
          theme: { color: "#8b1e3f" },
          handler: async (payment) => {
            try {
              const verificationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api"}/orders/payment/verify`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  orderId: payload.data.orderId,
                  razorpayOrderId: payment.razorpay_order_id,
                  razorpayPaymentId: payment.razorpay_payment_id,
                  razorpaySignature: payment.razorpay_signature,
                }),
              });
              const verificationPayload = await verificationResponse.json();
              if (!verificationResponse.ok || !verificationPayload?.success) {
                throw new Error(verificationPayload?.message ?? "Payment verification failed.");
              }

              setOrderNumber(verificationPayload.data.orderNumber);
              setOrderId(verificationPayload.data.id);
              clearCart();
              resolve();
            } catch (verificationError) {
              reject(verificationError);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled.")),
          },
        });
        checkout.open();
      });
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Unable to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderNumber) {
    const cancelled = trackedStatus === "CANCELLED";
    const displayStatus =
      trackedDeliveryStatus &&
      ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"].includes(trackedDeliveryStatus)
        ? trackedDeliveryStatus
        : trackedStatus;
    const activeStep = orderSteps.findIndex(([status]) => status === displayStatus);
    return (
      <main className="min-h-screen bg-[#fff8f1] px-5 py-10 text-[#252126] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[700px] rounded-2xl border border-[#eae3e5] bg-white p-6 shadow-[0_16px_40px_rgba(37,33,38,0.06)] sm:p-10">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e85d4a]">
              {cancelled ? "Order cancelled" : "Order tracking"}
            </p>
            <h1 className="mt-4 font-serif text-4xl tracking-[-0.04em]">{orderNumber}</h1>
            <p className="mt-3 text-base leading-7 text-[#665d55]">
              {cancelled
                ? "This order was cancelled by the restaurant."
                : "We will keep this page updated as your order moves forward."}
            </p>
          </div>
          {!cancelled ? (
            <div className="mt-8 space-y-4">
              {orderSteps.map(([status, title, description], index) => {
                const complete = activeStep >= index;
                const current = displayStatus === status;
                return (
                  <div key={status} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${complete ? "bg-[#273b32] text-white" : "bg-[#eee7dc] text-[#a49b8f]"}`}>
                        {complete ? "✓" : index + 1}
                      </span>
                      {index < orderSteps.length - 1 ? <span className={`mt-1 h-8 w-px ${activeStep > index ? "bg-[#273b32]" : "bg-[#eee7dc]"}`} /> : null}
                    </div>
                    <div className="pb-3">
                      <p className={`font-semibold ${current ? "text-[#8b1e3f]" : "text-[#28241f]"}`}>{title}</p>
                      <p className="mt-1 text-sm text-[#81786c]">{description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          {trackingError ? <p className="mt-4 rounded-xl bg-[#fff6f5] p-3 text-sm text-[#8b1f1f]">{trackingError}</p> : null}
          <Link href="/restaurants" className="mt-8 inline-flex w-full justify-center rounded-full bg-[#8b1e3f] px-5 py-3 text-sm font-semibold text-white">
            Order more food
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8f1] px-5 py-10 text-[#252126] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1100px] grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[#eae3e5] bg-white p-6 shadow-[0_16px_40px_rgba(37,33,38,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e85d4a]">Delivery details</p>
          <h1 className="mt-2 font-serif text-4xl tracking-[-0.04em]">Checkout</h1>

          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#4e493f]">Name</span>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="w-full rounded-xl border border-[#ded7cb] bg-[#f8f4ef] px-4 py-3 text-sm outline-none focus:border-[#d97732]" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#4e493f]">Delivery address</span>
              <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={4} className="w-full rounded-xl border border-[#ded7cb] bg-[#f8f4ef] px-4 py-3 text-sm outline-none focus:border-[#d97732]" />
            </label>
          </div>
        </section>

        <aside className="rounded-2xl border border-[#eae3e5] bg-white p-6 shadow-[0_16px_40px_rgba(37,33,38,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e85d4a]">Order summary</p>
          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-[#5b554e]">
                <span>{item.name} × {item.quantity}</span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-3 border-t border-[#efe7dc] pt-4 text-sm text-[#5b554e]">
            <div className="flex items-center justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div>
            <div className="flex items-center justify-between">
              <span>Coupon discount</span>
              <span className="text-[#23804d]">-₹{appliedCoupon?.discount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between"><span>Delivery fee</span><span>₹{deliveryFee}</span></div>
            <div className="flex items-center justify-between"><span>Taxes</span><span>₹{estimatedTax}</span></div>
            <div className="flex items-center justify-between text-base font-bold text-[#273b32]">
              <span>Total</span>
              <span>₹{estimatedTotal}</span>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Coupon code" className="min-w-0 flex-1 rounded-full border border-[#ded7cb] bg-[#f8f4ef] px-4 py-3 text-sm uppercase outline-none focus:border-[#d97732]" disabled={Boolean(appliedCoupon)} />
            {appliedCoupon ? (
              <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="rounded-full border border-[#ded7cb] px-4 py-3 text-sm font-semibold">Remove</button>
            ) : (
              <button type="button" onClick={() => void handleApplyCoupon()} disabled={isApplyingCoupon} className="rounded-full border border-[#8b1e3f] px-4 py-3 text-sm font-semibold text-[#8b1e3f] disabled:opacity-60">{isApplyingCoupon ? "Applying..." : "Apply"}</button>
            )}
          </div>

          {error ? <p className="mt-4 rounded-xl border border-[#f2d4d4] bg-[#fff6f5] p-3 text-sm text-[#8b1f1f]">{error}</p> : null}

          <button type="button" disabled={isSubmitting} onClick={handleSubmit} className="mt-6 inline-flex w-full justify-center rounded-full bg-[#8b1e3f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#64152d] disabled:cursor-not-allowed disabled:opacity-70">
            {isSubmitting ? "Placing order..." : "Place order"}
          </button>
        </aside>
      </div>
    </main>
  );
}

export default CheckoutPageContent;
