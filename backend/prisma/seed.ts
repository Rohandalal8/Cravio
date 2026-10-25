import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const restaurants = [
  {
    name: "Saffron Courtyard",
    slug: "saffron-courtyard",
    description: "Slow-simmered North Indian classics and modern tandoor favourites.",
    cuisine: "North Indian",
    city: "Bengaluru",
    address: "12 100 Feet Road, Indiranagar",
    coverImage: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    deliveryTime: "25-35 min",
    minimumOrder: 400,
    rating: 4.8,
    categories: [
      { name: "House favourites", items: [["Paneer Tikka Bowl", "Smoky paneer, saffron rice, charred greens", 349, true], ["Butter Chicken Feast", "Creamy tomato gravy with soft naan and salad", 429, false]] },
      { name: "Small plates", items: [["Crispy Corn Chaat", "Tangy, spicy, and fresh with lime and herbs", 189, true], ["Dal Makhani", "Slow-cooked lentils with butter and spice", 299, true]] },
    ],
  },
  {
    name: "Bamboo Wok",
    slug: "bamboo-wok",
    description: "Wok-fired comfort food with generous portions and bold flavour.",
    cuisine: "Chinese",
    city: "Bengaluru",
    address: "44 80 Feet Road, Koramangala",
    coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    deliveryTime: "20-30 min",
    minimumOrder: 400,
    rating: 4.6,
    categories: [{ name: "Wok classics", items: [["Chilli Garlic Noodles", "Hand-tossed noodles with seasonal vegetables", 289, true], ["Crispy Honey Chicken", "Lightly battered chicken in a honey glaze", 399, false]] }],
  },
  {
    name: "Cedar & Co.",
    slug: "cedar-and-co",
    description: "Fresh salads, artisan grills, and brunch plates for the whole crew.",
    cuisine: "Cafe",
    city: "Bengaluru",
    address: "7 Palm Meadows, Whitefield",
    coverImage: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
    deliveryTime: "30-40 min",
    minimumOrder: 700,
    rating: 4.9,
    categories: [{ name: "All day dining", items: [["Cedar Grain Bowl", "Roasted vegetables, grains, herbs, and tahini", 379, true], ["Chef's Platter", "A curated mix of house specials for sharing", 699, false]] }],
  },
];

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "owner@cravio.test" },
    update: {},
    create: { email: "owner@cravio.test", name: "Cravio Demo Owner", role: UserRole.RESTAURANT_OWNER },
  });

  for (const [restaurantIndex, restaurant] of restaurants.entries()) {
    const cuisine = await prisma.cuisine.upsert({ where: { name: restaurant.cuisine }, update: {}, create: { name: restaurant.cuisine } });
    const savedRestaurant = await prisma.restaurant.upsert({
      where: { slug: restaurant.slug },
      update: { name: restaurant.name, description: restaurant.description, coverImage: restaurant.coverImage, rating: restaurant.rating },
      create: {
        ownerId: owner.id,
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        city: restaurant.city,
        address: restaurant.address,
        coverImage: restaurant.coverImage,
        deliveryTime: restaurant.deliveryTime,
        minimumOrder: restaurant.minimumOrder,
        rating: restaurant.rating,
        cuisines: { create: { cuisineId: cuisine.id } },
      },
    });

    for (const [categoryIndex, category] of restaurant.categories.entries()) {
      const savedCategory = await prisma.menuCategory.upsert({
        where: { restaurantId_name: { restaurantId: savedRestaurant.id, name: category.name } },
        update: { displayOrder: categoryIndex },
        create: { restaurantId: savedRestaurant.id, name: category.name, displayOrder: categoryIndex },
      });

      for (const item of category.items) {
        const [name, description, price, isVeg] = item;
        await prisma.menuItem.upsert({
          where: { id: `${savedRestaurant.id}-${String(name).toLowerCase().replaceAll(" ", "-")}` },
          update: { description: String(description), price: Number(price), isVeg: Boolean(isVeg), isAvailable: true },
          create: { id: `${savedRestaurant.id}-${String(name).toLowerCase().replaceAll(" ", "-")}`, restaurantId: savedRestaurant.id, categoryId: savedCategory.id, name: String(name), description: String(description), price: Number(price), isVeg: Boolean(isVeg) },
        });
      }
    }

    if (restaurantIndex === 0) {
      await prisma.restaurant.update({ where: { id: savedRestaurant.id }, data: { isOpen: true, isActive: true } });
    }
  }
}

main().finally(async () => prisma.$disconnect());
