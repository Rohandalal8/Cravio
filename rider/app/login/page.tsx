"use client";
import { FormEvent, useEffect, useRef, useState } from "react"; import { useRouter } from "next/navigation"; import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"; import { api } from "@/lib/api"; import { auth, firebaseConfigured, googleProvider } from "@/lib/firebase";
export default function LoginPage() { const router = useRouter(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
 const finishing = useRef(false);
 async function finish() {
   if (!auth?.currentUser || finishing.current) return;
   finishing.current = true;
   try {
     const currentUser = auth.currentUser;
     const token = await currentUser.getIdToken();
     localStorage.setItem("cravio-token", token);
     await api("/auth/sync", { method: "POST", body: JSON.stringify({ name: currentUser.displayName, email: currentUser.email, phone: currentUser.phoneNumber, avatar: currentUser.photoURL }) });
     const user = await api<{ role: string; roles?: string[] }>("/auth/me");
     router.replace((user.roles ?? [user.role]).includes("RIDER") ? "/dashboard" : "/unauthorized");
   } finally {
     finishing.current = false;
   }
 }
 async function submit(event: FormEvent) { event.preventDefault(); setError(""); setBusy(true); try { if (!auth) throw new Error("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local."); await signInWithEmailAndPassword(auth, email, password); await finish(); } catch (e) { setError((e as Error).message.includes("invalid-credential") ? "Email or password is incorrect." : (e as Error).message); } finally { setBusy(false); } }
 async function google() { setError(""); setBusy(true); try { if (!auth) throw new Error("Firebase is not configured."); await signInWithPopup(auth, googleProvider); await finish(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
 useEffect(() => { if (auth?.currentUser) void finish().catch((cause: Error) => setError(cause.message)); }, []);
 return <main className="login-page"><div className="login-panel"><div className="brand login-brand"><img src="/cravio-admin-mark.svg" alt="" />Cravio</div><span className="kicker orange">Delivery partner</span><h1>Ready when<br /><em>you are.</em></h1><p className="login-copy">Sign in to manage your deliveries, earnings, and daily route.</p>{!firebaseConfigured && <div className="config-note">Firebase is not configured yet. Copy <code>.env.example</code> to <code>.env.local</code> and add your project values.</div>}<form onSubmit={(event) => void submit(event)}><label>Email address<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>{error && <p className="form-error">{error}</p>}<button className="button login-button" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button></form><div className="or"><span>or</span></div><button className="button google-button" disabled={busy} onClick={() => void google()}>Continue with Google</button><small className="login-foot">Only approved Cravio delivery partners can access this workspace.</small></div><div className="login-art"><div className="art-circle" /><span>Move with purpose.</span></div></main>; }
