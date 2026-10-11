import { ApplicationStatus, UserRole, VehicleType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import prisma from "../config/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const optionalText = z.string().trim().max(500).optional().nullable();
const ownerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().max(320),
  address: z.string().trim().min(5).max(500),
  restaurantDescription: optionalText,
  city: optionalText,
  state: optionalText,
  pincode: optionalText,
  cuisine: optionalText,
  latitude: z.number().finite().optional().nullable(),
  longitude: z.number().finite().optional().nullable(),
  openingTime: optionalText,
  closingTime: optionalText,
  restaurantType: optionalText,
  preparationTime: z.number().int().positive().max(1440).optional().nullable(),
  minimumOrder: z.number().nonnegative().max(100000).optional().nullable(),
  logo: z.string().url().max(2000).optional().nullable(),
  coverImage: z.string().url().max(2000).optional().nullable(),
  businessDocuments: z.record(z.string(), z.json()).optional().nullable(),
});

const riderSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(320).optional(),
  vehicleType: z.nativeEnum(VehicleType),
  vehicleNumber: z.string().trim().min(2).max(40),
  licenseNumber: z.string().trim().min(2).max(80),
  vehicleBrand: optionalText,
  vehicleModel: optionalText,
  phone: z.string().trim().min(7).max(30),
  address: z.string().trim().min(5).max(500),
  city: optionalText,
  state: optionalText,
  pincode: optionalText,
  drivingLicense: z.string().url().max(2000).optional().nullable(),
  vehicleRegistration: z.string().url().max(2000).optional().nullable(),
  identityDocument: z.string().url().max(2000).optional().nullable(),
  profileImage: z.string().url().max(2000).optional().nullable(),
});

const oppositePartnerRoleFor = (kind: "owner" | "rider") => kind === "owner" ? UserRole.RIDER : UserRole.RESTAURANT_OWNER;

async function hasRole(userId: string, role: UserRole) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === role;
}

async function rejectIfOppositePartner(req: Parameters<typeof requireAuth>[0], res: Parameters<typeof requireAuth>[1], kind: "owner" | "rider") {
  if (await hasRole(req.user!.id, oppositePartnerRoleFor(kind))) {
    res.status(409).json({
      success: false,
      message: kind === "owner" ? "Riders cannot apply to become restaurant owners." : "Restaurant owners cannot apply to become riders.",
      code: "PARTNER_ROLE_CONFLICT",
    });
    return true;
  }
  return false;
}

function validationError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; ");
}

async function notifyAdmins(title: string, message: string) {
  const admins = await prisma.user.findMany({ where: { role: UserRole.ADMIN, status: "ACTIVE" }, select: { id: true } });
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({ userId: admin.id, title, message })),
    });
  }
}

router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const [user, ownerApplication, riderApplication] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user!.id }, select: { role: true } }),
      prisma.restaurantApplication.findFirst({ where: { applicantId: req.user!.id }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, rejectionReason: true, reviewedAt: true, createdAt: true } }),
      prisma.riderApplication.findFirst({ where: { applicantId: req.user!.id }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, rejectionReason: true, reviewedAt: true, createdAt: true } }),
    ]);
    return res.json({
      success: true,
      data: {
        role: user?.role ?? req.user!.role,
        roles: [user?.role ?? req.user!.role],
        ownerApplication,
        riderApplication,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/owner", requireAuth, async (req, res, next) => {
  try {
    if (await rejectIfOppositePartner(req, res, "owner")) return;
    const parsed = ownerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, message: validationError(parsed.error), code: "VALIDATION_ERROR" });

    const existing = await prisma.restaurantApplication.findFirst({
      where: { applicantId: req.user!.id, status: { in: [ApplicationStatus.PENDING, ApplicationStatus.APPROVED] } },
    });
    if (existing) return res.status(409).json({ success: false, message: existing.status === "APPROVED" ? "Your restaurant owner application is already approved." : "You already have an application under review.", code: "APPLICATION_EXISTS" });

    const application = await prisma.restaurantApplication.create({
      data: {
        ...parsed.data,
        applicantId: req.user!.id,
        businessDocuments: parsed.data.businessDocuments ?? undefined,
      },
    });
    await notifyAdmins("New Restaurant Owner Application", `${application.name} submitted a restaurant owner application.`);
    return res.status(201).json({ success: true, data: application });
  } catch (error) {
    return next(error);
  }
});

router.post("/rider", requireAuth, async (req, res, next) => {
  try {
    if (await rejectIfOppositePartner(req, res, "rider")) return;
    const parsed = riderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, message: validationError(parsed.error), code: "VALIDATION_ERROR" });

    const existing = await prisma.riderApplication.findFirst({
      where: { applicantId: req.user!.id, status: { in: [ApplicationStatus.PENDING, ApplicationStatus.APPROVED] } },
    });
    if (existing) return res.status(409).json({ success: false, message: existing.status === "APPROVED" ? "Your rider application is already approved." : "You already have an application under review.", code: "APPLICATION_EXISTS" });

    const application = await prisma.riderApplication.create({ data: { ...parsed.data, applicantId: req.user!.id } });
    await notifyAdmins("New Rider Application", `${parsed.data.fullName ?? "A user"} submitted a rider application.`);
    return res.status(201).json({ success: true, data: application });
  } catch (error) {
    return next(error);
  }
});

export default router;
