"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Bike, BriefcaseBusiness, LoaderCircle, RefreshCw } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { fetchApplicationStatus, type ApplicationSummary } from "@/lib/applications";
import { deleteAddress, fetchAddresses, saveAddress, type Address } from "@/lib/addresses";
import { setSelectedLocation } from "@/lib/location";

const restaurantPortalUrl = process.env.NEXT_PUBLIC_RESTAURANT_APP_URL ?? "http://localhost:3001";
const riderPortalUrl = process.env.NEXT_PUBLIC_RIDER_APP_URL ?? "http://localhost:3002";

function ApplicationStatus({ application, label }: { application: ApplicationSummary; label: string }) {
  const rejected = application.status === "REJECTED";
  return (
    <div className="mt-5 rounded-2xl border border-[#eadfcf] bg-[#fffaf0] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#3d3830]">{label}</span>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${rejected ? "bg-[#fbe8e2] text-[#a84e32]" : "bg-[#f8e8bc] text-[#8a6417]"}`}>
          {rejected ? "Not approved" : "Under review"}
        </span>
      </div>
      {rejected && application.rejectionReason ? <p className="mt-2 text-sm leading-6 text-[#81786c]">Reason: {application.rejectionReason}</p> : null}
      {rejected ? <Link href={label.startsWith("Restaurant") ? "/apply/owner" : "/apply/rider"} className="mt-3 inline-flex text-sm font-bold text-[#b86123] hover:text-[#8f481b]">Update and reapply <ArrowUpRight size={16} className="ml-1" /></Link> : null}
    </div>
  );
}

function PartnerCard({
  kind,
  title,
  description,
  href,
  portalUrl,
  application,
  approved,
}: {
  kind: "restaurant" | "rider";
  title: string;
  description: string;
  href: string;
  portalUrl: string;
  application: ApplicationSummary | null;
  approved: boolean;
}) {
  const Icon = kind === "restaurant" ? BriefcaseBusiness : Bike;
  if (approved) {
    return (
      <section className="rounded-[1.75rem] border border-[#dce8df] bg-[#f8fcf8] p-6 shadow-[0_14px_40px_rgba(39,59,50,0.06)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#dcecdf] text-[#273b32]"><Icon size={24} /></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#d97732]">Partner portal</p>
        <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#28241f]">{title}</h2>
        <p className="mt-3 leading-7 text-[#6f675d]">Your application has been approved. Open your live Cravio workspace.</p>
        <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center rounded-full bg-[#273b32] px-5 py-3 text-sm font-bold text-[#fffaf1] transition hover:bg-[#1c2d25]">Open portal <ArrowUpRight size={17} className="ml-2" /></a>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-[#e8e0d4] bg-[#fffdf9] p-6 shadow-[0_14px_40px_rgba(40,36,31,0.05)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8eadc] text-[#b86123]"><Icon size={24} /></div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#d97732]">{kind === "restaurant" ? "Grow with us" : "Deliver with us"}</p>
      <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em] text-[#28241f]">{title}</h2>
      <p className="mt-3 leading-7 text-[#6f675d]">{description}</p>
      {application?.status === "PENDING" ? <ApplicationStatus application={application} label={kind === "restaurant" ? "Restaurant owner application" : "Rider application"} /> : null}
      {application?.status === "REJECTED" ? <ApplicationStatus application={application} label={kind === "restaurant" ? "Restaurant owner application" : "Rider application"} /> : null}
      {!application ? <Link href={href} className="mt-6 inline-flex items-center rounded-full bg-[#d97732] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#bc5f1a]">Apply now <ArrowUpRight size={17} className="ml-2" /></Link> : null}
    </section>
  );
}

export default function SettingsPage() {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const status = useQuery({
    queryKey: ["application-status", user?.id],
    queryFn: fetchApplicationStatus,
    enabled: Boolean(user) && !authLoading,
    retry: 1,
  });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressActionId, setAddressActionId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    fullAddress: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    void (async () => {
      try {
        setAddressLoading(true);
        const token = await firebaseUser.getIdToken();
        const response = await fetchAddresses(token);
        if (active) setAddresses(response.data);
      } catch (error) {
        if (active) setAddressError(error instanceof Error ? error.message : "Unable to load addresses.");
      } finally {
        if (active) setAddressLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  if (authLoading) {
    return <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee] text-[#81786c]"><LoaderCircle className="mr-2 animate-spin" size={20} /> Checking your account...</main>;
  }
  if (!user) {
    return <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee] px-5 text-center"><div><h1 className="font-serif text-4xl text-[#28241f]">Sign in to view your settings</h1><Link href="/login" className="mt-6 inline-flex rounded-full bg-[#273b32] px-5 py-3 text-sm font-bold text-white">Go to sign in</Link></div></main>;
  }
  if (status.isLoading) {
    return <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee] text-[#81786c]"><LoaderCircle className="mr-2 animate-spin" size={20} /> Checking your partner status...</main>;
  }
  if (status.isError || !status.data) {
    return <main className="flex min-h-[70vh] items-center justify-center bg-[#f7f4ee] px-5 text-center"><div><h1 className="font-serif text-4xl text-[#28241f]">We could not load your settings</h1><p className="mt-3 text-[#81786c]">{status.error instanceof Error ? status.error.message : "Please try again."}</p><button type="button" onClick={() => void status.refetch()} className="mt-6 inline-flex items-center rounded-full bg-[#273b32] px-5 py-3 text-sm font-bold text-white"><RefreshCw size={16} className="mr-2" /> Try again</button></div></main>;
  }

  const { data } = status;
  const role = data.role.trim().toUpperCase();
  const roles = new Set([role]);
  const isRider = role === "RIDER";
  const isRestaurantOwner = role === "RESTAURANT_OWNER";
  const reloadAddresses = async () => {
    if (!firebaseUser) return;
    const token = await firebaseUser.getIdToken();
    setAddresses((await fetchAddresses(token)).data);
  };
  const addAddress = async () => {
    if (!firebaseUser) return;
    if (!addressForm.fullAddress.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.pincode.trim()) {
      setAddressError("Complete address details are required.");
      return;
    }
    try {
      const token = await firebaseUser.getIdToken();
      await saveAddress(token, addressForm);
      setAddressForm({ label: "Home", fullAddress: "", city: "", state: "", pincode: "" });
      setShowAddressForm(false);
      setAddressError(null);
      await reloadAddresses();
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : "Unable to save address.");
    }
  };
  const selectAddress = async (address: Address) => {
    if (!firebaseUser) return;
    const previousAddresses = addresses;
    setAddressError(null);
    setAddressActionId(address.id);
    setAddresses((current) =>
      current.map((item) => ({ ...item, isDefault: item.id === address.id })),
    );
    try {
      const token = await firebaseUser.getIdToken();
      await saveAddress(token, { ...address, isDefault: true }, address.id);
      setSelectedLocation({ ...address, addressId: address.id });
      await reloadAddresses();
    } catch (error) {
      setAddresses(previousAddresses);
      setAddressError(error instanceof Error ? error.message : "Unable to select address.");
    } finally {
      setAddressActionId(null);
    }
  };
  const removeAddress = async (address: Address) => {
    if (!firebaseUser) return;
    setAddressActionId(address.id);
    try {
      const token = await firebaseUser.getIdToken();
      await deleteAddress(token, address.id);
      await reloadAddresses();
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : "Unable to delete address.");
    } finally {
      setAddressActionId(null);
    }
  };
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-10 text-[#28241f] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1200px]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d97732]">Your account</p>
        <h1 className="mt-3 font-serif text-5xl tracking-[-0.04em]">Settings</h1>
        <p className="mt-4 max-w-2xl leading-7 text-[#6f675d]">Manage your Cravio profile and choose how you would like to partner with us.</p>
        <section className="mt-10 rounded-[1.75rem] border border-[#e8e0d4] bg-[#fffdf9] p-6 shadow-[0_14px_40px_rgba(40,36,31,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d97732]">Saved locations</p>
              <h2 className="mt-2 font-serif text-3xl">Delivery addresses</h2>
            </div>
            <button type="button" onClick={() => setShowAddressForm((value) => !value)} className="cursor-pointer rounded-full bg-[#273b32] px-4 py-2.5 text-sm font-bold text-white">Add address</button>
          </div>

          {addressLoading ? <p className="mt-5 text-sm text-[#81786c]">Loading addresses...</p> : null}
          <div className="mt-5 grid gap-3">
            {addresses.map((address) => (
              <div key={address.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${address.isDefault ? "border-[#d97732] bg-[#fff8ef]" : "border-[#eadfcf] bg-white"}`}>
                <div>
                  <p className="font-bold text-[#3d3830]">{address.label}{address.isDefault ? " - Default" : ""}</p>
                  <p className="mt-1 text-sm leading-6 text-[#81786c]">{address.fullAddress}, {address.city}, {address.state} {address.pincode}</p>
                </div>
                <div className="flex gap-2">
                  {!address.isDefault ? <button type="button" disabled={addressActionId !== null} onClick={() => void selectAddress(address)} className="cursor-pointer rounded-full border border-[#d97732] px-3 py-2 text-xs font-bold text-[#b86123] disabled:cursor-wait disabled:opacity-60">{addressActionId === address.id ? "Setting..." : "Use this"}</button> : <span className="rounded-full bg-[#fff0d9] px-3 py-2 text-xs font-bold text-[#b86123]">Default</span>}
                  <button type="button" disabled={addressActionId !== null} onClick={() => void removeAddress(address)} className="cursor-pointer rounded-full border border-[#eadfcf] px-3 py-2 text-xs font-bold text-[#81786c] disabled:cursor-wait disabled:opacity-60">Delete</button>
                </div>
              </div>
            ))}
          </div>

          {showAddressForm ? (
            <div className="mt-5 grid gap-3 rounded-2xl border border-[#eadfcf] bg-white p-4 sm:grid-cols-2">
              {[
                ["label", "Label", "Home"],
                ["fullAddress", "Full address", "House / area / landmark"],
                ["city", "City", "City"],
                ["state", "State", "State"],
                ["pincode", "Pincode", "Pincode"],
              ].map(([field, title, placeholder]) => (
                <label key={field} className={field === "fullAddress" ? "sm:col-span-2" : ""}>
                  <span className="mb-1.5 block text-xs font-bold text-[#665d55]">{title}</span>
                  <input value={addressForm[field as keyof typeof addressForm]} onChange={(event) => setAddressForm((current) => ({ ...current, [field]: event.target.value }))} placeholder={placeholder} className="w-full rounded-xl border border-[#ded7cb] px-4 py-3 text-sm outline-none focus:border-[#d97732]" />
                </label>
              ))}
              <button type="button" onClick={() => void addAddress()} className="sm:col-span-2 cursor-pointer rounded-xl bg-[#8b1e3f] px-5 py-3 text-sm font-bold text-white">Save address</button>
            </div>
          ) : null}
          {addressError ? <p className="mt-4 rounded-xl bg-[#fff1ed] p-3 text-sm text-[#a54e32]">{addressError}</p> : null}
        </section>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {!isRider ? <PartnerCard kind="restaurant" title="Restaurant Partner" description="List your restaurant, manage your menu, and receive orders from Cravio customers." href="/apply/owner" portalUrl={restaurantPortalUrl} application={data.ownerApplication} approved={roles.has("RESTAURANT_OWNER")} /> : null}
          {!isRestaurantOwner ? <PartnerCard kind="rider" title="Delivery Partner" description="Earn by delivering orders to Cravio customers with a flexible delivery workspace." href="/apply/rider" portalUrl={riderPortalUrl} application={data.riderApplication} approved={roles.has("RIDER")} /> : null}
        </div>
      </div>
    </main>
  );
}
