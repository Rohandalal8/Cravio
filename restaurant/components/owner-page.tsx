"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import { RouteShell } from "@/components/route-shell";

type Kind = "orders" | "menu" | "reviews" | "analytics" | "notifications" | "restaurant";
type Order = { id: string; status: string; total: number; items: { name: string; quantity: number }[] };
type Profile = { name: string; description?: string; isOpen: boolean; rating: number; reviewCount: number; menuItems: { id: string; name: string; price: number; isAvailable: boolean }[] };
type Review = { id: string; rating: number; comment?: string; user: { name?: string | null } };
type Analytics = { orders: number; revenue: number; rating: number; reviewCount: number; popularItems: { name: string; _sum: { quantity: number | null } }[] };
type Notification = { id: string; title: string; message: string; isRead: boolean };

const labels: Record<Kind, [string, string]> = {
  orders: ["Order desk", "Orders"],
  menu: ["Menu studio", "Menu"],
  reviews: ["Guest feedback", "Reviews"],
  analytics: ["Performance", "Analytics"],
  notifications: ["Stay informed", "Notifications"],
  restaurant: ["Restaurant profile", "Restaurant"],
};

export function OwnerPage({ kind }: { kind: Kind }) {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [togglingOpen, setTogglingOpen] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    if (!nextUser) { setLoading(false); return; }
    void (async () => {
      try {
        const token = await nextUser.getIdToken();
        const path = kind === "restaurant" || kind === "menu" ? "/restaurant/profile" : `/restaurant/${kind}`;
        setData(await apiFetch(path, token));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load this workspace.");
      } finally {
        setLoading(false);
      }
    })();
  }), [kind, refresh]);

  async function toggleRestaurantOpen() {
    if (!user || !data || togglingOpen) return;
    const profile = data as Profile;
    setTogglingOpen(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const updated = await apiFetch<Profile>("/restaurant/profile", token, {
        method: "PATCH",
        body: JSON.stringify({ isOpen: !profile.isOpen }),
      });
      setData((current: Profile | null) => current ? { ...current, ...updated } : updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update restaurant status.");
    } finally {
      setTogglingOpen(false);
    }
  }

  if (!user) return <main className="center"><div className="login-card"><span className="eyebrow">Owner access</span><h1>Sign in to continue.</h1><p>Use an active restaurant-owner account to access this workspace.</p><a className="button" href="/login">Open owner sign in</a></div></main>;
  const [eyebrow, title] = labels[kind];
  return <RouteShell><main className="main"><header><div><span className="eyebrow">{eyebrow}</span><h1 className="title">{title}</h1></div></header>{loading ? <div className="empty">Loading live restaurant data...</div> : error ? <div className="error">{error}</div> : <WorkspaceContent kind={kind} data={data} onRefresh={() => setRefresh((value) => value + 1)} onToggleOpen={() => void toggleRestaurantOpen()} togglingOpen={togglingOpen} />}</main></RouteShell>;
}

function WorkspaceContent({ kind, data, onRefresh, onToggleOpen, togglingOpen }: { kind: Kind; data: unknown; onRefresh: () => void; onToggleOpen: () => void; togglingOpen: boolean }) {
  if (kind === "orders") {
    const orders = data as Order[];
    return <section className="table"><div className="table-head"><h2>Live orders</h2><span>{orders.length} total</span></div>{orders.length ? orders.map((order) => <div className="row" key={order.id}><span><b>#{order.id.slice(-6).toUpperCase()}</b><small>{order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}</small></span><span className={`badge ${order.status.toLowerCase()}`}>{order.status}</span><span>₹{order.total.toFixed(2)}</span><a className="pill" href={`/orders/${order.id}`}>Details</a></div>) : <div className="empty">No orders have arrived yet.</div>}</section>;
  }
  if (kind === "menu" || kind === "restaurant") {
    const profile = data as Profile;
    return <><section className="grid"><div className="card"><strong>Restaurant</strong><div className="value">{profile.name}</div></div><div className="card"><strong>Status</strong><div className="value">{profile.isOpen ? "Open" : "Closed"}</div><button className="button" onClick={onToggleOpen} disabled={togglingOpen}>{togglingOpen ? "Saving..." : profile.isOpen ? "Close restaurant" : "Open restaurant"}</button></div><div className="card"><strong>Rating</strong><div className="value">{profile.rating.toFixed(1)} <small>/ 5</small></div></div></section><section className="table"><div className="table-head"><div><h2>{kind === "menu" ? "Menu items" : "Profile overview"}</h2>{kind === "menu" && <span>{profile.menuItems?.length ?? 0} items</span>}</div>{kind === "menu" && <a className="button" href="/menu/items">+ Add dish</a>}</div>{kind === "menu" && profile.menuItems?.map((item) => <div className="row" key={item.id}><span><b>{item.name}</b><small>{item.isAvailable ? "Available" : "Unavailable"}</small></span><span>{item.isAvailable ? "Live" : "Paused"}</span><span>₹{item.price.toFixed(2)}</span><button className="pill" onClick={onRefresh}>Refresh</button></div>)}{kind === "menu" && !profile.menuItems?.length && <div className="empty">No menu items have been added yet. Click <a href="/menu/items">Add dish</a> to create your first dish.</div>}{kind === "restaurant" && <div className="empty"><p>{profile.description ?? "Add a description to tell guests what makes your restaurant special."}</p><a className="button" href="/restaurant/edit">Edit profile</a></div>}</section></>;
  }
  if (kind === "reviews") {
    const reviews = data as Review[];
    return <section className="table"><div className="table-head"><h2>Guest reviews</h2><span>{reviews.length} reviews</span></div>{reviews.length ? reviews.map((review) => <div className="row review-row" key={review.id}><span><b>{review.user.name ?? "Guest"}</b><small>{review.comment ?? "No written comment."}</small></span><span className="rating">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><span>{review.rating}/5</span></div>) : <div className="empty">No reviews yet.</div>}</section>;
  }
  if (kind === "analytics") {
    const analytics = data as Analytics;
    return <section className="grid"><div className="card"><strong>Total orders</strong><div className="value">{analytics.orders}</div></div><div className="card"><strong>Revenue</strong><div className="value">₹{analytics.revenue.toFixed(2)}</div></div><div className="card"><strong>Guest rating</strong><div className="value">{analytics.rating.toFixed(1)} <small>({analytics.reviewCount})</small></div></div></section>;
  }
  const notifications = data as Notification[];
  return <section className="table"><div className="table-head"><h2>Notifications</h2><span>{notifications.filter((item) => !item.isRead).length} unread</span></div>{notifications.length ? notifications.map((item) => <div className="row notification-row" key={item.id}><span><b>{item.title}</b><small>{item.message}</small></span><span>{item.isRead ? "Read" : "Unread"}</span></div>) : <div className="empty">You are all caught up.</div>}</section>;
}
