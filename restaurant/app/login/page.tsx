"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { apiFetch } from "@/lib/api";
import { auth, googleProvider } from "@/lib/firebase";

function firebaseMessage(error: unknown) {
  if (!(error instanceof Error)) return "Unable to authenticate with Firebase.";
  if (error.message.includes("auth/invalid-credential")) return "The email or password is incorrect.";
  if (error.message.includes("auth/popup-closed-by-user")) return "The Google sign-in window was closed before completing sign-in.";
  return error.message;
}

export default function LoginPage() {
  const router = useRouter();
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
    if (!roles.includes("RESTAURANT_OWNER") || profile.status !== "ACTIVE") {
      await signOut(auth);
      throw new Error("Restaurant access is available only after your owner application is approved by an administrator.");
    }
    router.push("/");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
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
        <h1>Welcome back.</h1>
        <p>Sign in with the account you used to apply on the main Cravio site. Administrator approval is required.</p>
        <button className="google-button" type="button" onClick={() => void signInWithGoogle()} disabled={loading}>Continue with Google</button>
        <div className="login-divider"><span>or use email</span></div>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
        {error && <div className="error">{error}</div>}
        <button className="button" disabled={loading}>{loading ? "Connecting..." : "Sign in securely"}</button>
      </form>
    </main>
  );
}
