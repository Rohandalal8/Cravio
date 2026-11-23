"use client";

import { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { fetchAddresses, saveAddress } from "@/lib/addresses";
import { getSelectedLocation, setSelectedLocation } from "@/lib/location";

export function LocationPrompt() {
  const { firebaseUser, user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [form, setForm] = useState({
    label: "Home",
    fullAddress: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    if (loading || !firebaseUser || !user) return;
    let active = true;
    void (async () => {
      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetchAddresses(token);
        if (!active) return;
        if (response.data.length === 0) {
          setOpen(true);
          return;
        }
        const selected = getSelectedLocation();
        const defaultAddress =
          response.data.find((address) => address.id === selected?.addressId) ??
          response.data.find((address) => address.isDefault) ??
          response.data[0];
        setSelectedLocation({
          addressId: defaultAddress.id,
          label: defaultAddress.label,
          fullAddress: defaultAddress.fullAddress,
          city: defaultAddress.city,
          state: defaultAddress.state,
          pincode: defaultAddress.pincode,
          latitude: defaultAddress.latitude,
          longitude: defaultAddress.longitude,
        });
      } catch {
        if (active) setOpen(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [firebaseUser, user, loading]);

  const detectLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      },
      () => setError("Location access was denied. You can enter the address manually."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const save = async () => {
    if (!firebaseUser) return;
    if (!form.fullAddress.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      setError("Address, city, state and pincode are required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const token = await firebaseUser.getIdToken();
      const response = await saveAddress(token, {
        ...form,
        latitude,
        longitude,
        isDefault: true,
      });
      setSelectedLocation({ ...response.data, addressId: response.data.id });
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your location.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#252126]/55 px-5 backdrop-blur-sm">
      <section className="w-full max-w-[520px] rounded-[1.75rem] border border-[#eadfcf] bg-[#fffdf9] p-6 shadow-2xl sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8eadc] text-[#b86123]"><MapPin size={24} /></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#d97732]">Set your location</p>
        <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[#28241f]">Where should we deliver?</h2>
        <p className="mt-3 text-sm leading-6 text-[#81786c]">We will use this location for nearby restaurants and delivery requests.</p>

        <button type="button" onClick={detectLocation} className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-[#d97732] px-4 py-3 text-sm font-bold text-[#b86123]">
          <Navigation size={17} className="mr-2" /> {latitude ? "Location detected" : "Use my current location"}
        </button>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["label", "Location label", "Home"],
            ["fullAddress", "Full address", "House / area / landmark"],
            ["city", "City", "City"],
            ["state", "State", "State"],
            ["pincode", "Pincode", "Pincode"],
          ].map(([field, title, placeholder]) => (
            <label key={field} className={field === "fullAddress" ? "sm:col-span-2" : ""}>
              <span className="mb-1.5 block text-xs font-bold text-[#665d55]">{title}</span>
              <input
                value={form[field as keyof typeof form]}
                onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-xl border border-[#ded7cb] bg-white px-4 py-3 text-sm outline-none focus:border-[#d97732]"
              />
            </label>
          ))}
        </div>

        {error ? <p className="mt-4 rounded-xl bg-[#fff1ed] p-3 text-sm text-[#a54e32]">{error}</p> : null}
        <button type="button" disabled={isSaving} onClick={() => void save()} className="mt-5 w-full rounded-xl bg-[#8b1e3f] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60">
          {isSaving ? "Saving..." : "Save and continue"}
        </button>
      </section>
    </div>
  );
}
