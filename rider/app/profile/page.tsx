"use client";
import { FormEvent, useEffect, useState } from "react";
import RiderShell, { Rider } from "@/components/RiderShell";
import { api } from "@/lib/api";
import { Loading } from "@/components/PageState";
export default function ProfilePage() {
  const [rider, setRider] = useState<Rider | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void api<Rider>("/rider/me")
      .then((value) => {
        setRider(value);
        setName(value.fullName ?? value.user.name ?? "");
        setPhone(value.user.phone ?? "");
        setAddress(value.address ?? "");
        setCity(value.city ?? "");
        setState(value.state ?? "");
        setPincode(value.pincode ?? "");
      })
      .catch((cause: Error) => setError(cause.message));
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    try {
      const updated = await api<Rider>("/rider/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, phone, address, city, state, pincode }),
      });
      setRider(updated);
      setName(updated.fullName ?? updated.user.name ?? "");
      setPhone(updated.user.phone ?? "");
      setAddress(updated.address ?? "");
      setCity(updated.city ?? "");
      setState(updated.state ?? "");
      setPincode(updated.pincode ?? "");
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save profile.");
    }
  }
  return (
    <RiderShell>
      {!rider ? (
        <Loading />
      ) : (
        <div className="profile-grid">
          <section className="profile-card profile-summary">
            <div className="large-avatar">{name[0] ?? "R"}</div>
            <h2>{name || "Rider"}</h2>
            <p>{rider.user.email}</p>
            <div className="profile-stats">
              <span>
                <strong>{rider.totalDeliveries}</strong>Deliveries
              </span>
              <span>
                <strong>★ {rider.rating.toFixed(1)}</strong>Rating
              </span>
            </div>
          </section>
          <section className="profile-card">
            <div className="section-heading">
              <div>
                <span className="kicker orange">Personal details</span>
                <h3>Your profile</h3>
              </div>
              {saved && <span className="saved">Saved</span>}
            </div>
            <form
              className="profile-form"
              onSubmit={(event) => void save(event)}
            >
              <label>
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label>
                Phone number
                <input
                  value={phone}
                  type="tel"
                  inputMode="numeric"
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </label>
              <label>
                Email address
                <input value={rider.user.email ?? ""} disabled />
              </label>
              <label>
                Address
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </label>
              <label>
                City
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>
              <label>
                State
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </label>
              <label>
                Pincode
                <input
                  value={pincode}
                  inputMode="numeric"
                  onChange={(e) => setPincode(e.target.value)}
                />
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <button className="button">Save changes</button>
            </form>
          </section>
          <section className="profile-card">
            <span className="kicker orange">Vehicle</span>
            <h3>{rider.vehicleType}</h3>
            <p className="muted">{rider.vehicleNumber}</p>
            <span className="verified">✓ Verification on file</span>
          </section>
        </div>
      )}
    </RiderShell>
  );
}
