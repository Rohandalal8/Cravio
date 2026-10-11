import type { NextFunction, Request, Response } from "express";

import admin from "../config/firebase.js";
import prisma from "../config/prisma.js";
import { UserRole, type UserRole as UserRoleType } from "@prisma/client";

type AuthenticatedUser = {
  id: string;
  firebaseUid?: string;
  role: UserRoleType;
  status: "ACTIVE" | "SUSPENDED";
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required.",
      code: "UNAUTHORIZED",
    });
  }

  const idToken = authHeader.replace("Bearer ", "").trim();

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User is not synced to the platform.",
        code: "USER_NOT_FOUND",
      });
    }

    if (user.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        message: "This account is suspended.",
        code: "ACCOUNT_SUSPENDED",
      });
    }

    req.user = {
      id: user.id,
      firebaseUid: user.firebaseUid ?? decodedToken.uid,
      role: user.role,
      status: user.status,
    } satisfies AuthenticatedUser;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired Firebase token.",
      code: "INVALID_TOKEN",
      ...(process.env.NODE_ENV !== "production" ? { debug: (error as Error).message } : {}),
    });
  }
}

export function requireRole(...roles: UserRoleType[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
        code: "FORBIDDEN",
      });
    }

    try {
      // Rider and restaurant-owner access is mutually exclusive. Do not use
      // legacy role assignments to grant access to the other partner portal.
      const partnerRoles: UserRoleType[] = [UserRole.RIDER, UserRole.RESTAURANT_OWNER];
      if (roles.some((role) => partnerRoles.includes(role))) {
        if (roles.includes(req.user.role)) return next();
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
          code: "FORBIDDEN",
        });
      } else if (roles.includes(req.user.role)) {
        return next();
      }

      const assignments = await prisma.userRoleAssignment.findMany({
        where: { userId: req.user.id, role: { in: roles } },
        select: { role: true },
      });
      if (assignments.length > 0) return next();

      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
        code: "FORBIDDEN",
      });
    } catch (error) {
      return next(error);
    }
  };
}

export const requireCustomer = requireRole("CUSTOMER");
export const requireRestaurantOwner = requireRole("RESTAURANT_OWNER");
export const requireRider = requireRole("RIDER");
export const requireAdmin = requireRole("ADMIN");
