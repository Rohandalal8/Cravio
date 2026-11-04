"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { logout } from "@/lib/firebase";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
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
              {user.avatar ? (
                <img src={user.avatar} alt="" className="h-20 w-20 rounded-full border-4 border-white/30 object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f5a524] text-2xl font-bold text-[#273b32]">
                  {initials}
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
      </div>
    </main>
  );
}
