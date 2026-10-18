"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from "firebase/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, ChevronLeft, ChevronRight, ClipboardList, Coffee, CreditCard, LayoutDashboard, LogOut, Menu, Search, Settings, ShieldCheck, Store, Ticket, Trash2, Users, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { auth, googleProvider } from "@/lib/firebase";
import { apiRequest } from "@/lib/api";

type Admin = { id: string; name: string | null; email: string | null; avatar: string | null; role: "ADMIN"; status: "ACTIVE" | "SUSPENDED" };
type Dashboard = { counts: { users: number; restaurants: number; riders: number; orders: number; activeDeliveries: number; pendingApplications: number }; recentOrders: Array<{ id: string; total: number; status: string; createdAt: string; user: { name: string | null; email: string | null }; restaurant: { name: string }; payment: { status: string } | null }>; recentUsers: Array<{ id: string; name: string | null; email: string | null; role: string; status: string; createdAt: string }>; orderStatus: Array<{ status: string; _count: { _all: number } }> };
type Row = Record<string, unknown>;

const nav = [
  ["dashboard", "Overview", LayoutDashboard], ["users", "Users", Users], ["restaurants", "Restaurants", Store],
  ["applications", "Applications", ClipboardList], ["orders", "Orders", ClipboardList], ["payments", "Payments", CreditCard],
  ["reviews", "Reviews", ShieldCheck], ["coupons", "Coupons", Ticket], ["cuisines", "Cuisines", Coffee], ["analytics", "Analytics", BarChart3], ["settings", "Settings", Settings],
] as const;

function Login({ error, setError }: { error: string; setError: (value: string) => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  const login = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { await signInWithEmailAndPassword(auth, email, password); } catch (cause) { setError(cause instanceof Error && cause.message.includes("invalid-credential") ? "Invalid email or password." : "Unable to sign in. Check your account and try again."); } finally { setBusy(false); } };
  const google = async () => { setBusy(true); setError(""); try { await signInWithPopup(auth, googleProvider); } catch { setError("Google sign-in is unavailable for this Firebase project."); } finally { setBusy(false); } };
  return <main className="login-shell"><div className="login-card"><div className="brand-mark">L<span>✦</span></div><p className="kicker">LUXEBITES / CONTROL CENTER</p><h1>Welcome back.</h1><p className="muted">Sign in with your administrator account to manage the platform.</p><form onSubmit={login} className="stack"><label>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@luxebites.com" /></label><label>Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>{error && <div className="error">{error}</div>}<button className="primary full" disabled={busy}>{busy ? "Signing in..." : "Sign in securely"}</button></form><div className="or"><span>or</span></div><button className="secondary full" onClick={() => void google()} disabled={busy}>Continue with Google</button><p className="fine-print">Access is restricted to active ADMIN accounts. Your Firebase session is verified by the Luxebites API.</p></div></main>;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) { return <div className="stat-card"><span className={`stat-icon ${accent}`}><BarChart3 size={17} /></span><div><p>{label}</p><strong>{value.toLocaleString()}</strong></div></div>; }
function Empty({ text }: { text: string }) { return <div className="empty">{text}</div>; }

export default function AdminApp() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null); const [authError, setAuthError] = useState(""); const [section, setSection] = useState("dashboard"); const [collapsed, setCollapsed] = useState(false); const [mobileOpen, setMobileOpen] = useState(false); const queryClient = useQueryClient();
  useEffect(() => onAuthStateChanged(auth, setFirebaseUser), []);
  const profile = useQuery({
    queryKey: ["admin-me", firebaseUser?.uid],
    queryFn: async () => {
      await apiRequest("/auth/sync", {
        method: "POST",
        body: JSON.stringify({
          name: firebaseUser?.displayName,
          email: firebaseUser?.email,
          avatar: firebaseUser?.photoURL,
        }),
      });
      return apiRequest<Admin>("/auth/admin/me");
    },
    enabled: Boolean(firebaseUser),
    retry: false,
  });
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => apiRequest<Dashboard>("/admin/dashboard"), enabled: Boolean(profile.data), refetchInterval: 60000 });
  const resourcePath = section === "applications" ? "/admin/applications" : `/admin/${section}`;
  const resource = useQuery({ queryKey: [section], queryFn: () => apiRequest<unknown>(resourcePath), enabled: Boolean(profile.data) && section !== "dashboard" && section !== "analytics" && section !== "settings" });
  const action = useMutation({ mutationFn: ({ path, method, body }: { path: string; method: string; body?: unknown }) => apiRequest(path, { method, body: body ? JSON.stringify(body) : undefined }), onSuccess: () => { void queryClient.invalidateQueries(); } });
  if (!firebaseUser) return <Login error={authError} setError={setAuthError} />;
  if (profile.isLoading) return <div className="center-state"><div className="spinner" />Verifying administrator access...</div>;
  if (profile.isError || !profile.data) return <div className="center-state"><div className="error-card"><ShieldCheck size={30} /><h2>Administrator access required</h2><p>{profile.error instanceof Error ? profile.error.message : "This account is not authorized."}</p><button className="secondary" onClick={() => void signOut(auth)}>Sign out</button></div></div>;
  const title = nav.find(([id]) => id === section)?.[1] ?? "Overview";
  const closeMobile = () => setMobileOpen(false);
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}><div className="sidebar-brand"><span className="brand-mark small">L<span>✦</span></span>{!collapsed && <span>luxebites</span>}<button className="icon-button mobile-close" onClick={closeMobile}><X size={18} /></button></div><nav>{nav.map(([id, label, Icon]) => <button key={id} className={section === id ? "nav-item active" : "nav-item"} onClick={() => { setSection(id); closeMobile(); }}><Icon size={18} /><span>{label}</span></button>)}</nav><div className="sidebar-footer">{!collapsed && <div className="sidebar-tip"><span className="live-dot" />All systems operational</div>}<button className="nav-item" onClick={() => void signOut(auth)}><LogOut size={18} /><span>Sign out</span></button></div></aside>
    <div className="main-shell"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={21} /></button><button className="icon-button collapse" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}</button><div className="topbar-title"><span className="kicker">ADMINISTRATION</span><h2>{title}</h2></div><div className="topbar-actions"><div className="admin-chip">{profile.data.avatar ? <Image src={profile.data.avatar} alt="" width={34} height={34} /> : <span>{(profile.data.name ?? "A").slice(0, 1).toUpperCase()}</span>}<div><strong>{profile.data.name ?? "Administrator"}</strong><small>ADMIN</small></div></div></div></header><main className="page-content">
      {section === "dashboard" && <DashboardView data={dashboard.data} loading={dashboard.isLoading} />}
      {section === "analytics" && <AnalyticsView data={dashboard.data} />}
      {section === "settings" && <SettingsView admin={profile.data} />}
      {!["dashboard", "analytics", "settings"].includes(section) && <ResourceView section={section} data={resource.data} loading={resource.isLoading} action={action.mutate} />}
    </main></div>
  </div>;
}

function DashboardView({ data, loading }: { data?: Dashboard; loading: boolean }) {
  if (loading || !data) return <div className="loading-grid">{[1, 2, 3, 4].map((i) => <div className="skeleton" key={i} />)}</div>;
  const chartData = data.orderStatus.map((item) => ({ name: item.status.replaceAll("_", " "), orders: item._count._all }));
  return <><div className="page-heading"><div><p className="kicker">SUNDAY, OCTOBER 04, 2026</p><h1>Good evening, admin.</h1><p className="muted">Here&apos;s what&apos;s happening across Luxebites today.</p></div><button className="secondary" onClick={() => window.location.reload()}>Refresh data</button></div><div className="stats-grid"><StatCard label="Total users" value={data.counts.users} accent="purple" /><StatCard label="Restaurants" value={data.counts.restaurants} accent="orange" /><StatCard label="Riders" value={data.counts.riders} accent="green" /><StatCard label="Total orders" value={data.counts.orders} accent="blue" /><StatCard label="Active deliveries" value={data.counts.activeDeliveries} accent="pink" /><StatCard label="Pending applications" value={data.counts.pendingApplications} accent="yellow" /></div><div className="dashboard-grid"><section className="card chart-card"><div className="card-heading"><div><h3>Order activity</h3><p className="muted">Current distribution by status</p></div><span className="chart-label">LIVE</span></div><ResponsiveContainer width="100%" height={250}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f4" /><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} width={30} /><Tooltip /><Bar dataKey="orders" fill="#6d5dfc" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></section><section className="card"><div className="card-heading"><div><h3>Recent users</h3><p className="muted">Latest registrations</p></div><Users size={18} className="muted" /></div>{data.recentUsers.slice(0, 5).map((user) => <div className="list-row" key={user.id}><span className="avatar">{(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}</span><div className="row-grow"><strong>{user.name ?? "Unnamed user"}</strong><small>{user.email ?? "No email"}</small></div><Status value={user.status} /></div>)}</section></div><section className="card"><div className="card-heading"><div><h3>Recent orders</h3><p className="muted">The latest activity from your customers</p></div><button className="link-button">View all</button></div><OrderTable rows={data.recentOrders} /></section></>;
}

function AnalyticsView({ data }: { data?: Dashboard }) { const values = data?.orderStatus ?? []; const total = values.reduce((sum, item) => sum + item._count._all, 0); return <><div className="page-heading"><div><p className="kicker">INSIGHTS</p><h1>Platform analytics</h1><p className="muted">A live view of operational health.</p></div></div><div className="analytics-grid"><div className="card pie-card"><h3>Order status mix</h3><p className="muted">{total} total orders</p><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={values.map((item) => ({ name: item.status, value: item._count._all }))} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105}>{values.map((item, i) => <Cell key={item.status} fill={["#6d5dfc", "#ff9f43", "#38b88a", "#f05d82", "#4aa3df"][i % 5]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="card insight-list"><h3>Operational summary</h3>{[["Active deliveries", data?.counts.activeDeliveries ?? 0], ["Pending applications", data?.counts.pendingApplications ?? 0], ["Registered users", data?.counts.users ?? 0], ["Restaurants", data?.counts.restaurants ?? 0]].map(([label, value]) => <div className="metric-row" key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div></div></>; }
function SettingsView({ admin }: { admin: Admin }) { return <><div className="page-heading"><div><p className="kicker">WORKSPACE</p><h1>Settings</h1><p className="muted">Manage your administrator profile and session.</p></div></div><section className="card settings-card"><div className="profile-large">{admin.avatar ? <Image src={admin.avatar} alt="" width={62} height={62} /> : <span>{(admin.name ?? "A").slice(0, 1)}</span>}<div><h3>{admin.name ?? "Administrator"}</h3><p className="muted">{admin.email}</p><span className="badge purple">ADMIN</span></div></div><div className="settings-row"><span>Account status</span><Status value={admin.status} /></div><div className="settings-row"><span>Authentication</span><span className="muted">Firebase verified session</span></div><div className="settings-row"><span>Administrator ID</span><code>{admin.id}</code></div></section></>; }

function ResourceView({ section, data, loading, action }: { section: string; data: unknown; loading: boolean; action: (input: { path: string; method: string; body?: unknown }) => void }) {
  const [search, setSearch] = useState(""); const applicationData = data && typeof data === "object" ? data as { restaurants?: Row[]; riders?: Row[] } : {}; const rows = Array.isArray(data) ? data as Row[] : ("restaurants" in applicationData ? [...(applicationData.restaurants ?? []), ...(applicationData.riders ?? [])] : []) as Row[];
  const filtered = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  const singular = section.endsWith("s") ? section.slice(0, -1) : section;
  const updateStatus = (row: Row, status: string) => { const id = String(row.id); const path = section === "users" ? `/admin/users/${id}/status` : section === "restaurants" ? `/admin/restaurants/${id}/status` : section === "riders" ? `/admin/riders/${id}/status` : section === "orders" ? `/admin/orders/${id}/status` : ""; if (path) action({ path, method: "PATCH", body: section === "users" ? { status } : { status } }); };
  return <><div className="page-heading"><div><p className="kicker">MANAGEMENT / {section.toUpperCase()}</p><h1>{section === "applications" ? "Application review" : `${singular.charAt(0).toUpperCase()}${singular.slice(1)} management`}</h1><p className="muted">Review and manage live platform data.</p></div></div>{section === "coupons" ? <CouponForm action={action} /> : null}<div className="toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${section}...`} /></div><span className="result-count">{filtered.length} records</span></div><section className="card table-card">{loading ? <div className="table-loading"><div className="spinner" />Loading records...</div> : section === "orders" ? <OrderTable rows={filtered as Dashboard["recentOrders"]} /> : section === "applications" ? <ApplicationTable rows={filtered} action={action} /> : section === "coupons" || section === "cuisines" ? <SimpleTable section={section} rows={filtered} action={action} /> : <GenericTable section={section} rows={filtered} updateStatus={updateStatus} />}</section></>;
}
function CouponForm({ action }: { action: (input: { path: string; method: string; body?: unknown }) => void }) {
  const [form, setForm] = useState({ code: "", discountType: "PERCENTAGE", discountValue: "", minimumOrder: "0", maximumDiscount: "", usageLimit: "", expiresAt: "" });
  const [message, setMessage] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    action({ path: "/admin/coupons", method: "POST", body: { ...form, code: form.code.trim().toUpperCase() } });
    setForm({ code: "", discountType: "PERCENTAGE", discountValue: "", minimumOrder: "0", maximumDiscount: "", usageLimit: "", expiresAt: "" });
    setMessage("Coupon creation requested.");
  };
  return <form className="card" onSubmit={submit} style={{ marginBottom: 18, padding: 18 }}><div className="card-heading"><div><h3>Create coupon</h3><p className="muted">Customers can apply active coupons at checkout.</p></div></div><div className="details-grid"><label>Code<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="WELCOME20" /></label><label>Type<select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value })}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></select></label><label>Discount<input required type="number" min="0.01" step="0.01" value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} /></label><label>Minimum order<input type="number" min="0" step="0.01" value={form.minimumOrder} onChange={(event) => setForm({ ...form, minimumOrder: event.target.value })} /></label><label>Maximum discount<input type="number" min="0.01" step="0.01" value={form.maximumDiscount} onChange={(event) => setForm({ ...form, maximumDiscount: event.target.value })} placeholder="Optional" /></label><label>Usage limit<input type="number" min="1" step="1" value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} placeholder="Unlimited" /></label><label>Expires at<input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></label></div><button className="primary" type="submit">Create coupon</button>{message ? <span className="muted" style={{ marginLeft: 12 }}>{message}</span> : null}</form>;
}
function GenericTable({ section, rows, updateStatus }: { section: string; rows: Row[]; updateStatus: (row: Row, status: string) => void }) { if (!rows.length) return <Empty text={`No ${section} found.`} />; return <div className="table-wrap"><table><thead><tr><th>Name</th><th>Contact</th><th>Status</th><th>Activity</th><th>Actions</th></tr></thead><tbody>{rows.map((row, i) => { const user = (row.user ?? row.owner ?? {}) as Row; const name = String(row.name ?? user.name ?? "Unnamed"); const email = String(row.email ?? user.email ?? "—"); const status = String(row.status ?? (row.isActive === false ? "SUSPENDED" : "ACTIVE")); const count = row.totalDeliveries ?? ((row._count as Row | undefined)?.orders ?? "—"); return <tr key={String(row.id ?? i)}><td><strong>{name}</strong><small>{String(row.id ?? "")}</small></td><td>{email}</td><td><Status value={status} /></td><td>{String(count)}</td><td><button className="table-action" onClick={() => updateStatus(row, status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>{status === "ACTIVE" ? "Suspend" : "Activate"}</button></td></tr>; })}</tbody></table></div>; }
function ApplicationTable({ rows, action }: { rows: Row[]; action: (input: { path: string; method: string; body?: unknown }) => void }) {
  const [kindFilter, setKindFilter] = useState<"all" | "owner" | "rider">("all");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<Row | null>(null);
  const filtered = rows.filter((row) => {
    const kind = row.vehicleType ? "rider" : "owner";
    return (kindFilter === "all" || kind === kindFilter) && (statusFilter === "ALL" || String(row.status) === statusFilter);
  });
  if (!rows.length) return <Empty text="No applications found." />;
  const reject = (row: Row) => {
    const reason = window.prompt("Enter a rejection reason:");
    if (!reason?.trim()) return;
    const kind = row.vehicleType ? "rider" : "restaurant";
    action({ path: `/admin/${kind}-applications/${String(row.id)}`, method: "PATCH", body: { status: "REJECTED", rejectionReason: reason.trim() } });
  };
  return <div>
    <div className="application-filters">
      <div className="filter-tabs">{[["all", "All"], ["owner", "Owners"], ["rider", "Riders"]].map(([value, label]) => <button key={value} className={kindFilter === value ? "filter-tab active" : "filter-tab"} onClick={() => setKindFilter(value as typeof kindFilter)}>{label}</button>)}</div>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="status-filter"><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select>
    </div>
    {!filtered.length ? <Empty text="No applications match these filters." /> : <div className="table-wrap"><table><thead><tr><th>Applicant</th><th>Application</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((row, i) => { const applicant = (row.applicant ?? {}) as Row; const kind = row.vehicleType ? "rider" : "restaurant"; const pending = row.status === "PENDING"; return <tr key={String(row.id ?? i)}><td><strong>{String(applicant.name ?? row.fullName ?? applicant.email ?? "Applicant")}</strong><small>{String(applicant.email ?? row.email ?? "—")}</small></td><td>{String(row.name ?? row.vehicleNumber ?? "Rider application")}</td><td>{new Date(String(row.createdAt)).toLocaleDateString()}</td><td><Status value={String(row.status)} /></td><td><div className="action-group"><button className="table-action" onClick={() => setSelected(row)}>Details</button>{pending ? <><button className="table-action approve" onClick={() => action({ path: `/admin/${kind}-applications/${String(row.id)}`, method: "PATCH", body: { status: "APPROVED" } })}>Approve</button><button className="table-action danger" onClick={() => reject(row)}>Reject</button></> : null}</div></td></tr>; })}</tbody></table></div>}
    {selected ? <ApplicationDetails row={selected} close={() => setSelected(null)} /> : null}
  </div>;
}

function ApplicationDetails({ row, close }: { row: Row; close: () => void }) {
  const applicant = (row.applicant ?? {}) as Row;
  const entries = Object.entries(row).filter(([key, value]) => !["applicant", "restaurant", "id", "applicantId", "restaurantId", "businessDocuments"].includes(key) && value !== null && value !== undefined && value !== "");
  const documents = [
    ...(row.businessDocuments && typeof row.businessDocuments === "object" ? Object.entries(row.businessDocuments as Row).map(([name, url]) => [name, url] as const) : []),
    ...(["drivingLicense", "vehicleRegistration", "identityDocument", "profileImage"].filter((key) => typeof row[key] === "string" && row[key]).map((key) => [key, row[key]] as const)),
  ];
  return <div className="application-details"><div className="application-details-card"><div className="card-heading"><div><p className="kicker">APPLICATION DETAILS</p><h3>{String(row.name ?? row.fullName ?? "Rider application")}</h3></div><button className="icon-button" onClick={close}>×</button></div><p className="muted">{String(applicant.name ?? row.fullName ?? "Applicant")} · {String(applicant.email ?? row.email ?? "No email")}</p><div className="details-grid">{entries.map(([key, value]) => <div key={key}><small>{key.replaceAll(/([A-Z])/g, " $1")}</small><strong>{typeof value === "object" ? JSON.stringify(value) : String(value)}</strong></div>)}</div>{documents.length ? <div className="document-list"><p className="kicker">SECURE DOCUMENTS</p>{documents.map(([name, url]) => <a key={name} href={String(url)} target="_blank" rel="noreferrer" className="document-link"><span>{name.replaceAll(/([A-Z])/g, " $1")}</span><span>Open document ↗</span></a>)}</div> : <p className="muted document-empty">No documents were submitted.</p>}<button className="secondary" onClick={close}>Close details</button></div></div>;
}
function SimpleTable({ section, rows, action }: { section: string; rows: Row[]; action: (input: { path: string; method: string; body?: unknown }) => void }) { return <>{!rows.length ? <Empty text={`No ${section} found.`} /> : <div className="table-wrap"><table><thead><tr><th>Name</th><th>{section === "coupons" ? "Discount" : "Restaurants"}</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map((row, i) => <tr key={String(row.id ?? i)}><td><strong>{String(row.code ?? row.name)}</strong></td><td>{section === "coupons" ? `${String(row.discountValue)} ${String(row.discountType)}` : String((row._count as Row | undefined)?.restaurants ?? 0)}</td><td><Status value={String(row.isActive === false ? "INACTIVE" : "ACTIVE")} /></td><td><button className="table-action danger" onClick={() => action({ path: `/admin/${section}/${String(row.id)}`, method: "DELETE" })}><Trash2 size={14} /> Delete</button></td></tr>)}</tbody></table></div>}</>; }
function OrderTable({ rows }: { rows: Dashboard["recentOrders"] }) { if (!rows.length) return <Empty text="No orders found." />; return <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Restaurant</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>LB-{row.id.slice(-6).toUpperCase()}</strong><small>{new Date(row.createdAt).toLocaleString()}</small></td><td>{row.user.name ?? row.user.email ?? "Guest"}</td><td>{row.restaurant.name}</td><td>₹{row.total.toLocaleString("en-IN")}</td><td><Status value={row.payment?.status ?? "PENDING"} /></td><td><Status value={row.status} /></td></tr>)}</tbody></table></div>; }
function Status({ value }: { value: string }) { return <span className={`badge ${value.toLowerCase().includes("active") || value === "PAID" || value === "DELIVERED" || value === "APPROVED" ? "green" : value.includes("PENDING") || value.includes("PLACED") ? "yellow" : value.includes("SUSPENDED") || value.includes("FAILED") || value.includes("CANCEL") || value.includes("REJECT") ? "red" : "blue"}`}>{value.replaceAll("_", " ")}</span>; }
