"use client";
import { useEffect, useState } from "react";
import RiderShell from "@/components/RiderShell";
import { api } from "@/lib/api";
import { Empty, Loading } from "@/components/PageState";
type Item = {
  id: string;
  status: string;
  createdAt: string;
  deliveredAt: string | null;
  order: {
    id: string;
    total: number;
    restaurant: { name: string };
    address: { fullAddress: string } | null;
  };
};
export default function HistoryPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void api<Item[]>("/rider/history")
      .then(setItems)
      .catch((cause: Error) => setError(cause.message));
  }, []);
  return (
    <RiderShell>
      <div className="page-intro">
        <p>A clear record of completed and cancelled deliveries.</p>
        {error && <p className="form-error">{error}</p>}
      </div>
      {!items ? (
        <Loading />
      ) : !items.length ? (
        <Empty
          title="No completed deliveries yet"
          text="Your finished deliveries will appear here."
        />
      ) : (
        <div className="history-list">
          {items.map((item) => (
            <div className="history-row" key={item.id}>
              <div>
                <span className="kicker">
                  #{item.order.id.slice(-8).toUpperCase()}
                </span>
                <strong>{item.order.restaurant.name}</strong>
                <small>
                  {item.order.address?.fullAddress ?? "Address unavailable"}
                </small>
              </div>
              <div>
                <span className={`badge ${item.status === "CANCELLED" ? "badge-orange" : ""}`}>
                  {item.status.replaceAll("_", " ")}
                </span>
                <strong>₹{item.order.total.toFixed(0)}</strong>
                <small>
                  {new Date(item.deliveredAt ?? item.createdAt).toLocaleDateString("en-IN")}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </RiderShell>
  );
}
