"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { sendVerificationEmail, signInWithEmail, signInWithGoogle } from "@/lib/firebase";
import { syncFirebaseUser } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice] = useState(() =>
    typeof window !== "undefined" && window.location.search.includes("verification=sent")
      ? "Verification email sent. Verify your email before signing in."
      : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const userCredential = await signInWithEmail(email, password);
      if (!userCredential.user.emailVerified) {
        await sendVerificationEmail();
        router.push("/verify-email");
        return;
      }
      await syncFirebaseUser(userCredential.user);
      router.push("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setIsSubmitting(true);

    try {
      setError("");
      const userCredential = await signInWithGoogle();
      if (userCredential) {
        await syncFirebaseUser(userCredential.user);
        router.push("/");
      }
    } catch (submitError) {
      const code = (submitError as { code?: string }).code;
      const messages: Record<string, string> = {
        "auth/unauthorized-domain": "This website is not authorized in Firebase. Add localhost to Firebase Authentication settings.",
        "auth/operation-not-allowed": "Google sign-in is disabled. Enable Google under Firebase Authentication providers.",
        "auth/configuration-not-found": "Firebase Authentication configuration was not found. Check that the web app config belongs to an active Firebase project.",
        "auth/internal-error": "Firebase Authentication is not configured for this project. Check the Firebase web config and enable Google sign-in.",
        "auth/popup-closed-by-user": "Google sign-in was cancelled before it finished.",
        "auth/popup-blocked": "Your browser blocked the Google sign-in window. Please allow popups and try again.",
      };

      setError(messages[code ?? ""] ?? (submitError instanceof Error ? submitError.message : "Google sign-in failed."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-[#4e493f]">Email address</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="auth-input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="login-password" className="block text-sm font-semibold text-[#4e493f]">Password</label>
          <a href="#forgot-password" className="text-xs font-semibold text-[#d97732] hover:text-[#b85f23]">Forgot password?</a>
        </div>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className="auth-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {notice ? <p className="text-sm text-[#28734f]">{notice}</p> : null}
      {error ? <p className="text-sm text-[#b3261e]">{error}</p> : null}

      <button type="submit" className="auth-button" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"} <span aria-hidden="true">→</span>
      </button>
      <div className="flex items-center gap-4 py-1 text-xs text-[#a49b8f]"><span className="h-px flex-1 bg-[#e8e1d6]" />or continue with<span className="h-px flex-1 bg-[#e8e1d6]" /></div>
      <button type="button" onClick={handleGoogleLogin} className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#ded7cb] bg-white px-4 py-3 text-sm font-semibold text-[#4e493f] transition hover:border-[#bfb5a7] hover:bg-[#fcfaf6]" disabled={isSubmitting}>
        <span className="text-base font-bold text-[#4285f4]">G</span> {isSubmitting ? "Opening Google..." : "Continue with Google"}
      </button>
    </form>
  );
}