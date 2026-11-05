"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  reload,
  type User as FirebaseUser,
} from "firebase/auth";

import { auth } from "@/lib/firebase";
import { syncFirebaseUser } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  firebaseUid: string;
  role: "CUSTOMER" | "RESTAURANT_OWNER" | "RIDER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
};

type AuthContextValue = {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getUserFromFirebase = async (firebaseUser: FirebaseUser | null): Promise<AuthUser | null> => {
  if (!firebaseUser) return null;

  await reload(firebaseUser);
  const tokenResult = await firebaseUser.getIdTokenResult(true);
  if (!firebaseUser.emailVerified || tokenResult.claims.email_verified !== true) {
    return null;
  }

  const response = await syncFirebaseUser(firebaseUser);
  const data = response.data;
  const avatar =
    data.avatar ??
    firebaseUser.photoURL ??
    firebaseUser.providerData.find((provider) => provider.photoURL)?.photoURL ??
    null;

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    avatar,
    firebaseUid: data.firebaseUid,
    role: data.role,
    status: data.status,
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(() => Boolean(auth));

  const syncSession = async (nextFirebaseUser: FirebaseUser | null) => {
    if (!nextFirebaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const syncedUser = await getUserFromFirebase(nextFirebaseUser);
      setUser(syncedUser ?? null);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("Please verify your email")
      ) {
        console.error("Auth sync failed:", error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setFirebaseUser(nextUser);
      await syncSession(nextUser);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      refreshSession: async () => {
        if (!auth || !firebaseUser) {
          setUser(null);
          return;
        }

        const refreshed = await getUserFromFirebase(firebaseUser);
        setUser(refreshed ?? null);
      },
    }),
    [firebaseUser, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
