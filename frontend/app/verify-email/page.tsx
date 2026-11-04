"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { reload, signOut } from "firebase/auth";

import { auth, sendVerificationEmail } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";

export default function VerifyEmailPage() {
  const { refreshSession } = useAuth();
  const router = useRouter();
  const [email] = useState(() => auth?.currentUser?.email ?? "");
  const [message, setMessage] = useState("Waiting for email verification...");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const checkVerification = async () => {
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        if (active) {
          setMessage("Please sign in with your unverified account to continue.");
        }
        return;
      }

      try {
        await reload(currentUser);
        if (currentUser.emailVerified) {
          await refreshSession();
          router.replace("/");
          return;
        }
        if (active) setMessage("Open the verification email, then keep this page open.");
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to check verification status.");
        }
      }
    };

    void checkVerification();
    const interval = window.setInterval(() => void checkVerification(), 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [refreshSession, router]);

  const resend = async () => {
    setError("");
    try {
      await sendVerificationEmail();
      setMessage("A new verification email has been sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send verification email.");
    }
  };

  const leave = async () => {
    if (auth) await signOut(auth);
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-10 text-[#28241f]">
      <section className="mx-auto mt-16 max-w-lg rounded-2xl bg-white p-8 text-center shadow-[0_24px_80px_rgba(51,42,29,0.12)] sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1d6] text-2xl">
          ✉
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#d97732]">
          Verify your email
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-[-0.04em]">
          One last step.
        </h1>
        <p className="mt-4 leading-7 text-[#81786c]">
          We sent a verification link to{" "}
          <strong className="text-[#4e493f]">{email || "your email address"}</strong>.
          {` `}Verification will be detected automatically.
        </p>
        <p className="mt-5 text-sm text-[#28734f]">{message}</p>
        {error ? <p className="mt-3 text-sm text-[#b3261e]">{error}</p> : null}
        <div className="mt-8 flex flex-col gap-3">
          <button type="button" onClick={() => void resend()} className="auth-button">
            Resend verification email
          </button>
          <button type="button" onClick={() => void leave()} className="text-sm font-semibold text-[#8b1e3f]">
            Use a different account
          </button>
          <Link href="/" className="text-sm text-[#81786c] hover:text-[#8b1e3f]">
            Continue browsing as guest
          </Link>
        </div>
      </section>
    </main>
  );
}
