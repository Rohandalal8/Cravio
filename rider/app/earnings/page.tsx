"use client";
import { useEffect, useState } from "react";
import RiderShell from "@/components/RiderShell";
import { api } from "@/lib/api";
import { Empty, Loading } from "@/components/PageState";
type Earning = { id: string; amount: number; createdAt: string };
export default function EarningsPage() {
  const [items, setItems] = useState<Earning[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void api<Earning[]>("/rider/earnings")
      .then(setItems)
      .catch((cause: Error) => setError(cause.message));
  }, []);
  const total = items?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  return (
    <RiderShell>
      <div className="earnings-hero">
        <span className="kicker orange">All-time earnings</span>
        <strong>₹{total.toFixed(0)}</strong>
        <p>Every completed delivery adds up.</p>
        {error && <p className="form-error">{error}</p>}
      </div>
      {!items ? (
        <Loading />
      ) : !items.length ? (
        <Empty
          title="No earnings yet"
          text="Complete your first delivery to see your earnings here."
        />
      ) : (
        <section className="earnings-list">
          <div className="section-heading">
            <h3>Recent earnings</h3>
            <span>{items.length} deliveries</span>
          </div>
          {items.map((item) => (
            <div className="earning-row" key={item.id}>
              <div>
                <span className="earning-icon">↗</span>
                <span>
                  <strong>Delivery completed</strong>
                  <small>
                    {new Date(item.createdAt).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })}
                  </small>
                </span>
              </div>
              <strong>+ ₹{item.amount.toFixed(0)}</strong>
            </div>
          ))}
        </section>
      )}
    </RiderShell>
  );
}
