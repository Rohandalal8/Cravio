"use client";

import { useEffect, useState } from "react";

import { RestaurantCard } from "@/components/restaurant-card";
import { fetchRestaurants, type Restaurant } from "@/lib/restaurants";

const cuisines = ["all", "North Indian", "Chinese", "Cafe", "Pizza", "Biryani", "Healthy"];

export default function RestaurantsPage() {
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState("all");
  const [vegOnly, setVegOnly] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadRestaurants = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchRestaurants({
          search,
          cuisine: cuisine === "all" ? undefined : cuisine,
          veg: vegOnly,
        });

        if (active) {
          setRestaurants(response.data ?? []);
        }
      } catch (loadError) {
        console.error("Failed to load restaurants:", loadError);
        if (active) setError("Could not load restaurants right now.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadRestaurants();

    return () => {
      active = false;
    };
  }, [search, cuisine, vegOnly]);

  return (
    <main className="min-h-screen bg-[#fff8f1] text-[#252126]">
      <section className="border-b border-[#64152d] bg-[#8b1e3f] px-5 py-14 text-white sm:px-8 lg:px-12 lg:py-18">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-4 text-xs font-bold tracking-[0.25em] text-[#ffd0c8] uppercase">A better table awaits</p>
          <h1 className="font-serif text-5xl leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Good food is closer than you think.</h1>

          <div className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <label className="flex min-h-14 flex-1 items-center gap-3 rounded-xl bg-[#fffdf9] px-5 text-[#81786c] shadow-lg shadow-[#14241d]/20">
              <span className="text-xl" aria-hidden="true">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by restaurant, cuisine, or neighborhood"
                className="w-full bg-transparent text-sm text-[#252126] outline-none placeholder:text-[#716a70]"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {cuisines.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCuisine(item)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  cuisine === item ? "bg-[#8b1e3f] text-white" : "border border-[#eae3e5] bg-white text-[#716a70]"
                }`}
              >
                {item === "all" ? "All cuisines" : item}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 rounded-full border border-[#eae3e5] bg-white px-4 py-2 text-sm font-medium text-[#252126]">
            <input type="checkbox" checked={vegOnly} onChange={(event) => setVegOnly(event.target.checked)} />
            Veg only
          </label>
        </div>

        {error ? <p className="rounded-xl border border-[#f2cccc] bg-[#fff6f5] p-4 text-sm text-[#c93636]">Could not load restaurants right now.</p> : null}

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-[#eae3e5] bg-white p-4">
                <div className="h-56 rounded-xl bg-[#f7f4f5]" />
                <div className="mt-4 h-5 w-2/3 rounded bg-[#f7f4f5]" />
                <div className="mt-3 h-4 w-full rounded bg-[#f7f4f5]" />
              </div>
            ))}
          </div>
        ) : restaurants.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d6c9cd] bg-white p-12 text-center">
            <h3 className="font-serif text-3xl tracking-[-0.04em] text-[#252126]">No restaurants match your filters.</h3>
            <p className="mt-3 text-[#716a70]">Try another cuisine or search phrase to find a new favorite.</p>
          </div>
        )}
      </section>
      </main>
  );
}
