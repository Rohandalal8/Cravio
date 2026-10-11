"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Bike, ChevronRight, LayoutDashboard, LogOut, Menu, Settings, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { ApiError, api } from "@/lib/api";
import { auth } from "@/lib/firebase";

const links = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/deliveries", "Deliveries", Bike],
  ["/history", "History", ChevronRight],
  ["/earnings", "Earnings", Wallet],
  ["/profile", "Profile", Settings],
  ["/notifications", "Notifications", Bell],
] as const;

export type Rider = { id: string; isOnline: boolean; isAvailable: boolean; rating: number; totalDeliveries: number; totalEarnings: number; vehicleType: string; vehicleNumber: string; user: { name: string | null; email: string | null; phone: string | null; avatar: string | null } };

export default function RiderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [rider, setRider] = useState<Rider | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    void api<Rider>("/rider/me").then(setRider).catch((cause: unknown) => {
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
        router.replace(cause.status === 403 ? "/unauthorized" : "/login");
        return;
      }
      setLoadError(cause instanceof Error ? cause.message : "Unable to load your rider profile.");
    });
  }, [router]);
  async function toggle() {
    if (!rider || busy) return;
    setBusy(true);
    try {
      const next = await api<Rider>("/rider/availability", { method: "PATCH", body: JSON.stringify({ isOnline: !rider.isOnline }) });
      setRider({ ...next, user: next.user ?? rider.user });
    } finally { setBusy(false); }
  }
  async function logout() { if (auth) await signOut(auth); window.localStorage.removeItem("luxebites-token"); router.replace("/login"); }
  return <div className="app-shell">
    <aside className={open ? "sidebar open" : "sidebar"}><div className="brand"><img src="/luxe-bites-admin-mark.svg" alt="" /> <span>Luxebites<small>Delivery partner</small></span><button className="close-menu" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
      <nav aria-label="Main navigation">{links.map(([href, label, Icon]) => <Link key={href} href={href} className={pathname.startsWith(href) ? "nav-link active" : "nav-link"} onClick={() => setOpen(false)}><Icon size={19} />{label}</Link>)}</nav>
      <button className={rider?.isOnline ? "online-pill" : "online-pill offline"} onClick={() => void toggle()} disabled={busy}><i />{rider?.isOnline ? "You are online" : "Go online"}</button>
      <div className="sidebar-user"><div className="avatar">{rider?.user.name?.[0] ?? "R"}</div><div><strong>{rider?.user.name ?? "Rider"}</strong><small>{rider?.vehicleType ?? "Delivery partner"}</small></div><button onClick={() => void logout()} aria-label="Log out"><LogOut size={17} /></button></div>
    </aside>
    {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Close menu" />}
    <main className="content"><header className="topbar"><button className="menu-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button><div><span className="kicker">Rider workspace</span><h1>{links.find(([href]) => pathname.startsWith(href))?.[1] ?? "Dashboard"}</h1></div><div className="top-actions"><Link href="/notifications" aria-label="Notifications"><Bell size={20} /></Link><button className="status-button" onClick={() => void toggle()}><i className={rider?.isOnline ? "dot" : "dot muted"} />{rider?.isOnline ? "Online" : "Offline"}</button></div></header>{loadError ? <div className="state error-state"><strong>{loadError}</strong><p>Ask an administrator to approve and provision your rider profile, then try again.</p></div> : rider ? children : <div className="state"><div className="spinner" /><p>Loading your rider profile...</p></div>}</main>
  </div>;
}
