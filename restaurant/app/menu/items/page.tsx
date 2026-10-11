"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { RouteShell } from "@/components/route-shell";
import { apiFetch } from "@/lib/api";
import { auth, storage } from "@/lib/firebase";

type MenuItem = { id: string; name: string; description: string | null; price: number; image: string | null; isVeg: boolean; isAvailable: boolean };

export default function ItemsPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [values, setValues] = useState({ name: "", description: "", price: "", category: "General", isVeg: true });
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function load() {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const profile = await apiFetch<{ menuItems: MenuItem[] }>("/restaurant/profile", token);
      setItems(profile.menuItems ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load menu items.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => void load());
    return unsubscribe;
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!auth.currentUser) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const token = await auth.currentUser.getIdToken();
      let imageUrl = "";
      if (image) {
        const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const imageRef = ref(storage, `restaurants/${auth.currentUser.uid}/menu/${Date.now()}-${safeName}`);
        await uploadBytes(imageRef, image, { contentType: image.type });
        imageUrl = await getDownloadURL(imageRef);
      }
      await apiFetch("/restaurant/menu-items", token, {
        method: "POST",
        body: JSON.stringify({ ...values, price: Number(values.price), image: imageUrl }),
      });
      setValues({ name: "", description: "", price: "", category: "General", isVeg: true });
      setImage(null);
      setSaved("Dish added successfully.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add dish.");
    } finally {
      setBusy(false);
    }
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError("Dish image must be JPG, PNG, or WEBP and smaller than 5 MB.");
      setImage(null);
      return;
    }
    setError("");
    setImage(file);
  }

  return <RouteShell><main className="main"><header><div><span className="eyebrow">Menu studio</span><h1 className="title">Menu items</h1></div></header><section className="page-card form">
    <h2>Add a dish</h2><p className="muted">Add the dish details and an image for your customer menu.</p>
    <form onSubmit={(event) => void submit(event)} className="owner-form">
      <label>Dish name<input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></label>
      <label>Price (₹)<input required min="0" step="0.01" type="number" value={values.price} onChange={(event) => setValues({ ...values, price: event.target.value })} /></label>
      <label>Category<input value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })} /></label>
      <label>Description<textarea value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></label>
      <label>Dish image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} /></label>
      <label className="checkbox"><input type="checkbox" checked={values.isVeg} onChange={(event) => setValues({ ...values, isVeg: event.target.checked })} /> Vegetarian</label>
      {error && <p className="error">{error}</p>}{saved && <p className="saved">{saved}</p>}
      <button className="button" disabled={busy}>{busy ? "Adding dish..." : "Add dish"}</button>
    </form>
  </section><section className="table"><div className="table-head"><h2>Current menu</h2><span>{items.length} items</span></div>{loading ? <div className="empty">Loading menu...</div> : items.length ? items.map((item) => <div className="row" key={item.id}>{item.image ? <img src={item.image} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 10 }} /> : null}<span><b>{item.name}</b><small>{item.description ?? (item.isVeg ? "Vegetarian" : "Non-vegetarian")}</small></span><span>₹{item.price.toFixed(2)}</span></div>) : <div className="empty">No menu items have been added yet.</div>}</section></main></RouteShell>;
}
