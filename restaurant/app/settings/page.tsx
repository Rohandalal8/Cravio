"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import { uploadRestaurantImage } from "@/lib/cloudinary";
import { RouteShell } from "@/components/route-shell";

type RestaurantProfile = {
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  deliveryTime: string | null;
  minimumOrder: number;
  isOpen: boolean;
  coverImage: string | null;
};

type ProfileForm = {
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  deliveryTime: string;
  minimumOrder: string;
};

const emptyForm: ProfileForm = {
  name: "",
  description: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  deliveryTime: "",
  minimumOrder: "0",
};

function toForm(profile: RestaurantProfile): ProfileForm {
  return {
    name: profile.name ?? "",
    description: profile.description ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    address: profile.address ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    pincode: profile.pincode ?? "",
    deliveryTime: profile.deliveryTime ?? "",
    minimumOrder: String(profile.minimumOrder ?? 0),
  };
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    if (!nextUser) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const token = await nextUser.getIdToken();
        const loaded = await apiFetch<RestaurantProfile>("/restaurant/profile", token);
        setProfile(loaded);
        setForm(toForm(loaded));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load restaurant settings.");
      } finally {
        setLoading(false);
      }
    })();
  }), []);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess("");
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    const minimumOrder = Number(form.minimumOrder);
    if (!form.name.trim() || !Number.isFinite(minimumOrder) || minimumOrder < 0) {
      setError("Restaurant name and a valid minimum order are required.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = await user.getIdToken();
      const coverImage = image ? await uploadRestaurantImage(image, token) : profile?.coverImage;
      const updated = await apiFetch<RestaurantProfile>("/restaurant/profile", token, {
        method: "PATCH",
        body: JSON.stringify({ ...form, name: form.name.trim(), minimumOrder, coverImage }),
      });
      setProfile(updated);
      setForm(toForm(updated));
      setImage(null);
      setSuccess("Restaurant profile updated successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update restaurant profile.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRestaurantStatus() {
    if (!user || !profile || statusSaving) return;
    setStatusSaving(true);
    setError("");
    setSuccess("");
    try {
      const token = await user.getIdToken();
      const updated = await apiFetch<RestaurantProfile>("/restaurant/profile", token, {
        method: "PATCH",
        body: JSON.stringify({ isOpen: !profile.isOpen }),
      });
      setProfile(updated);
      setSuccess(`Restaurant is now ${updated.isOpen ? "open" : "closed"}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update restaurant status.");
    } finally {
      setStatusSaving(false);
    }
  }

  if (!user) {
    return <main className="center"><div className="login-card"><span className="eyebrow">Owner access</span><h1>Sign in to continue.</h1><p>Use an active restaurant-owner account to manage your restaurant settings.</p><a className="button" href="/login">Open owner sign in</a></div></main>;
  }

  return <RouteShell><main className="main">
    <header><div><span className="eyebrow">Workspace</span><h1 className="title">Settings</h1><p className="muted">Manage your restaurant profile and availability from one place.</p></div></header>
    {loading ? <div className="empty">Loading restaurant settings...</div> : error && !profile ? <div className="error">{error}</div> : profile ? <section className="settings-layout">
      <div className="card status-card"><div><strong>Restaurant status</strong><p className="settings-help">Control whether guests can place new orders.</p></div><button className={`button ${profile.isOpen ? "danger" : ""}`} onClick={() => void toggleRestaurantStatus()} disabled={statusSaving}>{statusSaving ? "Saving..." : profile.isOpen ? "Close restaurant" : "Open restaurant"}</button><span className={`status ${profile.isOpen ? "is-open" : "is-closed"}`}><i />{profile.isOpen ? "Open for orders" : "Closed for orders"}</span></div>
      <section className="card settings-card"><div className="table-head"><div><h2>Restaurant profile</h2><span>These details are shown to guests.</span></div></div>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        <form className="form settings-form" onSubmit={saveProfile}>
          {profile.coverImage && <img className="settings-image-preview" src={profile.coverImage} alt={`${profile.name} cover`} />}
          <label>Restaurant image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /><small>JPG, PNG, or WEBP up to 10 MB. Save changes to publish it.</small></label>
          <div className="form-grid"><label>Restaurant name<input value={form.name} onChange={(event) => updateField("name", event.target.value)} required /></label><label>Contact phone<input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} type="tel" /></label><label>Contact email<input value={form.email} onChange={(event) => updateField("email", event.target.value)} type="email" /></label><label>Delivery time<input value={form.deliveryTime} onChange={(event) => updateField("deliveryTime", event.target.value)} placeholder="30-40 min" /></label><label>Minimum order<input value={form.minimumOrder} onChange={(event) => updateField("minimumOrder", event.target.value)} type="number" min="0" step="0.01" /></label><label>PIN code<input value={form.pincode} onChange={(event) => updateField("pincode", event.target.value)} /></label></div>
          <label>Restaurant description<textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Tell guests what makes your restaurant special." /></label>
          <label>Address<textarea value={form.address} onChange={(event) => updateField("address", event.target.value)} /></label>
          <div className="form-grid"><label>City<input value={form.city} onChange={(event) => updateField("city", event.target.value)} /></label><label>State<input value={form.state} onChange={(event) => updateField("state", event.target.value)} /></label></div>
          <button className="button" type="submit" disabled={saving}>{saving ? "Saving changes..." : "Save changes"}</button>
        </form>
      </section>
    </section> : null}
  </main></RouteShell>;
}
