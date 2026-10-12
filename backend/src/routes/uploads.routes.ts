import { randomUUID } from "node:crypto";

import { Router } from "express";
import { z } from "zod";

import cloudinary, { hasCloudinaryConfig } from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const signatureSchema = z.object({
  uploadType: z.enum(["application", "menu"]),
  applicationType: z.enum(["owner", "rider"]).optional(),
  documentType: z.string().trim().regex(/^[a-zA-Z0-9_-]+$/).max(60),
}).superRefine((value, context) => {
  if (value.uploadType === "application" && !value.applicationType) {
    context.addIssue({ code: "custom", path: ["applicationType"], message: "Application type is required." });
  }
});

router.post("/signature", requireAuth, (req, res) => {
  if (!hasCloudinaryConfig) {
    return res.status(503).json({
      success: false,
      message: "Cloudinary upload storage is not configured on the server.",
      code: "CLOUDINARY_NOT_CONFIGURED",
    });
  }

  const parsed = signatureSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      message: "A valid application type and document type are required.",
      code: "VALIDATION_ERROR",
    });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = parsed.data.uploadType === "menu"
    ? `restaurants/${req.user!.id}/menu`
    : `applications/${req.user!.id}/${parsed.data.applicationType}`;
  const publicId = `${parsed.data.documentType}-${timestamp}-${randomUUID()}`;
  const signature = cloudinary.utils.api_sign_request(
    { folder, public_id: publicId, timestamp },
    env.CLOUDINARY_API_SECRET,
  );

  return res.json({
    success: true,
    data: {
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      folder,
      publicId,
      signature,
      timestamp,
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    },
  });
});

export default router;
