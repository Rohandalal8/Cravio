"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { sendVerificationEmail, setDisplayName, signInWithGoogle, signUpWithEmail } from "@/lib/firebase";
import { syncFirebaseUser } from "@/lib/api";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signUpWithEmail(email, password);
      await setDisplayName(name);
      await sendVerificationEmail();
      router.push("/verify-email");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleRegister() {
    setError("");
    setIsSubmitting(true);

    try {
      const userCredential = await signInWithGoogle();
      if (userCredential) {
        await syncFirebaseUser(userCredential.user);
        router.push("/");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create account with Google.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="register-name" className="mb-2 block text-sm font-semibold text-[#4e493f]">Your name</label>
        <input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Alex Morgan"
          className="auth-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="register-email" className="mb-2 block text-sm font-semibold text-[#4e493f]">Email address</label>
        <input
          id="register-email"
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
        <label htmlFor="register-password" className="mb-2 block text-sm font-semibold text-[#4e493f]">Create a password</label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="auth-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
        />
      </div>

      {error ? <p className="text-sm text-[#b3261e]">{error}</p> : null}

      <button type="submit" className="auth-button" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create account"} <span aria-hidden="true">→</span>
      </button>
      <div className="flex items-center gap-4 py-1 text-xs text-[#a49b8f]"><span className="h-px flex-1 bg-[#e8e1d6]" />or continue with<span className="h-px flex-1 bg-[#e8e1d6]" /></div>
      <button type="button" onClick={handleGoogleRegister} className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#ded7cb] bg-white px-4 py-3 text-sm font-semibold text-[#4e493f] transition hover:border-[#bfb5a7] hover:bg-[#fcfaf6]" disabled={isSubmitting}>
        <span className="text-base font-bold text-[#4285f4]">G</span> {isSubmitting ? "Opening Google..." : "Continue with Google"}
      </button>
    </form>
  );
}
