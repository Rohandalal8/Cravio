"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import { logout } from "@/lib/firebase";
import { getApiBaseUrl } from "@/lib/api";

type OrderHistoryItem = {
  id: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  deliveryTask: { status: string } | null;
  restaurant: { id: string; name: string; slug: string };
  items: Array<{
    id: string;
    menuItemId: string;
    price: number;
    name: string;
    quantity: number;
    menuItem: { image: string | null };
  }>;
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, firebaseUser, loading } = useAuth();
  const { addItem } = useCart();
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const orders = useQuery({
    queryKey: ["profile-orders", user?.id],
    enabled: Boolean(user && firebaseUser && !loading),
    queryFn: async () => {
      const token = await firebaseUser!.getIdToken();
      const response = await fetch(`${getApiBaseUrl()}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: OrderHistoryItem[];
        message?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to load order history.");
      }
      return payload?.data ?? [];
    },
  });

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatar, firebaseUser?.photoURL]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleOrderAgain = (order: OrderHistoryItem) => {
    order.items.forEach((item) => {
      addItem({
        id: item.menuItemId,
        name: item.name,
        restaurantId: order.restaurant.id,
        restaurantName: order.restaurant.name,
        slug: order.restaurant.slug,
        image: item.menuItem.image,
        price: item.price,
        quantity: item.quantity,
      });
    });
    router.push("/cart");
  };

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee] text-[#81786c]">
        Loading your profile...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee] px-5 text-center">
        <div>
          <h1 className="font-serif text-4xl text-[#28241f]">Sign in to view your profile</h1>
          <Link href="/login" className="mt-6 inline-flex rounded-full bg-[#273b32] px-5 py-3 text-sm font-bold text-white">
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  const displayName = user.name?.trim() || "Cravio user";
  const avatar =
    user.avatar ??
    firebaseUser?.photoURL ??
    firebaseUser?.providerData.find((provider) => provider.photoURL)?.photoURL ??
    null;
  const firstName = displayName.split(/\s+/)[0];
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-10 text-[#28241f] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[900px]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d97732]">Your account</p>
        <h1 className="mt-3 font-serif text-5xl tracking-[-0.04em]">Profile</h1>
        <p className="mt-4 leading-7 text-[#6f675d]">View your Cravio account details and access preferences.</p>

        <section className="mt-10 overflow-hidden rounded-[1.75rem] border border-[#e8e0d4] bg-white shadow-[0_14px_40px_rgba(40,36,31,0.05)]">
          <div className="bg-[#273b32] px-6 py-8 text-white sm:px-10">
            <div className="flex items-center gap-5">
              {avatar && !avatarLoadFailed ? (
                <img src={avatar} alt={`${displayName}'s profile`} onError={() => setAvatarLoadFailed(true)} className="h-20 w-20 rounded-full border-4 border-white/30 object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f5a524] px-2 text-center text-sm font-bold uppercase tracking-wide text-[#273b32]">
                  {avatar ? firstName : initials}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{displayName}</h2>
                <p className="mt-1 text-sm text-[#dcecdf]">{user.role.replaceAll("_", " ")}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-10">
            <div className="rounded-2xl border border-[#eae3e5] bg-[#fffdf9] p-5">
              <Mail size={20} className="text-[#d97732]" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#a49b8f]">Email address</p>
              <p className="mt-2 break-all font-semibold text-[#4e493f]">{user.email ?? "Not available"}</p>
            </div>
            <div className="rounded-2xl border border-[#eae3e5] bg-[#fffdf9] p-5">
              <ShieldCheck size={20} className="text-[#28734f]" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#a49b8f]">Account status</p>
              <p className="mt-2 font-semibold text-[#28734f]">{user.status}</p>
            </div>
            <div className="rounded-2xl border border-[#eae3e5] bg-[#fffdf9] p-5">
              <UserRound size={20} className="text-[#8b1e3f]" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#a49b8f]">Profile ID</p>
              <p className="mt-2 break-all font-mono text-xs text-[#4e493f]">{user.id}</p>
            </div>
            <div className="rounded-2xl border border-[#eae3e5] bg-[#fffdf9] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a49b8f]">Account type</p>
              <p className="mt-2 font-semibold text-[#4e493f]">{user.role.replaceAll("_", " ")}</p>
              <Link href="/settings" className="mt-4 inline-flex text-sm font-bold text-[#8b1e3f] hover:text-[#64152d]">
                Open settings →
              </Link>
            </div>
          </div>

          <div className="border-t border-[#eae3e5] px-6 py-5 sm:px-10">
            <button type="button" onClick={() => void handleLogout()} className="inline-flex items-center gap-2 rounded-full border border-[#f2cccc] px-5 py-3 text-sm font-bold text-[#b3261e] hover:bg-[#fff6f5]">
              <LogOut size={16} /> Log out
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-[1.75rem] border border-[#e8e0d4] bg-white p-6 shadow-[0_14px_40px_rgba(40,36,31,0.05)] sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d97732]">Your activity</p>
              <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em]">Order history</h2>
            </div>
            <Link href="/restaurants" className="text-sm font-bold text-[#8b1e3f] hover:text-[#64152d]">
              Browse restaurants →
            </Link>
          </div>
          {orders.isLoading ? (
            <p className="mt-6 text-sm text-[#81786c]">Loading your orders...</p>
          ) : orders.isError ? (
            <p className="mt-6 rounded-xl bg-[#fff6f5] p-4 text-sm text-[#8b1f1f]">
              {orders.error instanceof Error ? orders.error.message : "Unable to load order history."}
            </p>
          ) : !orders.data?.length ? (
            <p className="mt-6 rounded-2xl bg-[#fffaf0] p-5 text-sm text-[#81786c]">
              You have not placed any orders yet.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {orders.data.map((order) => (
                <article key={order.id} className="grid gap-4 rounded-2xl border border-[#eee7dc] bg-[#fffdf9] p-4 sm:grid-cols-[72px_1fr_auto] sm:items-center sm:p-5">
                  <div className="h-[72px] w-[72px] overflow-hidden rounded-xl bg-[#f2e7d8]">
                    {order.items[0]?.menuItem.image ? (
                      <img
                        src={order.items[0].menuItem.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl" aria-hidden="true">
                        🍽️
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#28241f]">{order.restaurant.name}</p>
                      <span className="rounded-full bg-[#e8f4eb] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#28734f]">
                        {(order.deliveryTask &&
                        ["RIDER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.deliveryTask.status)
                          ? order.deliveryTask.status
                          : order.status
                        ).replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-[#5f574e]">
                      {order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}
                    </p>
                    <p className="mt-2 text-xs text-[#a49b8f]">
                      {new Date(order.createdAt).toLocaleString()} · Payment {order.paymentStatus.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-[#eee7dc] pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
                    <span className="text-xs font-semibold text-[#81786c]">Total paid</span>
                    <p className="font-bold text-[#273b32]">₹{order.total.toFixed(2)}</p>
                    <button
                      type="button"
                      onClick={() => handleOrderAgain(order)}
                      className="mt-3 rounded-full bg-[#8b1e3f] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#64152d]"
                    >
                      Order again
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
