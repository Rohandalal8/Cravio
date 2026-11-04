"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { apiFetch } from "@/lib/api";
import { auth, googleProvider } from "@/lib/firebase";

type Mode = "signin" | "create";

function firebaseMessage(error: unknown) {
  if (!(error instanceof Error)) return "Unable to authenticate with Firebase.";
  if (error.message.includes("auth/invalid-credential")) return "The email or password is incorrect.";
  if (error.message.includes("auth/email-already-in-use")) return "An account already exists for this email. Sign in instead.";
  if (error.message.includes("auth/weak-password")) return "Choose a password with at least six characters.";
  if (error.message.includes("auth/popup-closed-by-user")) return "The Google sign-in window was closed before completing sign-in.";
  return error.message;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const finishAuthentication = async (firebaseUser: { getIdToken: () => Promise<string>; displayName: string | null; email: string | null; photoURL: string | null }) => {
    const token = await firebaseUser.getIdToken();
    const profile = await apiFetch<{ role: string; roles?: string[]; status: string }>("/auth/sync", token, {
      method: "POST",
      body: JSON.stringify({ name: firebaseUser.displayName, email: firebaseUser.email, avatar: firebaseUser.photoURL }),
    });
    const roles = profile.roles ?? [profile.role];
    if (!roles.includes("RESTAURANT_OWNER") && !roles.includes("CUSTOMER")) {
      await signOut(auth);
      throw new Error("This Firebase account is not eligible for the restaurant owner application.");
    }
    router.push(roles.includes("RESTAURANT_OWNER") && profile.status === "ACTIVE" ? "/" : "/onboarding");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const credential = mode === "create"
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
        await signOut(auth);
        throw new Error("Please verify your email first. A verification email has been sent.");
      }
      await finishAuthentication(credential.user);
    } catch (cause) {
      await signOut(auth).catch(() => undefined);
      setError(firebaseMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      await finishAuthentication(credential.user);
    } catch (cause) {
      await signOut(auth).catch(() => undefined);
      setError(firebaseMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="center">
      <form className="login-card form" onSubmit={submit}>
        <span className="eyebrow">Owner access</span>
        <h1>{mode === "signin" ? "Welcome back." : "Create your owner account."}</h1>
        <p>{mode === "signin" ? "Sign in with your email, password, or Google account." : "Create an account with your own email and password to begin the owner application."}</p>
        <button className="google-button" type="button" onClick={() => void signInWithGoogle()} disabled={loading}>Continue with Google</button>
        <div className="login-divider"><span>or use email</span></div>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>
        {error && <div className="error">{error}</div>}
        <button className="button" disabled={loading}>{loading ? "Connecting..." : mode === "signin" ? "Sign in securely" : "Create account"}</button>
        <button className="text-button" type="button" onClick={() => { setMode(mode === "signin" ? "create" : "signin"); setError(""); }}>
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
