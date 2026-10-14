"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { RestaurantCard } from "@/components/restaurant-card";
import { fetchRestaurants, type Restaurant } from "@/lib/restaurants";

const categories = ["Pizza", "Biryani", "Chinese", "Cafe", "Healthy", "Desserts"];

export default function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRestaurants = async () => {
      try {
        const response = await fetchRestaurants({ search: "", rating: 4.5 });
        if (active) {
          setRestaurants(response.data ?? []);
        }
      } catch (error) {
        console.error("Failed to load featured restaurants:", error);
        if (active) setRestaurants([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadRestaurants();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#fff8f1] text-[#252126]">
      <section className="px-5 pb-12 pt-10 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1200px] items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex rounded-full border border-[#eadfc4] bg-[#fffaf0] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b96a1d]">
              Curated delivery for city nights
            </div>
            <h1 className="mt-6 font-serif text-5xl leading-[0.95] tracking-[-0.05em] text-[#28241f] sm:text-6xl lg:text-7xl">
              Discover great food around you.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#5d554c]">
              Find restaurants, explore menus, and order your favorites with fast delivery and thoughtful recommendations.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <input
                className="flex-1 rounded-xl border border-[#eae3e5] bg-white px-5 py-3.5 text-sm text-[#252126] outline-none ring-0 placeholder:text-[#716a70] focus:border-[#8b1e3f] focus:ring-2 focus:ring-[#8b1e3f]/15"
                placeholder="Search restaurant, cuisine, or dish"
              />
              <Link
                href="/restaurants"
                className="rounded-xl bg-[#8b1e3f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#64152d]"
              >
                Search now
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {categories.map((category) => (
                <span key={category} className="rounded-full border border-[#eae3e5] bg-white px-3 py-1.5 text-xs font-semibold text-[#716a70]">
                  {category}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#eae3e5] bg-white p-4 shadow-[0_16px_50px_rgba(37,33,38,0.08)]">
            <div className="overflow-hidden rounded-xl bg-[#f7f4f5]">
              <img
                src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80"
                alt="Premium food spread"
                className="h-[420px] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e85d4a]">Popular picks</p>
              <h2 className="mt-2 font-serif text-4xl tracking-[-0.04em] text-[#252126]">Restaurants worth exploring</h2>
            </div>
            <Link href="/restaurants" className="hidden text-sm font-semibold text-[#8b1e3f] md:inline-flex">
              View all →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-2xl border border-[#eae3e5] bg-white p-4">
                  <div className="h-56 rounded-xl bg-[#f7f4f5]" />
                  <div className="mt-4 h-5 w-2/3 rounded bg-[#f7f4f5]" />
                  <div className="mt-3 h-4 w-full rounded bg-[#f7f4f5]" />
                  <div className="mt-2 h-4 w-5/6 rounded bg-[#f7f4f5]" />
                </div>
              ))
            ) : (
              restaurants.slice(0, 3).map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)
            )}
          </div>
        </div>
      </section>
      </main>
  );
}
