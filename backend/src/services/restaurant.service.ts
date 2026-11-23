import prisma from "../config/prisma.js";

export type RestaurantQuery = {
  search?: string;
  cuisine?: string;
  rating?: number;
  vegOnly?: boolean;
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
};

function distanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(latitude2 - latitude1);
  const dLon = toRadians(longitude2 - longitude1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRestaurantSummary(restaurant: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cuisines: { cuisine: { name: string } }[];
  rating: number;
  deliveryTime: string | null;
  city: string | null;
  address: string | null;
  coverImage: string | null;
  logo: string | null;
  isOpen: boolean;
  isActive: boolean;
  minimumOrder: number;
  latitude: number | null;
  longitude: number | null;
  menuItems?: { isVeg: boolean }[];
}) {
  const cuisine = restaurant.cuisines[0]?.cuisine.name ?? "Local favourites";

  return {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description ?? "",
    cuisine,
    rating: restaurant.rating,
    priceLevel: restaurant.minimumOrder >= 700 ? 3 : restaurant.minimumOrder >= 400 ? 2 : 1,
    deliveryTime: restaurant.deliveryTime ?? "30-40 min",
    city: restaurant.city ?? "",
    location: restaurant.address ?? "",
    image: restaurant.coverImage ?? restaurant.logo ?? "",
    isOpen: restaurant.isOpen && restaurant.isActive,
    isVegFriendly: restaurant.menuItems?.some((item) => item.isVeg) ?? false,
    offer: null,
  };
}

export async function listRestaurants(query: RestaurantQuery = {}) {
  const search = (query.search ?? "").trim().toLowerCase();
  const cuisine = (query.cuisine ?? "").trim();
  const rating = Number(query.rating ?? 0);
  const vegOnly = Boolean(query.vegOnly);
  const city = (query.city ?? "").trim();
  const latitude = Number.isFinite(query.latitude) ? query.latitude : undefined;
  const longitude = Number.isFinite(query.longitude) ? query.longitude : undefined;
  const radiusKm = Number.isFinite(query.radiusKm) ? Math.max(1, query.radiusKm ?? 25) : 25;

  const restaurants = await prisma.restaurant.findMany({
    where: {
      isActive: true,
      ...(rating ? { rating: { gte: rating } } : {}),
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }, { city: { contains: search, mode: "insensitive" } }] }
        : {}),
      ...(cuisine && cuisine !== "all" ? { cuisines: { some: { cuisine: { name: { equals: cuisine, mode: "insensitive" } } } } } : {}),
      ...(vegOnly ? { menuItems: { some: { isVeg: true, isAvailable: true } } } : {}),
    },
    include: {
      cuisines: { include: { cuisine: true } },
      menuItems: { where: { isAvailable: true }, select: { isVeg: true }, take: 1 },
    },
    orderBy: [{ rating: "desc" }, { name: "asc" }],
  });

  const filtered = restaurants.filter((restaurant) => {
    if (!city && (latitude === undefined || longitude === undefined)) return true;
    if (city && restaurant.city?.toLowerCase().includes(city.toLowerCase())) return true;
    if (latitude !== undefined && longitude !== undefined && restaurant.latitude !== null && restaurant.longitude !== null) {
      return distanceKm(latitude, longitude, restaurant.latitude, restaurant.longitude) <= radiusKm;
    }
    return false;
  });

  return filtered.map(toRestaurantSummary);
}

export async function getRestaurantBySlug(slug: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { slug, isActive: true },
    include: {
      cuisines: { include: { cuisine: true } },
      categories: {
        orderBy: { displayOrder: "asc" },
        include: { items: { where: { isAvailable: true }, orderBy: { name: "asc" } } },
      },
    },
  });

  if (!restaurant) return null;

  return {
    ...toRestaurantSummary(restaurant),
    categories: restaurant.categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: category.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        price: item.discountPrice ?? item.price,
        isVeg: item.isVeg,
        image: item.image,
      })),
    })),
  };
}
