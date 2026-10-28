"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import RiderShell, { Rider } from "@/components/RiderShell";
import { api } from "@/lib/api";
import { ErrorState, Loading } from "@/components/PageState";
type Delivery = {
  id: string;
  status: string;
  order: {
    id: string;
    total: number;
    restaurant: { name: string; address: string | null };
    address: { fullAddress: string } | null;
  };
};
type Dashboard = {
  rider: Rider;
  todayDeliveries: number;
  activeDelivery: Delivery | null;
  todayEarnings: number;
  weeklyEarnings: number;
};
export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const load = () => {
    setError("");
    void api<Dashboard>("/rider/dashboard")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  };
  useEffect(load, []);
  return (
    <RiderShell>
      <section className="welcome">
        <div>
          <span className="kicker orange">Good to see you</span>
          <h2>Keep the city moving.</h2>
          <p>Your next delivery is waiting when you are ready.</p>
        </div>
        <div className="date-chip">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </div>
      </section>
      {error ? (
        <ErrorState message={error} retry={load} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <section className="stat-grid">
            <div className="stat-card accent">
              <span>Today&apos;s earnings</span>
              <strong>₹{data.todayEarnings.toFixed(0)}</strong>
              <small>Keep going, you&apos;re doing great</small>
            </div>
            <div className="stat-card">
              <span>Today&apos;s deliveries</span>
              <strong>{data.todayDeliveries}</strong>
              <small>{data.rider.totalDeliveries} total completed</small>
            </div>
            <div className="stat-card">
              <span>This week</span>
              <strong>₹{data.weeklyEarnings.toFixed(0)}</strong>
              <small>Weekly earnings</small>
            </div>
            <div className="stat-card">
              <span>Your rating</span>
              <strong>★ {data.rider.rating.toFixed(1)}</strong>
              <small>Based on customer feedback</small>
            </div>
          </section>
          {data.activeDelivery && (
            <section className="active-card">
              <div className="section-heading">
                <div>
                  <span className="kicker orange">Active delivery</span>
                  <h3>
                    Order #
                    {data.activeDelivery.order.id.slice(-6).toUpperCase()}
                  </h3>
                </div>
                <span className="badge">
                  {data.activeDelivery.status.replaceAll("_", " ")}
                </span>
              </div>
              <div className="route">
                <div>
                  <span className="route-dot pickup" />
                  <small>Pickup</small>
                  <strong>{data.activeDelivery.order.restaurant.name}</strong>
                  <p>
                    {data.activeDelivery.order.restaurant.address ??
                      "Restaurant address unavailable"}
                  </p>
                </div>
                <div className="route-line" />
                <div>
                  <span className="route-dot drop" />
                  <small>Drop-off</small>
                  <strong>
                    {data.activeDelivery.order.address?.fullAddress ??
                      "Customer address unavailable"}
                  </strong>
                </div>
              </div>
              <Link
                className="button"
                href={`/deliveries/${data.activeDelivery.id}`}
              >
                View delivery
              </Link>
            </section>
          )}
          <section className="quick-grid">
            <Link href="/deliveries" className="quick-card">
              <span>Find deliveries</span>
              <strong>
                See what&apos;s nearby <b>→</b>
              </strong>
            </Link>
            <Link href="/earnings" className="quick-card warm">
              <span>Track your work</span>
              <strong>
                View earnings <b>→</b>
              </strong>
            </Link>
          </section>
        </>
      )}
    </RiderShell>
  );
}
