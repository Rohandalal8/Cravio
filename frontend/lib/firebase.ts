import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut, updateProfile } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

const hasFirebaseConfig = Object.values(firebaseConfig).every((value) => Boolean(value));

export const auth = hasFirebaseConfig ? getAuth(getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
export const storage = hasFirebaseConfig ? getStorage(getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
export const googleProvider = hasFirebaseConfig ? new GoogleAuthProvider() : null;

export async function signInWithEmail(email: string, password: string) {
  if (!auth) throw new Error("Firebase is not configured.");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  if (!auth) throw new Error("Firebase is not configured.");
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function sendVerificationEmail() {
  if (!auth?.currentUser) throw new Error("No account is signed in.");
  await sendEmailVerification(auth.currentUser);
}

export async function setDisplayName(name: string) {
  if (!auth?.currentUser) throw new Error("No account is signed in.");
  await updateProfile(auth.currentUser, { displayName: name });
}

export async function signInWithGoogle() {
  if (!auth || !googleProvider) throw new Error("Firebase is not configured.");

  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const code = (error as { code?: string }).code;

    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
      return signInWithRedirect(auth, googleProvider);
    }

    throw error;
  }
}

export async function logout() {
  if (!auth) return;
  return signOut(auth);
}
