"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import { useCart } from "@/contexts/cart-context";
import { fetchRestaurant, type RestaurantDetails } from "@/lib/restaurants";

function RestaurantDetailPageContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [priceSort, setPriceSort] = useState<"none" | "low-to-high" | "high-to-low">("none");
  const { addItem } = useCart();

  useEffect(() => {
    let active = true;

    const loadRestaurant = async () => {
      try {
        const response = await fetchRestaurant(slug);

        if (active) {
          setRestaurant(response.data);
        }
      } catch (loadError) {
        console.error(loadError);
        if (active) {
          setError("Unable to load this restaurant right now.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRestaurant();

    return () => { active = false; };
  }, [slug]);

  const price = useMemo(() => (restaurant ? "$".repeat(Math.max(1, restaurant.priceLevel)) : ""), [restaurant]);
  const visibleMenuItems = useMemo(() => {
    const items = restaurant?.categories.flatMap((category) => category.items) ?? [];
    const filteredItems = vegOnly ? items.filter((item) => item.isVeg) : [...items];

    if (priceSort === "low-to-high") {
      return filteredItems.sort((first, second) => first.price - second.price);
    }

    if (priceSort === "high-to-low") {
      return filteredItems.sort((first, second) => second.price - first.price);
    }

    return filteredItems;
  }, [priceSort, restaurant?.categories, vegOnly]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4ee] px-5 py-10 text-[#28241f] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1200px] animate-pulse space-y-6">
          <div className="h-8 w-40 rounded bg-[#efe7dc]" />
          <div className="h-80 rounded-[2rem] bg-[#efe7dc]" />
          <div className="h-6 w-2/3 rounded bg-[#efe7dc]" />
        </div>
      </main>
    );
  }

  if (error || !restaurant) {
    return (
      <main className="min-h-screen bg-[#f7f4ee] px-5 py-10 text-[#28241f] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[600px] rounded-[2rem] border border-[#e8e0d4] bg-[#fffdf9] p-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#d97732]">Restaurant unavailable</p>
          <h1 className="mt-4 font-serif text-4xl tracking-[-0.04em]">{error ?? "No restaurant found"}</h1>
          <Link href="/restaurants" className="mt-8 inline-flex rounded-full bg-[#273b32] px-5 py-3 text-sm font-semibold text-[#fffaf1]">
            Back to restaurants
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#28241f]">
      <section className="px-5 pb-12 pt-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1200px] overflow-hidden rounded-[2rem] border border-[#e8e0d4] bg-[#fffdf9] shadow-[0_18px_60px_rgba(40,36,31,0.08)]">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative min-h-[360px] overflow-hidden">
              {restaurant.image ? (
                <img src={restaurant.image} alt={restaurant.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[360px] items-center justify-center bg-[#f7e9ed] text-5xl font-bold text-[#8b1e3f]" aria-hidden="true">
                  {restaurant.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#1d2d26]/65 via-[#1d2d26]/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 text-[#fffaf1]">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f8c76d]">{restaurant.cuisine}</p>
                <h1 className="mt-3 font-serif text-4xl tracking-[-0.04em] sm:text-5xl">{restaurant.name}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#f3ebdf]">
                  <span>★ {restaurant.rating.toFixed(1)}</span>
                  <span>{restaurant.deliveryTime}</span>
                  <span>{restaurant.location}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between p-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d97732]">About this place</p>
                <p className="mt-4 text-base leading-7 text-[#5f574f]">{restaurant.description}</p>
              </div>

              <div className="mt-8 space-y-4 rounded-[1.5rem] bg-[#f7f3ed] p-5">
                <div className="flex items-center justify-between text-sm text-[#5b554e]">
                  <span>Price</span>
                  <span className="font-bold text-[#273b32]">{price}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-[#5b554e]">
                  <span>Delivery</span>
                  <span className="font-bold text-[#273b32]">{restaurant.deliveryTime}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-[#5b554e]">
                  <span>Status</span>
                  <span className={`font-bold ${restaurant.isOpen ? "text-[#186a40]" : "text-[#8b1f1f]"}`}>
                    {restaurant.isOpen ? "Open now" : "Closed"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d97732]">Popular dishes</p>
              <h2 className="mt-2 font-serif text-4xl tracking-[-0.04em] text-[#28241f]">Menu favourites</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-[#ded7cb] bg-[#fffdf9] px-4 py-2 text-sm font-medium text-[#4e493f]">
                <input type="checkbox" checked={vegOnly} onChange={(event) => setVegOnly(event.target.checked)} />
                Veg only
              </label>
              <label className="flex items-center gap-2 rounded-full border border-[#ded7cb] bg-[#fffdf9] px-4 py-2 text-sm font-medium text-[#4e493f]">
                <span className="sr-only">Sort menu by price</span>
                <select value={priceSort} onChange={(event) => setPriceSort(event.target.value as typeof priceSort)} className="bg-transparent outline-none">
                  <option value="none">Sort by price</option>
                  <option value="low-to-high">Price: low to high</option>
                  <option value="high-to-low">Price: high to low</option>
                </select>
              </label>
            </div>
          </div>

          {visibleMenuItems.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleMenuItems.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] border border-[#e7dfd2] bg-[#fffdf9] p-5 shadow-[0_10px_30px_rgba(40,36,31,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-2xl tracking-[-0.04em] text-[#28241f]">{item.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#70675f]">{item.description}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-bold text-[#273b32]">₹{item.price}</span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    addItem({
                      id: item.id,
                      name: item.name,
                      restaurantId: restaurant.id,
                      restaurantName: restaurant.name,
                      slug: restaurant.slug,
                      image: restaurant.image,
                      price: item.price,
                    })
                  }
                  className="mt-6 inline-flex rounded-full bg-[#273b32] px-4 py-2 text-sm font-semibold text-[#fffaf1] transition hover:bg-[#1b2823]"
                >
                  Add to cart
                </button>
              </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#d9cdb9] bg-[#fffdf9] p-10 text-center text-sm text-[#665d55]">
              No vegetarian dishes match the selected filters.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function RestaurantDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return <RestaurantDetailPageContent params={params} />;
}
