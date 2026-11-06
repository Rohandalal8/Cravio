"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiFetch, isAccessFailure } from "@/lib/api";
import { RouteShell } from "@/components/route-shell";

type Order = { id: string; status: string; total: number; items: { name: string; quantity: number }[] };
type Restaurant = { name: string; isOpen: boolean; rating: number };

export default function RestaurantDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const load = async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      const [orderData, restaurantData] = await Promise.all([
        apiFetch<Order[]>("/restaurant/orders", token),
        apiFetch<Restaurant>("/restaurant/profile", token),
      ]);
      setOrders(orderData);
      setRestaurant(restaurantData);
    } catch (cause) {
      if (isAccessFailure(cause)) {
        setError("");
        setOrders([]);
        setRestaurant(null);
        await signOut(auth);
        return;
      }
      setError(cause instanceof Error ? cause.message : "Unable to load the restaurant workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(
    () =>
      onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
        setError("");
        if (nextUser) {
          setLoading(true);
          void load(nextUser);
        } else {
          setLoading(false);
        }
      }),
    [],
  );

  const pending = useMemo(() => orders.filter((order) => order.status === "PLACED").length, [orders]);
  const advance = async (order: Order) => {
    const next = order.status === "PLACED" ? "CONFIRMED" : order.status === "CONFIRMED" ? "PREPARING" : order.status === "PREPARING" ? "READY" : null;
    if (!next || !user) return;
    const token = await user.getIdToken();
    await apiFetch(`/restaurant/orders/${order.id}/status`, token, { method: "PATCH", body: JSON.stringify({ status: next }) });
    await load(user);
  };

  if (!authReady || (user && loading)) {
    return <main className="center"><div className="login-card"><span className="eyebrow">Restaurant studio</span><h1>Checking access.</h1><p>Verifying your restaurant-owner account...</p></div></main>;
  }
  if (!user) return <main className="center"><div className="login-card"><span className="eyebrow">Restaurant studio</span><h1>Run every service beautifully.</h1><p>Sign in with your restaurant-owner account to manage orders, menu, and performance.</p><a className="button" href="/login">Open owner sign in</a></div></main>;
  return <RouteShell><main className="main"><header><div><span className="eyebrow">Operations desk</span><h1 className="title">{restaurant?.name ?? "Your restaurant"}</h1></div><span className="status"><i /> {restaurant?.isOpen ? "Open for orders" : "Currently closed"}</span></header>{error && <div className="error">{error}</div>}{loading ? <div className="empty">Loading your workspace...</div> : <><section className="grid"><div className="card"><strong>Today&apos;s orders</strong><div className="value">{orders.length}</div></div><div className="card"><strong>Pending attention</strong><div className="value">{pending}</div></div><div className="card"><strong>Guest rating</strong><div className="value">{restaurant?.rating?.toFixed(1) ?? "—"} <small>/ 5</small></div></div></section><section className="table"><div className="table-head"><h2>Recent orders</h2><span>{orders.length} total</span></div>{orders.length ? orders.map((order) => <div className="row" key={order.id}><span><b>#{order.id.slice(-6).toUpperCase()}</b><small>{order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}</small></span><span className={`badge ${order.status.toLowerCase()}`}>{order.status}</span><span>₹{order.total.toFixed(2)}</span><button className="pill" disabled={!["PLACED", "CONFIRMED", "PREPARING"].includes(order.status)} onClick={() => void advance(order)}>{order.status === "PLACED" ? "Accept" : order.status === "CONFIRMED" ? "Start" : order.status === "PREPARING" ? "Ready" : "Done"}</button></div>) : <div className="empty">No orders yet. New orders will appear here.</div>}</section></>}</main></RouteShell>;
}
