import Link from "next/link";

import type { Restaurant } from "@/lib/restaurants";

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const price = "$".repeat(Math.max(1, restaurant.priceLevel));

  return (
    <article className="group overflow-hidden rounded-2xl border border-[#eae3e5] bg-white shadow-[0_8px_24px_rgba(37,33,38,0.07)] transition hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(37,33,38,0.12)]">
      <div className="relative h-56 overflow-hidden">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {restaurant.offer ? (
          <span className="absolute left-4 top-4 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b1e3f]">
            {restaurant.offer}
          </span>
        ) : null}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-2xl tracking-[-0.04em] text-[#252126]">{restaurant.name}</h3>
            <p className="mt-1 text-sm font-medium text-[#8b1e3f]">{restaurant.cuisine}</p>
          </div>
          <span className="rounded-lg bg-[#f7e9ed] px-2 py-1 text-xs font-bold text-[#8b1e3f]">
            ★ {restaurant.rating.toFixed(1)}
          </span>
        </div>

        <p className="text-sm leading-6 text-[#716a70]">{restaurant.description}</p>

        <div className="flex items-center justify-between border-t border-[#eae3e5] pt-4 text-sm text-[#716a70]">
          <span>{restaurant.location}</span>
          <span>{restaurant.deliveryTime}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#8b1e3f]">{price}</span>
          <Link
            href={`/restaurants/${restaurant.slug}`}
            className="rounded-full border border-[#eae3e5] bg-[#fff8f1] px-4 py-2 text-sm font-semibold text-[#8b1e3f] transition hover:border-[#8b1e3f] hover:bg-[#f7e9ed]"
          >
            View menu
          </Link>
        </div>
      </div>
    </article>
  );
}
