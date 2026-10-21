"use client";

import Link from "next/link";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/auth-context";
import { auth } from "@/lib/firebase";

type Notification = { id: string; title: string; message: string; isRead: boolean; createdAt: string };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

async function notificationRequest<T>(path: string, options: RequestInit = {}) {
  if (!auth?.currentUser) throw new Error("Please sign in to view notifications.");
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers ?? {}) } });
  const payload = (await response.json().catch(() => null)) as { data?: T; message?: string } | null;
  if (!response.ok) throw new Error(payload?.message ?? "Unable to load notifications.");
  return payload?.data;
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["notifications", user?.id], queryFn: () => notificationRequest<Notification[]>("/notifications"), enabled: Boolean(user) && !authLoading });
  const markAll = useMutation({ mutationFn: () => notificationRequest<void>("/notifications/read-all", { method: "POST" }), onSuccess: () => void client.invalidateQueries({ queryKey: ["notifications", user?.id] }) });
  const markRead = useMutation({ mutationFn: (id: string) => notificationRequest(`/notifications/${id}/read`, { method: "PATCH" }), onSuccess: () => void client.invalidateQueries({ queryKey: ["notifications", user?.id] }) });

  if (authLoading || query.isLoading) return <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee] text-[#81786c]"><LoaderCircle className="mr-2 animate-spin" size={20} /> Loading notifications...</main>;
  if (!user) return <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee] px-5 text-center"><div><h1 className="font-serif text-4xl">Sign in to view notifications</h1><Link href="/login" className="mt-6 inline-flex rounded-full bg-[#273b32] px-5 py-3 text-sm font-bold text-white">Go to sign in</Link></div></main>;
  if (query.isError) return <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee] px-5 text-center"><div><h1 className="font-serif text-4xl">Notifications unavailable</h1><p className="mt-3 text-[#81786c]">{query.error instanceof Error ? query.error.message : "Please try again."}</p></div></main>;
  const notifications = query.data ?? [];
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-10 text-[#28241f] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d97732]">
              Stay informed
            </p>
            <h1 className="mt-3 font-serif text-5xl tracking-[-0.04em]">
              Notifications
            </h1>
          </div>

          {notifications.some((item) => !item.isRead) ? (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="inline-flex items-center rounded-full border border-[#ded7cb] bg-white px-4 py-2.5 text-sm font-bold text-[#4d473e]"
            >
              <CheckCheck size={16} className="mr-2" />
              Mark all read
            </button>
          ) : null}
        </div>

        <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-[#e8e0d4] bg-[#fffdf9]">
          {notifications.length ? (
            notifications.map((notification) => (
              <article
                key={notification.id}
                className={`flex gap-4 border-b border-[#eee7dc] p-5 last:border-0 ${notification.isRead ? "" : "bg-[#fffaf0]"
                  }`}
              >
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f8eadc] text-[#b86123]">
                  <Bell size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="font-semibold text-[#3d3830]">
                      {notification.title}
                    </h2>

                    {!notification.isRead ? (
                      <span className="rounded-full bg-[#f8e8bc] px-2.5 py-1 text-[11px] font-bold text-[#8a6417]">
                        New
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 leading-6 text-[#6f675d]">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-xs text-[#a19a90]">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>

                  {!notification.isRead ? (
                    <button
                      type="button"
                      onClick={() => markRead.mutate(notification.id)}
                      className="mt-3 text-xs font-bold text-[#b86123]"
                    >
                      Mark as read
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="px-6 py-16 text-center">
              <Bell className="mx-auto text-[#c9c1b5]" size={34} />

              <p className="mt-4 font-semibold text-[#5d554c]">
                You are all caught up.
              </p>

              <p className="mt-2 text-sm text-[#81786c]">
                Application and account updates will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
