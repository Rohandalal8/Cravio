"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";

import RiderShell, { Rider } from "@/components/RiderShell";
import { api } from "@/lib/api";
import { Loading } from "@/components/PageState";

export default function ProfilePage() {
  const [rider, setRider] = useState<Rider | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    vehicleNumber: "",
    vehicleBrand: "",
    vehicleModel: "",
    licenseNumber: "",
  });

  useEffect(() => {
    void api<Rider>("/rider/profile")
      .then((value) => {
        setRider(value);
        setForm({
          name: value.application?.fullName ?? value.fullName ?? value.user.name ?? "",
          phone: value.user.phone ?? value.application?.phone ?? "",
          address: value.application?.address ?? value.address ?? "",
          city: value.application?.city ?? value.city ?? "",
          state: value.application?.state ?? value.state ?? "",
          pincode: value.application?.pincode ?? value.pincode ?? "",
          vehicleNumber: value.vehicleNumber ?? "",
          vehicleBrand: value.application?.vehicleBrand ?? "",
          vehicleModel: value.application?.vehicleModel ?? "",
          licenseNumber: value.application?.licenseNumber ?? value.licenseNumber ?? "",
        });
      })
      .catch((cause: Error) => setError(cause.message));
  }, []);

  function openEdit() {
    setSaved(false);
    setError("");
    setEditing(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const updated = await api<Rider>("/rider/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          vehicleNumber: form.vehicleNumber,
          vehicleBrand: form.vehicleBrand,
          vehicleModel: form.vehicleModel,
          licenseNumber: form.licenseNumber,
        }),
      });
      setRider(updated);
      setForm({
        name: updated.application?.fullName ?? updated.fullName ?? updated.user.name ?? "",
        phone: updated.user.phone ?? updated.application?.phone ?? "",
        address: updated.application?.address ?? updated.address ?? "",
        city: updated.application?.city ?? updated.city ?? "",
        state: updated.application?.state ?? updated.state ?? "",
        pincode: updated.application?.pincode ?? updated.pincode ?? "",
        vehicleNumber: updated.vehicleNumber ?? "",
        vehicleBrand: updated.application?.vehicleBrand ?? "",
        vehicleModel: updated.application?.vehicleModel ?? "",
        licenseNumber: updated.application?.licenseNumber ?? updated.licenseNumber ?? "",
      });
      setSaved(true);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RiderShell>
      {!rider ? (
        <Loading />
      ) : (
        <div className="profile-grid profile-view-grid">
          <section className="profile-card profile-summary">
            <div className="large-avatar">{form.name[0]?.toUpperCase() ?? "R"}</div>
            <h2>{form.name || "Rider"}</h2>
            <p>{rider.user.email}</p>
            <span className={`verified ${rider.isOnline ? "" : "muted-badge"}`}>
              {rider.isOnline ? "Online" : "Offline"}
            </span>
            <div className="profile-stats">
              <span><strong>{rider.totalDeliveries}</strong>Deliveries</span>
              <span><strong>★ {rider.rating.toFixed(1)}</strong>Rating</span>
              <span><strong>₹{rider.totalEarnings.toFixed(0)}</strong>Earnings</span>
            </div>
          </section>

          <section className="profile-card">
            <div className="section-heading">
              <div>
                <span className="kicker orange">Personal details</span>
                <h3>Rider information</h3>
              </div>
              <button type="button" className="button profile-edit-button" onClick={openEdit}>
                <Pencil size={16} /> Edit
              </button>
            </div>
            {saved ? <p className="saved profile-saved">Profile updated successfully</p> : null}
            {error ? <p className="form-error">{error}</p> : null}

            <div className="profile-details">
              <div><span>Full name</span><strong>{form.name || "Not available"}</strong></div>
              <div><span>Phone number</span><strong>{form.phone || "Not available"}</strong></div>
              <div><span>Email address</span><strong>{rider.user.email || "Not available"}</strong></div>
              <div className="profile-detail-wide"><span>Address</span><strong>{form.address || "Not available"}</strong></div>
              <div><span>City</span><strong>{form.city || "Not available"}</strong></div>
              <div><span>State</span><strong>{form.state || "Not available"}</strong></div>
              <div><span>Pincode</span><strong>{form.pincode || "Not available"}</strong></div>
              <div><span>Availability</span><strong>{rider.isAvailable ? "Available" : "Unavailable"}</strong></div>
            </div>
          </section>

          <section className="profile-card profile-vehicle-card">
            <span className="kicker orange">Vehicle</span>
            <h3>{rider.vehicleType}</h3>
            <div className="profile-details vehicle-details">
              <div><span>Vehicle number</span><strong>{form.vehicleNumber || "Not available"}</strong></div>
              <div><span>Vehicle brand</span><strong>{form.vehicleBrand || "Not available"}</strong></div>
              <div><span>Vehicle model</span><strong>{form.vehicleModel || "Not available"}</strong></div>
              <div><span>License number</span><strong>{form.licenseNumber || "Not available"}</strong></div>
            </div>
          </section>
        </div>
      )}

      {editing ? (
        <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditing(false);
        }}>
          <section className="profile-edit-modal" role="dialog" aria-modal="true" aria-label="Edit rider profile">
            <div className="section-heading">
              <div>
                <span className="kicker orange">Personal & vehicle details</span>
                <h3>Edit profile</h3>
              </div>
              <button type="button" className="profile-modal-close" onClick={() => setEditing(false)} aria-label="Close edit form">
                <X size={19} />
              </button>
            </div>
            <form className="profile-form" onSubmit={(event) => void save(event)}>
              {[
                ["name", "Full name", "text"],
                ["phone", "Phone number", "tel"],
                ["address", "Address", "text"],
                ["city", "City", "text"],
                ["state", "State", "text"],
                ["pincode", "Pincode", "text"],
                ["vehicleNumber", "Vehicle number", "text"],
                ["vehicleBrand", "Vehicle brand", "text"],
                ["vehicleModel", "Vehicle model", "text"],
                ["licenseNumber", "Driving license number", "text"],
              ].map(([field, label, type]) => (
                <label key={field}>
                  {label}
                  <input
                    type={type}
                    value={form[field as keyof typeof form]}
                    onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                    required={field === "name" || field === "phone" || field === "address"}
                  />
                </label>
              ))}
              {error ? <p className="form-error">{error}</p> : null}
              <div className="profile-modal-actions">
                <button type="button" className="button profile-cancel-button" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="button" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </RiderShell>
  );
}
