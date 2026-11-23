export type SelectedLocation = {
  addressId?: string;
  label: string;
  fullAddress: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
};

const STORAGE_KEY = "cravio.selectedLocation";

export function getSelectedLocation(): SelectedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function setSelectedLocation(location: SelectedLocation) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  window.dispatchEvent(new CustomEvent("cravio-location-change", { detail: location }));
}
