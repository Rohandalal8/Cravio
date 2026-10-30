"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import RiderShell from "@/components/RiderShell";
import { api } from "@/lib/api";
import { Empty, ErrorState, Loading } from "@/components/PageState";
type Delivery = {
  id: string;
  riderId: string | null;
  status: string;
  createdAt: string;
  order: {
    id: string;
    total: number;
    restaurant: { name: string; address: string | null };
    address: { fullAddress: string } | null;
  };
};
export default function DeliveriesPage() {
  const [items, setItems] = useState<Delivery[] | null>(null);
  const [error, setError] = useState("");
  const load = () => {
    void api<Delivery[]>("/rider/deliveries")
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  };
  useEffect(load, []);
  async function accept(id: string) {
    try {
      await api(`/rider/deliveries/${id}/accept`, { method: "POST" });
      load();
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  }
  return (
    <RiderShell>
      <div className="page-intro">
        <div>
          <p>Manage your route and keep every handoff smooth.</p>
        </div>
        <Link className="button secondary" href="/history">
          View history
        </Link>
      </div>
      {error && <ErrorState message={error} retry={load} />}
      {!items ? (
        <Loading />
      ) : !items.length ? (
        <Empty
          title="No deliveries available"
          text="You are online. We'll notify you when a delivery becomes available."
        />
      ) : (
        <div className="delivery-list">
          {items.map((item) => (
            <article className="delivery-card" key={item.id}>
              <div className="delivery-head">
                <div>
                  <span className="kicker">
                    Delivery #{item.id.slice(-6).toUpperCase()}
                  </span>
                  <h3>{item.order.restaurant.name}</h3>
                </div>
                <span
                  className={`badge ${item.status === "SEARCHING_RIDER" ? "badge-orange" : ""}`}
                >
                  {item.status.replaceAll("_", " ")}
                </span>
              </div>
              <div className="delivery-route">
                <div>
                  <b>Pickup</b>
                  <span>
                    {item.order.restaurant.address ?? "Address unavailable"}
                  </span>
                </div>
                <div>
                  <b>Drop-off</b>
                  <span>
                    {item.order.address?.fullAddress ?? "Address pending"}
                  </span>
                </div>
              </div>
              <div className="delivery-foot">
                <strong>Order total ₹{item.order.total.toFixed(0)}</strong>
                <small>
                  {new Date(item.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </small>
                {item.status === "SEARCHING_RIDER" ? (
                  <button
                    className="button"
                    onClick={() => void accept(item.id)}
                  >
                    Accept delivery
                  </button>
                ) : (
                  <Link
                    className="button secondary"
                    href={`/deliveries/${item.id}`}
                  >
                    Open delivery
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </RiderShell>
  );
}
