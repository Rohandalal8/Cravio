import { Router } from "express";

import {
  getRestaurantBySlug,
  listRestaurants,
} from "../services/restaurant.service.js";

const router = Router();

router.get("/restaurants", async (req, res, next) => {
  try {
    const restaurants = await listRestaurants({
      search:
        typeof req.query.search === "string" ? req.query.search : undefined,
      cuisine:
        typeof req.query.cuisine === "string" ? req.query.cuisine : undefined,
      rating:
        typeof req.query.rating === "string"
          ? Number(req.query.rating)
          : undefined,
      vegOnly: req.query.veg === "true",
      city: typeof req.query.city === "string" ? req.query.city : undefined,
      latitude:
        typeof req.query.latitude === "string"
          ? Number(req.query.latitude)
          : undefined,
      longitude:
        typeof req.query.longitude === "string"
          ? Number(req.query.longitude)
          : undefined,
      radiusKm:
        typeof req.query.radiusKm === "string"
          ? Number(req.query.radiusKm)
          : undefined,
    });

    res.status(200).json({ success: true, data: restaurants });
  } catch (error) {
    next(error);
  }
});

router.get("/restaurants/:slug", async (req, res, next) => {
  try {
    const restaurant = await getRestaurantBySlug(req.params.slug);

    if (!restaurant) {
      res
        .status(404)
        .json({
          success: false,
          message: "Restaurant not found.",
          code: "RESTAURANT_NOT_FOUND",
        });
      return;
    }

    res.status(200).json({ success: true, data: restaurant });
  } catch (error) {
    next(error);
  }
});

export default router;
