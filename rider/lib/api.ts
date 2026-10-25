import { auth } from "./firebase";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = auth?.currentUser
    ? await auth.currentUser.getIdToken()
    : window.localStorage.getItem("cravio-token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const payload = (await response.json().catch(() => null)) as { data?: T; message?: string } | null;
  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? (response.status === 429 ? "The service is temporarily busy. Please try again shortly." : "Something went wrong. Please try again."),
      response.status,
    );
  }
  return payload?.data as T;
}
