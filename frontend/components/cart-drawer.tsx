"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";

import { useCart } from "@/contexts/cart-context";

export function CartDrawer() {
  const { isCartOpen, closeCart, items, itemCount, subtotal, deliveryFee, total, updateQuantity } = useCart();

  return (
    <>
      {isCartOpen ? (
        <button
          type="button"
          aria-label="Close cart"
          className="fixed inset-0 z-50 cursor-default bg-[#252126]/35 backdrop-blur-[2px]"
          onClick={closeCart}
        />
      ) : null}

      <aside
        aria-label="Shopping cart"
        aria-hidden={!isCartOpen}
        className={`fixed right-0 top-0 z-[60] flex h-dvh w-full max-w-[430px] flex-col bg-white shadow-[-18px_0_50px_rgba(37,33,38,0.18)] transition-transform duration-300 ease-out ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-[#eae3e5] px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e85d4a]">Your basket</p>
            <h2 className="mt-1 font-serif text-3xl tracking-[-0.04em] text-[#252126]">Cart <span className="font-sans text-sm font-semibold tracking-normal text-[#716a70]">({itemCount})</span></h2>
          </div>
          <button type="button" onClick={closeCart} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eae3e5] text-[#8b1e3f] transition hover:bg-[#f7e9ed]" aria-label="Close cart">
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        {!items.length ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f7e9ed] text-[#8b1e3f]">
              <ShoppingBag size={26} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-serif text-2xl text-[#252126]">Your cart is waiting</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-[#716a70]">Add your favourite dishes and they’ll show up here.</p>
            <Link href="/restaurants" onClick={closeCart} className="mt-6 rounded-full bg-[#8b1e3f] px-5 py-3 text-sm font-semibold text-white">Explore restaurants</Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              {items.map((item) => (
                <article key={item.id} className="flex gap-3 border-b border-[#eae3e5] pb-4">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#f7e9ed] text-xs font-bold text-[#8b1e3f]" aria-hidden="true">
                      LB
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-[#e85d4a]">{item.restaurantName}</p>
                    <h3 className="mt-1 truncate text-sm font-bold text-[#252126]">{item.name}</h3>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-[#ded7cb] bg-[#f8f4ef]">
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 text-[#273b32]" aria-label={`Decrease ${item.name} quantity`}><Minus size={13} /></button>
                        <span className="min-w-6 text-center text-xs font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 text-[#273b32]" aria-label={`Increase ${item.name} quantity`}><Plus size={13} /></button>
                      </div>
                      <span className="text-sm font-bold text-[#8b1e3f]">₹{item.price * item.quantity}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="border-t border-[#eae3e5] bg-[#f7f4f5] px-6 py-5">
              <div className="space-y-2 text-sm text-[#5b554e]">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div>
                <div className="flex justify-between"><span>Delivery fee</span><span>₹{deliveryFee}</span></div>
                <div className="flex justify-between border-t border-[#eae3e5] pt-3 text-base font-bold text-[#8b1e3f]"><span>Total</span><span>₹{total}</span></div>
              </div>
              <Link href="/checkout" onClick={closeCart} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#8b1e3f] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#64152d]">
                Proceed to checkout <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
