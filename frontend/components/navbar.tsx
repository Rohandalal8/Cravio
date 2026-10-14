"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import { logout } from "@/lib/firebase";

export function Navbar() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { itemCount, openCart } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  async function handleLogout() {
    await logout();
    closeMenu();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#eae3e5] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-5 px-5 py-3.5 sm:px-8 lg:px-12">
        <Link href="/" className="flex shrink-0 items-center gap-3 text-sm font-bold tracking-[0.16em] text-[#8b1e3f] uppercase">
          <img src="/luxe-bites-admin-mark.svg" alt="" className="h-9 w-9 rounded-xl" />
          <span className="hidden sm:inline">LuxeBites</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-[#716a70] md:flex" aria-label="Main navigation">
          <Link href="/" className="transition hover:text-[#8b1e3f]">Home</Link>
          <Link href="/restaurants" className="transition hover:text-[#8b1e3f]">Discover</Link>
          {!loading && user ? (
            <>
              <Link href="/settings" className="transition hover:text-[#8b1e3f]">Settings</Link>
              <Link href="/notifications" className="transition hover:text-[#8b1e3f]">Notifications</Link>
              <button type="button" onClick={handleLogout} className="transition hover:text-[#8b1e3f]">Logout</button>
            </>
          ) : (
            <Link href="/login" className="transition hover:text-[#8b1e3f]">Login</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button type="button" onClick={openCart} className="relative inline-flex h-10 items-center gap-2 rounded-full bg-[#8b1e3f] px-4 text-sm font-semibold text-white transition hover:bg-[#64152d]" aria-label={`Open cart${itemCount ? ` with ${itemCount} items` : ""}`}>
            <ShoppingBag size={17} aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e85d4a] px-1 text-[10px] font-bold">{itemCount}</span> : null}
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eae3e5] text-[#8b1e3f] md:hidden"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            {isMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-[#eae3e5] bg-white px-5 py-5 shadow-lg md:hidden">
          <nav className="flex flex-col gap-1 text-sm font-semibold text-[#716a70]" aria-label="Mobile navigation">
            <Link href="/" onClick={closeMenu} className="rounded-xl px-4 py-3 hover:bg-[#f7e9ed] hover:text-[#8b1e3f]">Home</Link>
            <Link href="/restaurants" onClick={closeMenu} className="rounded-xl px-4 py-3 hover:bg-[#f7e9ed] hover:text-[#8b1e3f]">Discover</Link>
            <button type="button" onClick={() => { closeMenu(); openCart(); }} className="rounded-xl px-4 py-3 text-left hover:bg-[#f7e9ed] hover:text-[#8b1e3f]">Cart {itemCount > 0 ? `(${itemCount})` : ""}</button>
            {!loading && user ? (
              <>
                <Link href="/settings" onClick={closeMenu} className="rounded-xl px-4 py-3 hover:bg-[#f7e9ed] hover:text-[#8b1e3f]">Settings</Link>
                <Link href="/notifications" onClick={closeMenu} className="rounded-xl px-4 py-3 hover:bg-[#f7e9ed] hover:text-[#8b1e3f]">Notifications</Link>
                <button type="button" onClick={handleLogout} className="rounded-xl px-4 py-3 text-left hover:bg-[#f7e9ed] hover:text-[#8b1e3f]">Logout</button>
              </>
            ) : (
              <Link href="/login" onClick={closeMenu} className="rounded-xl px-4 py-3 hover:bg-[#f7e9ed] hover:text-[#8b1e3f]">Login</Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}