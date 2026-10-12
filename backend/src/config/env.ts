import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/luxebites?schema=public"),
  CLIENT_URL: z.string().default("http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FIREBASE_PROJECT_ID: z.string().optional().default(""),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(""),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(""),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);
