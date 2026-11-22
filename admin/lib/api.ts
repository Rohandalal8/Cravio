import { auth } from "./firebase";

const configuredApiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://cravioo-api.vercel.app/api";

const apiUrl = configuredApiUrl
  .replace(/^http:\/\/(?!localhost(?:[/:]|$)|127\.0\.0\.1(?:[/:]|$))/i, "https://")
  .replace(/\/+$/, "");

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      `Could not connect to the backend. Make sure the API is running at ${apiUrl}.`
    );
  }
  const payload = (await response.json().catch(() => null)) as { data?: T; message?: string } | null;
  if (!response.ok) throw new Error(payload?.message ?? "The request could not be completed.");
  return payload?.data as T;
}
