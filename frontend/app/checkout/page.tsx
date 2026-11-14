"use client";

import Link from "next/link";
import { useState } from "react";

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
  const { items, subtotal, deliveryFee, total, clearCart } = useCart();
  const { firebaseUser } = useAuth();
  const [customerName, setCustomerName] = useState("Guest user");
  const [address, setAddress] = useState("12 Garden Avenue, Bengaluru");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const discountedSubtotal = Math.max(0, subtotal - (appliedCoupon?.discount ?? 0));
  const estimatedTax = Math.round(discountedSubtotal * 0.05 * 100) / 100;
  const estimatedTotal = discountedSubtotal + deliveryFee + estimatedTax;

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
    return (
      <main className="min-h-screen bg-[#fff8f1] px-5 py-10 text-[#252126] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[700px] rounded-2xl border border-[#eae3e5] bg-white p-10 text-center shadow-[0_16px_40px_rgba(37,33,38,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e85d4a]">Order confirmed</p>
          <h1 className="mt-4 font-serif text-4xl tracking-[-0.04em]">{orderNumber}</h1>
          <p className="mt-3 text-base leading-7 text-[#665d55]">Your food is being prepared and your rider is on the way.</p>
          <Link href="/restaurants" className="mt-8 inline-flex rounded-full bg-[#8b1e3f] px-5 py-3 text-sm font-semibold text-white">
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
            <div className="flex items-center justify-between text-base font-bold text-[#273b32]">
              <span>Total</span>
              <span>₹{appliedCoupon ? estimatedTotal : total}</span>
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
