import type { User as FirebaseUser } from "firebase/auth";

const DEFAULT_API_URL = "http://localhost:5000/api";

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
}

export async function syncFirebaseUser(firebaseUser: FirebaseUser, name?: string) {
  const token = await firebaseUser.getIdToken(true);
  return apiFetch<{ success: true; data: {
    id: string;
    email: string | null;
    name: string | null;
    avatar: string | null;
    firebaseUid: string;
    role: "CUSTOMER" | "RESTAURANT_OWNER" | "RIDER" | "ADMIN";
    status: "ACTIVE" | "SUSPENDED";
  } }>("/auth/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: name ?? firebaseUser.displayName ?? "Cravio user",
      email: firebaseUser.email,
      phone: firebaseUser.phoneNumber,
      avatar: firebaseUser.photoURL,
    }),
  });
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      `Unable to connect to Cravio API at ${getApiBaseUrl()}. Start the backend on port 5000 and check CORS settings.`,
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message ?? "Request failed");
  }

  return (await response.json()) as T;
}
