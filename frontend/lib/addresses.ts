import { apiFetch } from "@/lib/api";

export type Address = {
  id: string;
  label: string;
  fullAddress: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
};

export async function fetchAddresses(token: string) {
  return apiFetch<{ success: true; data: Address[] }>("/auth/addresses", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function saveAddress(
  token: string,
  address: {
    label: string;
    fullAddress: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number | null;
    longitude?: number | null;
    isDefault?: boolean;
  },
  id?: string,
) {
  return apiFetch<{ success: true; data: Address }>(`/auth/addresses${id ? `/${id}` : ""}`, {
    method: id ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(address),
  });
}

export async function deleteAddress(token: string, id: string) {
  return apiFetch<{ success: true; data: { id: string } }>(`/auth/addresses/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
